import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// Create a fresh instance of PrismaClient
const prisma = new PrismaClient();

export const getAllTrackings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - Prisma types issue with tracking model
    const trackings = await prisma.tracking.findMany({
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    // Transform the data to include clientName
    // @ts-ignore - Prisma types issue with tracking model
    const transformedTrackings = trackings.map((tracking) => ({
      ...tracking,
      clientName: tracking.client.name || 'No Client'
    }));

    res.json({ data: transformedTrackings });
  } catch (error: any) {
    console.error('Error fetching trackings:', error);
    res.status(500).json({ message: 'Error fetching trackings', error: error.message });
  }
};

export const getTrackingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore - Prisma types issue with tracking model
    const tracking = await prisma.tracking.findUnique({
      where: { id: parseInt(id) },
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    if (!tracking) {
      return res.status(404).json({ message: 'Tracking not found' });
    }

    // Transform the data to include clientName
    const transformedTracking = {
      ...tracking,
      clientName: tracking.client.name || 'No Client'
    };

    res.json({ data: transformedTracking });
  } catch (error: any) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({ message: 'Error fetching tracking', error: error.message });
  }
};

export const createTracking = async (req: Request, res: Response) => {
  try {
    const { trackingNumber, quoteIds, clientId, declaredValue, shippingCost, status } = req.body;

    // Validate required fields
    if (!trackingNumber || !quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0 || !clientId) {
      return res.status(400).json({ message: 'Tracking number, client, and at least one quote are required' });
    }

    // Check if tracking number already exists
    // @ts-ignore - Prisma types issue with tracking model
    const existingTracking = await prisma.tracking.findUnique({
      where: { trackingNumber }
    });

    if (existingTracking) {
      return res.status(400).json({ message: 'Tracking number already exists' });
    }

    // @ts-ignore - Prisma types issue with tracking model
    const tracking = await prisma.tracking.create({
      data: {
        trackingNumber,
        clientId: parseInt(clientId.toString()),
        status: status || 'pending',
        declaredValue: parseFloat(declaredValue.toString()),
        shippingCost: parseFloat(shippingCost.toString()),
        totalValue: parseFloat(declaredValue.toString()) + parseFloat(shippingCost.toString()),
        quotes: {
          connect: quoteIds.map(id => ({ id: typeof id === 'string' ? parseInt(id) : id }))
        }
      },
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    // Transform the data to include clientName
    const transformedTracking = {
      ...tracking,
      clientName: tracking.client.name || 'No Client'
    };

    res.status(201).json({ data: transformedTracking });
  } catch (error: any) {
    console.error('Error creating tracking:', error);
    res.status(500).json({ message: 'Error creating tracking', error: error.message });
  }
};

export const updateTracking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { trackingNumber, quoteIds, clientId, declaredValue, shippingCost, status } = req.body;

    // Validate required fields
    if (!trackingNumber || !quoteIds || !Array.isArray(quoteIds) || quoteIds.length === 0 || !clientId) {
      return res.status(400).json({ message: 'Tracking number, client, and at least one quote are required' });
    }

    // Check if tracking number already exists for a different tracking
    // @ts-ignore - Prisma types issue with tracking model
    const existingTracking = await prisma.tracking.findFirst({
      where: {
        trackingNumber,
        NOT: {
          id: parseInt(id)
        }
      }
    });

    if (existingTracking) {
      return res.status(400).json({ message: 'Tracking number already exists' });
    }

    // @ts-ignore - Prisma types issue with tracking model
    const tracking = await prisma.tracking.update({
      where: { id: parseInt(id) },
      data: {
        trackingNumber,
        clientId: parseInt(clientId.toString()),
        status: status || undefined,
        declaredValue: parseFloat(declaredValue.toString()),
        shippingCost: parseFloat(shippingCost.toString()),
        totalValue: parseFloat(declaredValue.toString()) + parseFloat(shippingCost.toString()),
        quotes: {
          set: quoteIds.map(id => ({ id: typeof id === 'string' ? parseInt(id) : id }))
        }
      },
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    // Transform the data to include clientName
    const transformedTracking = {
      ...tracking,
      clientName: tracking.client.name || 'No Client'
    };

    res.json({ data: transformedTracking });
  } catch (error: any) {
    console.error('Error updating tracking:', error);
    res.status(500).json({ message: 'Error updating tracking', error: error.message });
  }
};

export const updateTrackingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'in_transit', 'delivered', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required (pending, in_transit, delivered, or paid)' });
    }

    // Find the tracking to get its totalValue if we're marking it as paid
    // @ts-ignore - Prisma types issue with tracking model
    const existingTracking = status === 'paid' ? await prisma.tracking.findUnique({
      where: { id: parseInt(id) }
    }) : null;

    // Update the tracking, setting amountPaid to totalValue if status is 'paid'
    // @ts-ignore - Prisma types issue with tracking model
    const tracking = await prisma.tracking.update({
      where: { id: parseInt(id) },
      data: { 
        status,
        // If status is 'paid', set amountPaid to totalValue
        ...(status === 'paid' && existingTracking ? { amountPaid: existingTracking.totalValue } : {})
      },
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    // Transform the data to include clientName
    const transformedTracking = {
      ...tracking,
      clientName: tracking.client.name || 'No Client'
    };

    res.json({ data: transformedTracking });
  } catch (error: any) {
    console.error('Error updating tracking status:', error);
    res.status(500).json({ message: 'Error updating tracking status', error: error.message });
  }
};

export const updateTrackingPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amountPaid, status } = req.body;

    if (amountPaid === undefined) {
      return res.status(400).json({ message: 'Amount paid is required' });
    }

    // @ts-ignore - Prisma types issue with tracking model
    const tracking = await prisma.tracking.findUnique({
      where: { id: parseInt(id) }
    });

    if (!tracking) {
      return res.status(404).json({ message: 'Tracking not found' });
    }

    // Parse amount paid to ensure it's a number
    let parsedAmountPaid = parseFloat(amountPaid.toString());
    
    // Determine if the tracking should be marked as paid
    // If a specific status is provided, use that; otherwise calculate based on payment
    let updatedStatus = status;
    if (!updatedStatus) {
      // If the amount paid equals or exceeds the total value, mark as paid
      if (parsedAmountPaid >= tracking.totalValue) {
        updatedStatus = 'paid';
      }
    }
    
    // If status is explicitly set to 'paid', ensure amountPaid equals totalValue
    if (updatedStatus === 'paid') {
      parsedAmountPaid = tracking.totalValue;
    }

    // @ts-ignore - Prisma types issue with tracking model
    const updatedTracking = await prisma.tracking.update({
      where: { id: parseInt(id) },
      data: { 
        amountPaid: parsedAmountPaid,
        status: updatedStatus || tracking.status
      },
      include: {
        quotes: {
          include: {
            client: true
          }
        },
        client: true
      }
    });

    // Transform the data to include clientName
    const transformedTracking = {
      ...updatedTracking,
      clientName: updatedTracking.client.name || 'No Client'
    };

    res.json({ data: transformedTracking });
  } catch (error: any) {
    console.error('Error updating tracking payment:', error);
    res.status(500).json({ message: 'Error updating tracking payment', error: error.message });
  }
};

export const deleteTracking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // @ts-ignore - Prisma types issue with tracking model
    await prisma.tracking.delete({
      where: { id: parseInt(id) }
    });
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting tracking:', error);
    res.status(500).json({ message: 'Error deleting tracking', error: error.message });
  }
}; 