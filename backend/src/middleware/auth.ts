import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid token'));
    }
    next(error);
  }
}

// Middleware for extension API calls
export async function authenticateExtension(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-extension-key'];
    const authHeader = req.headers.authorization;

    // First verify extension API key
    if (apiKey !== config.extensionApiKey) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid extension key');
    }

    // Then verify user token
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'No user token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not found');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Invalid token'));
    }
    next(error);
  }
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

