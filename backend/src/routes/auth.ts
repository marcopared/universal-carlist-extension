import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';

export const authRouter = Router();

const googleClient = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register with email/password
authRouter.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(400, 'USER_EXISTS', 'An account with this email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    
    // Send welcome email
    emailService.sendWelcomeEmail(email, name || '').catch(() => {});
    
    // Generate token
    const token = generateToken(user.id, user.email);
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login with email/password
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    const token = generateToken(user.id, user.email);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          gmailConnected: user.gmailConnected,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get Google OAuth URL
authRouter.get('/google/url', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  
  // Add Gmail scope if user wants email integration
  if (req.query.gmail === 'true') {
    scopes.push('https://www.googleapis.com/auth/gmail.readonly');
  }
  
  const url = googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state: req.query.gmail === 'true' ? 'gmail' : 'auth',
  });
  
  res.json({ success: true, data: { url } });
});

// Google OAuth callback
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const { code, state } = req.query as { code: string; state: string };
    
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);
    
    // Get user info
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: config.google.clientId,
    });
    
    const payload = ticket.getPayload()!;
    const { email, name, picture, sub: googleId } = payload;
    
    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId },
          { email: email! },
        ],
      },
    });
    
    const isGmailConnection = state === 'gmail';
    
    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || user.googleRefreshToken,
          gmailConnected: isGmailConnection || user.gmailConnected,
          name: user.name || name,
          avatarUrl: user.avatarUrl || picture,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: email!,
          googleId,
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          gmailConnected: isGmailConnection,
          name,
          avatarUrl: picture,
        },
      });
      
      emailService.sendWelcomeEmail(email!, name || '').catch(() => {});
    }
    
    const token = generateToken(user.id, user.email);
    
    // Redirect to frontend with token
    res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    next(error);
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        gmailConnected: true,
        emailNotifications: true,
        pushNotifications: true,
        createdAt: true,
      },
    });
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Update user settings
authRouter.patch('/me', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updateSchema = z.object({
      name: z.string().optional(),
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
    });
    
    const data = updateSchema.parse(req.body);
    
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        emailNotifications: true,
        pushNotifications: true,
      },
    });
    
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// Disconnect Gmail
authRouter.post('/gmail/disconnect', authenticate, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        gmailConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
      },
    });
    
    res.json({ success: true, message: 'Gmail disconnected' });
  } catch (error) {
    next(error);
  }
});

