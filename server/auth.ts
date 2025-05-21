import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { storage } from './storage';

// Initialize Firebase Admin with the service account credentials
if (!admin.apps.length) {
  try {
    // Load service account from file path
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './attached_assets/tewahedoanswers-eac01-firebase-adminsdk-fbsvc-effcf15a33.json';
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      projectId: "tewahedoanswers-eac01",
      storageBucket: "tewahedoanswers-eac01.firebasestorage.app",
    });
    console.log("Firebase Admin SDK initialized successfully with service account from file");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    console.error("Attempting to initialize without service account...");
    
    // Fallback initialization without service account
    try {
      admin.initializeApp({
        projectId: "tewahedoanswers-eac01",
        storageBucket: "tewahedoanswers-eac01.firebasestorage.app",
      });
      console.log("Firebase Admin SDK initialized without service account");
    } catch (fallbackError) {
      console.error("Failed to initialize Firebase Admin SDK:", fallbackError);
      throw fallbackError;
    }
  }
}

interface DecodedIdToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

// This middleware will verify Firebase auth token
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;
    
    // For development and API endpoints that don't require auth
    // we'll allow requests without tokens to pass through
    // The requireAuth middleware will block unauthorized requests for protected routes
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Check for session-based auth as fallback
      console.log("Auth check - Session:", req.session);
      console.log("Auth check - User:", req.user);
      
      if (req.session && req.session.userId) {
        // We have a session, but need to make sure the user and admin status is set
        try {
          // If we have a session user ID but no req.user, try to load from DB
          const user = await storage.getUser(req.session.userId);
          if (user) {
            // Check for default admin
            const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
            
            const isDefaultAdmin = user.email === DEFAULT_ADMIN_EMAIL;
            const isAdmin = isDefaultAdmin || user.isAdmin;
            
            // Ensure admin status is properly set in the session
            req.session.isAdmin = isAdmin;
            req.session.userEmail = user.email;
            
            // Set user object
            req.user = {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              isAdmin: isAdmin
            };
            
            console.log(`Session user loaded: ${user.email}, isAdmin: ${isAdmin}`);
          } else {
            console.log("No authenticated user found");
          }
        } catch (dbError) {
          console.error("Error loading user from session:", dbError);
        }
        return next();
      }
      
      // Continue without authentication for now
      console.log("No authenticated user found");
      return next();
    }
    
    // Get the token from header
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Get the user's email and process admin status
      try {
        const email = decodedToken.email;
        
        if (email) {
          // Check if this is our default admin
          const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com";
          
          // Default admin status - only kmichaeltb@gmail.com is default admin
          let isAdmin = email === DEFAULT_ADMIN_EMAIL;
          
          // Look up user in database
          const dbUser = await storage.getUserByEmail(email);
          if (dbUser) {
            isAdmin = isAdmin || dbUser.isAdmin;
          }
          
          // Add the user to the request
          req.user = {
            id: decodedToken.uid,
            email: email,
            displayName: decodedToken.name || null,
            photoURL: decodedToken.picture || null,
            isAdmin: isAdmin
          };
          
          // Also set session for compatibility with existing code
          if (req.session) {
            req.session.userId = decodedToken.uid;
            req.session.userEmail = email;
            req.session.isAdmin = isAdmin;
          }
          
          console.log(`Auth middleware - user: ${email}, isAdmin: ${isAdmin}`);
        } else {
          // No email found in token, just add basic info
          req.user = {
            id: decodedToken.uid,
            email: null,
            displayName: decodedToken.name || null,
            photoURL: decodedToken.picture || null,
            isAdmin: false
          };
          
          if (req.session) {
            req.session.userId = decodedToken.uid;
          }
        }
      } catch (dbError) {
        console.error('Error checking admin status:', dbError);
        
        // Fallback to basic user info
        req.user = {
          id: decodedToken.uid,
          email: decodedToken.email || null,
          displayName: decodedToken.name || null,
          photoURL: decodedToken.picture || null
        };
        
        if (req.session) {
          req.session.userId = decodedToken.uid;
        }
      }
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      // Continue without setting user info
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Continue anyway - requireAuth will block protected routes
    next();
  }
};

// Middleware to protect routes that require authentication
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user exists through Firebase auth
  if (req.user) {
    return next();
  }
  
  // Check if session-based auth exists as fallback
  if (req.session && req.session.userId) {
    return next();
  }
  
  return res.status(401).json({ message: 'Authentication required' });
};

// Middleware to check if user is an admin
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Checking admin access for session:", req.session);
    
    // First check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get user email from session or user object
    const userEmail = req.session.userEmail || req.user?.email;
    const userId = req.session.userId;
    
    if (!userEmail) {
      return res.status(401).json({ message: 'User email not found' });
    }
    
    // CRITICAL: Check if this is the ONE default admin user
    // "kmichaeltbekele@gmail.com" is NOT the default admin and should NOT be protected
    const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com"; // Only ONE default admin!
    
    // If it's the default admin, ensure they have admin privileges
    // STRICT EQUALITY CHECK to prevent "kmichaeltbekele@gmail.com" from being treated as default admin
    if (userEmail === DEFAULT_ADMIN_EMAIL) {
      console.log(`Default admin detected: ${userEmail}`);
      
      // Mark as admin in session and user object
      if (req.session) {
        req.session.isAdmin = true;
      }
      
      if (req.user) {
        req.user.isAdmin = true;
      }
      
      // Also ensure database reflects this (critical!)
      try {
        const user = await storage.getUserByEmail(userEmail);
        if (user) {
          // If user exists but isn't admin, update their status
          if (!user.isAdmin) {
            await storage.setUserAdmin(user.id, true);
            console.log(`Updated ${userEmail} to admin in database`);
          }
        } else if (userId) {
          // User doesn't exist by email but we have a user ID
          const userById = await storage.getUser(userId);
          if (userById && !userById.isAdmin) {
            await storage.setUserAdmin(userById.id, true);
            console.log(`Updated user by ID ${userId} to admin in database`);
          }
        }
      } catch (dbError) {
        console.error("Error updating admin status in database:", dbError);
      }
      
      console.log(`Admin access granted to default admin: ${userEmail}`);
      return next();
    }
    
    // We've removed the whitelist functionality
    // Now only the default admin (kmichaeltb@gmail.com) and users explicitly
    // set as admin in the database can have admin access
    // CRITICAL: "kmichaeltbekele@gmail.com" is NOT a default admin and should NOT have special protection
    
    // Check directly for admin flag in session
    if (req.session.isAdmin === true) {
      console.log("Admin access granted via session to:", req.session.userEmail);
      return next();
    }
    
    // Alternative check using user object if available
    if (req.user && req.user.isAdmin === true) {
      console.log("Admin access granted via user object to:", req.user.email);
      return next();
    }
    
    // Final check - look up the user in the database
    try {
      const user = await storage.getUserByEmail(userEmail);
      if (user && user.isAdmin) {
        console.log(`Admin access granted after database check: ${userEmail}`);
        
        // Update session and user object to avoid future lookups
        if (req.session) {
          req.session.isAdmin = true;
        }
        
        if (req.user) {
          req.user.isAdmin = true;
        }
        
        return next();
      }
    } catch (dbError) {
      console.error("Error looking up admin status in database:", dbError);
    }
    
    console.log("Admin access denied for:", userEmail);
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ message: 'Server error checking admin status' });
  }
};

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        isAdmin?: boolean;
      };
      session: {
        userId?: string | number;
        userEmail?: string;
        isAdmin?: boolean;
      } & any;
    }
  }
}