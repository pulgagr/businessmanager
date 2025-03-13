import { Request, Response } from 'express';
import prisma from '../services/db';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await prisma.settings.create({
        data: {
          companyName: '',
          email: '',
          phone: '',
          address: '',
          taxRate: 0,
          currency: 'USD',
          defaultPlatformFee: 0,
          notificationEmail: '',
          autoGenerateInvoices: false,
          platformOptions: [],
          paymentOptions: [],
          logoUrl: null
        }
      });
      res.json(defaultSettings);
    } else {
      res.json(settings);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      email,
      phone,
      address,
      taxRate,
      currency,
      defaultPlatformFee,
      notificationEmail,
      autoGenerateInvoices,
      platformOptions,
      paymentOptions,
      logoUrl
    } = req.body;

    // Validate required fields
    if (!companyName || !email) {
      return res.status(400).json({ message: 'Company name and email are required' });
    }

    const settings = await prisma.settings.findFirst();
    
    if (!settings) {
      const newSettings = await prisma.settings.create({
        data: {
          companyName,
          email,
          phone,
          address,
          taxRate,
          currency,
          defaultPlatformFee,
          notificationEmail,
          autoGenerateInvoices,
          platformOptions,
          paymentOptions,
          logoUrl
        }
      });
      res.json(newSettings);
    } else {
      const updatedSettings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          companyName,
          email,
          phone,
          address,
          taxRate,
          currency,
          defaultPlatformFee,
          notificationEmail,
          autoGenerateInvoices,
          platformOptions,
          paymentOptions,
          logoUrl
        }
      });
      res.json(updatedSettings);
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Error updating settings' });
  }
}; 