import { Request, Response } from 'express';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import prisma from '../services/db';
import { Quote, Tracking } from '@prisma/client';

interface TrackingWithRelations extends Tracking {
  client: {
    id: number;
    name: string;
    company: string | null;
  };
  quotes: Quote[];
}

export const getMonthlySales = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    let startDate, endDate;

    if (month) {
      const date = parseISO(month as string);
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    } else {
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    // Get quotes
    const quotes = await prisma.quote.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['purchase', 'purchased', 'received', 'paid']
        }
      },
      include: {
        client: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get trackings
    const trackings = await prisma.tracking.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        client: true,
        quotes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }) as TrackingWithRelations[];

    // Convert trackings to the same format as quotes
    const trackingOrders = trackings.map((tracking: TrackingWithRelations) => ({
      id: tracking.id,
      createdAt: tracking.createdAt,
      product: tracking.quotes.map((q: Quote) => q.product).join(', '),
      platform: 'Other',
      client: tracking.client,
      orderNumber: tracking.trackingNumber,
      paymentMethod: 'Bank Transfer',
      status: 'shipment',
      cost: tracking.shippingCost,
      chargedAmount: tracking.totalValue,
      notes: null
    }));

    // Combine and sort by date
    const allOrders = [...quotes, ...trackingOrders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(allOrders);
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    res.status(500).json({ message: 'Error fetching monthly sales' });
  }
};

export const updateOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { product, platform, status, cost, chargedAmount, notes, amountPaid, paymentMethod } = req.body;
    
    // Check if we need to get the current order details
    let existingOrder;
    if (status === 'paid') {
      existingOrder = await prisma.quote.findUnique({
        where: { id: parseInt(id) }
      });
    }
    
    // Determine amount paid based on status
    let updatedAmountPaid = amountPaid ? parseFloat(amountPaid) : undefined;
    if (status === 'paid') {
      // If status is paid, set amountPaid to chargedAmount
      const amount = chargedAmount 
        ? parseFloat(chargedAmount) 
        : existingOrder ? existingOrder.chargedAmount : 0;
      updatedAmountPaid = amount;
    }
    
    const order = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: {
        product,
        platform,
        status,
        cost: cost ? parseFloat(cost) : undefined,
        chargedAmount: chargedAmount ? parseFloat(chargedAmount) : undefined,
        amountPaid: updatedAmountPaid,
        notes,
        paymentMethod
      },
      include: {
        client: true
      }
    });

    // Create activity for status change
    await prisma.activity.create({
      data: {
        quoteId: order.id,
        type: amountPaid ? 'Partial Payment' : `Order ${status}`,
        amount: updatedAmountPaid ? updatedAmountPaid : (chargedAmount ? parseFloat(chargedAmount) : 0),
        status: status === 'paid' ? 'completed' : 'pending'
      }
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order' });
  }
};

export const getMonthlySummary = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    let startDate, endDate;

    if (month) {
      const date = parseISO(month as string);
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    } else {
      const now = new Date();
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    }

    const summary = await prisma.quote.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['purchase', 'purchased', 'received', 'paid']
        }
      },
      _count: {
        id: true
      },
      _sum: {
        cost: true,
        chargedAmount: true
      }
    });

    const statusCounts = await prisma.quote.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['purchase', 'purchased', 'received', 'paid']
        }
      },
      _count: {
        id: true
      }
    });

    res.json({
      totalOrders: summary._count.id,
      totalCost: summary._sum.cost || 0,
      totalRevenue: summary._sum.chargedAmount || 0,
      profit: (summary._sum.chargedAmount || 0) - (summary._sum.cost || 0),
      statusBreakdown: statusCounts
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ message: 'Error fetching monthly summary' });
  }
}; 