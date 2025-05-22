import type { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { storage } from './storage';
import admin from 'firebase-admin';

// Set up session storage
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use memory storage for sessions during development
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    name: 'tewahedo.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: sessionTtl,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax'
    }
  });
}

// Setup authentication middleware
export async function setupAuth(app: Express): Promise<void> {
  // Add session middleware
  app.use(getSession());
  
  // Add authentication middleware
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if authorization header exists
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        
        try {
          // Verify the Firebase token
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          
          // Get or create user in our database
          const user = await storage.getUserByEmail(decodedToken.email || '');
          
          if (user) {
            // Attach user to request
            (req as any).user = user;
          } else if (decodedToken.email) {
            // Create new user if they don't exist
            const newUser = await storage.createUser({
              id: decodedToken.uid,
              email: decodedToken.email,
              displayName: decodedToken.name || decodedToken.email.split('@')[0],
              photoURL: decodedToken.picture || '',
              isAdmin: false
            });
            
            // Attach new user to request
            (req as any).user = newUser;
          }
        } catch (error) {
          console.error('Error verifying Firebase token:', error);
          // Don't throw error, just continue without authenticated user
        }
      }
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      next(error);
    }
  });
}