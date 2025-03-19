import { Request, Response, NextFunction } from 'express';
import asyncHandler from 'express-async-handler';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../services/db';

interface CustomRequest extends Request {
  user?: {
    userId: number;
    email: string;
    role: string;
  };
}

// Interface for decoded JWT token
interface DecodedToken {
  userId: number;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// Type for the async handler return type - void is acceptable as express-async-handler handles the response
type AsyncHandlerReturn = Promise<any>;

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

// Generate tokens
const generateTokens = (userId: number, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_EXPIRES_IN } as SignOptions
  );
  
  const refreshToken = jwt.sign(
    { userId, email },
    JWT_REFRESH_SECRET as jwt.Secret,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
  
  return { accessToken, refreshToken };
};

// Register a new user
export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction): AsyncHandlerReturn => {
  try {
    // Validate input
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validatedData.password, salt);
    
    // Create user
    const newUser = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        passwordHash,
        role: 'user' // Default role
      }
    });
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      newUser.id,
      newUser.email,
      newUser.role
    );
    
    // Update user with refresh token
    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken }
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Return user info and access token
    res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      accessToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    throw error;
  }
});

// Login user
export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction): AsyncHandlerReturn => {
  try {
    // Validate input
    const validatedData = loginSchema.parse(req.body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }
    
    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      user.role
    );
    
    // Update user with refresh token and last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        refreshToken,
        lastLogin: new Date()
      }
    });
    
    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Return user info and access token
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    throw error;
  }
});

// Refresh token
export const refreshToken = asyncHandler(async (req: Request, res: Response, next: NextFunction): AsyncHandlerReturn => {
  // Get refresh token from cookie
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    res.status(401).json({ message: 'Refresh token not found' });
    return;
  }
  
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      userId: number;
      email: string;
    };
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user || user.refreshToken !== refreshToken) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }
    
    // Generate new tokens
    const newTokens = generateTokens(user.id, user.email, user.role);
    
    // Update user with new refresh token
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: newTokens.refreshToken }
    });
    
    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    // Return new access token
    res.status(200).json({ accessToken: newTokens.accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
});

// Logout user
export const logout = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction): AsyncHandlerReturn => {
  // Clear refresh token cookie
  res.clearCookie('refreshToken');
  
  // Get user ID from request (set by auth middleware)
  const userId = req.user?.userId;
  
  if (userId) {
    // Clear refresh token in database
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }
  
  res.status(200).json({ message: 'Logged out successfully' });
});

// Get current user
export const getCurrentUser = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction): AsyncHandlerReturn => {
  // Get user ID from request (set by auth middleware)
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastLogin: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  res.status(200).json(user);
});

// Change password
export const changePassword = asyncHandler(async (req: CustomRequest, res: Response, next: NextFunction): AsyncHandlerReturn => {
  // Get user ID from request (set by auth middleware)
  const userId = req.user?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: 'Current password and new password are required' });
    return;
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Check current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  
  if (!isPasswordValid) {
    res.status(401).json({ message: 'Current password is incorrect' });
    return;
  }
  
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);
  
  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
  
  res.status(200).json({ message: 'Password changed successfully' });
});

// Request password reset
export const requestPasswordReset = asyncHandler(async (req: Request, res: Response, next: NextFunction): AsyncHandlerReturn => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({ message: 'Email is required' });
    return;
  }
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    // Don't reveal that the user doesn't exist
    res.status(200).json({ message: 'If your email is registered, you will receive a password reset link' });
    return;
  }
  
  // Generate reset token
  const resetToken = jwt.sign(
    { userId: user.id },
    JWT_SECRET as jwt.Secret,
    { expiresIn: '1h' } as SignOptions
  );
  
  // Store token and expiry
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    }
  });
  
  // In a real application, send an email with the reset link
  // For now, just return the token for testing
  res.status(200).json({
    message: 'If your email is registered, you will receive a password reset link',
    resetToken // Remove this in production
  });
});

// Reset password
export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction): AsyncHandlerReturn => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    res.status(400).json({ message: 'Token and new password are required' });
    return;
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user || user.resetToken !== token || !user.resetTokenExpiry) {
      res.status(400).json({ message: 'Invalid or expired token' });
      return;
    }
    
    // Check if token is expired
    if (new Date() > user.resetTokenExpiry) {
      res.status(400).json({ message: 'Token has expired' });
      return;
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Invalid token' });
    return;
  }
});
