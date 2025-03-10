import { Request, Response } from 'express';
import prisma from '../services/db';

export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ message: 'Error fetching clients' });
  }
};

export const getClientById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        quotes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ message: 'Error fetching client' });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      idNumber,
      address,
      city,
      state,
      zipCode,
      country,
      taxId
    } = req.body;
    
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        company,
        status: 'active',
        idNumber,
        address,
        city,
        state,
        zipCode,
        country,
        taxId
      }
    });
    res.status(201).json(client);
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ message: 'Error creating client' });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phone,
      company,
      status,
      idNumber,
      address,
      city,
      state,
      zipCode,
      country,
      taxId
    } = req.body;
    
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phone,
        company,
        status,
        idNumber,
        address,
        city,
        state,
        zipCode,
        country,
        taxId
      }
    });
    res.json(client);
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ message: 'Error updating client' });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({
      where: { id: parseInt(id) }
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ message: 'Error deleting client' });
  }
}; 