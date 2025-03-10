import { Request, Response } from 'express';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import prisma from '../services/db';

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    const previousMonth = subMonths(currentDate, 1);

    const [
      totalQuotes,
      previousTotalQuotes,
      pendingQuotes,
      previousPendingQuotes,
      revenue,
      previousRevenue
    ] = await Promise.all([
      // Current month quotes
      prisma.quote.count({
        where: {
          createdAt: {
            gte: startOfMonth(currentDate),
            lte: endOfMonth(currentDate)
          }
        }
      }),
      // Previous month quotes
      prisma.quote.count({
        where: {
          createdAt: {
            gte: startOfMonth(previousMonth),
            lte: endOfMonth(previousMonth)
          }
        }
      }),
      // Current month pending quotes
      prisma.quote.count({
        where: {
          status: { in: ['quote', 'quoted'] },
          createdAt: {
            gte: startOfMonth(currentDate),
            lte: endOfMonth(currentDate)
          }
        }
      }),
      // Previous month pending quotes
      prisma.quote.count({
        where: {
          status: { in: ['quote', 'quoted'] },
          createdAt: {
            gte: startOfMonth(previousMonth),
            lte: endOfMonth(previousMonth)
          }
        }
      }),
      // Current month revenue
      prisma.quote.aggregate({
        where: {
          status: { in: ['purchase', 'purchased', 'received', 'paid'] },
          createdAt: {
            gte: startOfMonth(currentDate),
            lte: endOfMonth(currentDate)
          }
        },
        _sum: {
          chargedAmount: true
        }
      }),
      // Previous month revenue
      prisma.quote.aggregate({
        where: {
          status: { in: ['purchase', 'purchased', 'received', 'paid'] },
          createdAt: {
            gte: startOfMonth(previousMonth),
            lte: endOfMonth(previousMonth)
          }
        },
        _sum: {
          chargedAmount: true
        }
      })
    ]);

    const currentRevenue = revenue._sum.chargedAmount || 0;
    const prevRevenue = previousRevenue._sum.chargedAmount || 0;
    const currentConversionRate = totalQuotes > 0 ? ((totalQuotes - pendingQuotes) / totalQuotes) * 100 : 0;
    const previousConversionRate = previousTotalQuotes > 0 ? 
      ((previousTotalQuotes - previousPendingQuotes) / previousTotalQuotes) * 100 : 0;

    res.json({
      totalQuotes,
      revenue: currentRevenue,
      pendingQuotes,
      conversionRate: currentConversionRate,
      previousTotalQuotes,
      previousRevenue: prevRevenue,
      previousPendingQuotes,
      previousConversionRate
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ message: 'Error fetching metrics' });
  }
};

export const getRevenueData = async (req: Request, res: Response) => {
  try {
    const months = Array.from({ length: 12 }, (_, i) => subMonths(new Date(), 11 - i));
    
    const revenueData = await Promise.all(
      months.map(async (month) => {
        const result = await prisma.quote.aggregate({
          where: {
            status: { in: ['purchase', 'purchased', 'received', 'paid'] },
            createdAt: {
              gte: startOfMonth(month),
              lte: endOfMonth(month)
            }
          },
          _sum: {
            chargedAmount: true
          }
        });
        return result._sum.chargedAmount || 0;
      })
    );

    res.json({
      labels: months.map(month => format(month, 'MMM yyyy')),
      data: revenueData
    });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ message: 'Error fetching revenue data' });
  }
};

export const getQuoteStatusDistribution = async (req: Request, res: Response) => {
  try {
    const statuses = ['quote', 'quoted', 'purchase', 'purchased', 'received', 'paid'];
    const counts = await Promise.all(
      statuses.map(status =>
        prisma.quote.count({
          where: { status }
        })
      )
    );

    res.json({
      labels: ['Quote Needed', 'Quoted', 'Purchase Needed', 'Purchased', 'Received', 'Paid'],
      data: counts
    });
  } catch (error) {
    console.error('Error fetching quote status distribution:', error);
    res.status(500).json({ message: 'Error fetching quote status distribution' });
  }
};

export const getQuotesComparison = async (req: Request, res: Response) => {
  try {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    
    const comparison = await Promise.all(
      months.map(async (month) => {
        const [newQuotes, completedQuotes] = await Promise.all([
          prisma.quote.count({
            where: {
              createdAt: {
                gte: startOfMonth(month),
                lte: endOfMonth(month)
              }
            }
          }),
          prisma.quote.count({
            where: {
              status: 'paid',
              createdAt: {
                gte: startOfMonth(month),
                lte: endOfMonth(month)
              }
            }
          })
        ]);
        return { newQuotes, completedQuotes };
      })
    );

    res.json({
      labels: months.map(month => format(month, 'MMM yyyy')),
      newQuotes: comparison.map(c => c.newQuotes),
      completedQuotes: comparison.map(c => c.completedQuotes)
    });
  } catch (error) {
    console.error('Error fetching quotes comparison:', error);
    res.status(500).json({ message: 'Error fetching quotes comparison' });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const activities = await prisma.activity.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        quote: {
          include: {
            client: true
          }
        }
      }
    });

    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      client: activity.quote.client.name,
      type: activity.type,
      amount: activity.amount,
      date: format(activity.createdAt, 'yyyy-MM-dd'),
      status: activity.status
    }));

    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
}; 