import { Request, Response } from 'express';
import prisma from '../services/db';

export const getQuotes = async (req: Request, res: Response) => {
  try {
    const quotes = await prisma.quote.findMany({
      include: {
        client: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({ message: 'Error fetching quotes' });
  }
};

export const getQuoteById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quote = await prisma.quote.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        activities: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Error fetching quote' });
  }
};

export const createQuote = async (req: Request, res: Response) => {
  try {
    const { clientId, product, platform, cost, chargedAmount, charged, amountPaid, notes, status, paymentMethod } = req.body;
    
    const quote = await prisma.quote.create({
      data: {
        clientId: parseInt(clientId),
        product,
        platform,
        status: status || 'purchased',
        cost: parseFloat(cost),
        chargedAmount: parseFloat(chargedAmount || charged || 0),
        amountPaid: amountPaid ? parseFloat(amountPaid) : 0,
        notes,
        paymentMethod
      }
    });

    // Create activity for new quote
    await prisma.activity.create({
      data: {
        quoteId: quote.id,
        type: status === 'purchased' ? 'New Order' : 'New Quote',
        amount: parseFloat(chargedAmount || charged || 0),
        status: status === 'paid' ? 'completed' : 'pending'
      }
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ message: 'Error creating quote' });
  }
};

export const updateQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { product, platform, status, cost, chargedAmount, amountPaid, notes, paymentMethod } = req.body;
    
    // Validate status
    const validStatuses = ['quote', 'quoted', 'purchase', 'purchased', 'received', 'ready_to_ship', 'held', 'shipped', 'paid'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    
    // Build update data object with only the fields that are provided
    const updateData: any = {};
    
    if (product !== undefined) updateData.product = product;
    if (platform !== undefined) updateData.platform = platform;
    if (status !== undefined) updateData.status = status;
    if (cost !== undefined) updateData.cost = parseFloat(cost);
    if (chargedAmount !== undefined) updateData.chargedAmount = parseFloat(chargedAmount);
    if (amountPaid !== undefined) updateData.amountPaid = parseFloat(amountPaid);
    if (notes !== undefined) updateData.notes = notes;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    
    // Check if we have any data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided for update' });
    }
    
    const quote = await prisma.quote.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Create activity for status change
    if (status) {
      await prisma.activity.create({
        data: {
          quoteId: quote.id,
          type: status === 'paid' ? 'Payment Received' : `Status changed to ${status}`,
          amount: amountPaid ? parseFloat(amountPaid) : quote.chargedAmount,
          status: status === 'paid' ? 'completed' : 'pending'
        }
      });
    }

    res.json(quote);
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ message: 'Error updating quote', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const deleteQuote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete related activities first
    await prisma.activity.deleteMany({
      where: { quoteId: parseInt(id) }
    });
    
    // Then delete the quote
    await prisma.quote.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ message: 'Error deleting quote' });
  }
};

export const getMissingQuotes = async (req: Request, res: Response) => {
  try {
    const quotes = await prisma.quote.findMany({
      where: {
        status: {
          in: ['quote', 'quoted']
        }
      },
      include: {
        client: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(quotes);
  } catch (error) {
    console.error('Error fetching missing quotes:', error);
    res.status(500).json({ message: 'Error fetching missing quotes' });
  }
}; 