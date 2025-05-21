import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, handleRedirectResult } from '@/lib/firebase';

interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    // First check for any redirect results
    const checkRedirect = async () => {
      console.log("Checking for redirect result...");
      const redirectResult = await handleRedirectResult();
      
      if (redirectResult?.user) {
        console.log("User authenticated via redirect:", redirectResult.user.displayName);
        const authUser: AuthUser = {
          id: redirectResult.user.uid,
          email: redirectResult.user.email,
          displayName: redirectResult.user.displayName,
          photoURL: redirectResult.user.photoURL,
          isAdmin: false // We'll check on the server side if this user is admin
        };
        setUser(authUser);
      }
    };
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      console.log("Firebase auth state changed:", firebaseUser ? "signed in" : "signed out");
      
      if (firebaseUser) {
        const authUser: AuthUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isAdmin: false // Default to false, we'll check on the server
        };
        setUser(authUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      
      setIsLoading(false);
    });
    
    // Check for redirect results
    checkRedirect();
    
    return () => unsubscribe();
  }, []);
  
  // Check if the user is an admin when they authenticate
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.email) {
        // CRITICAL FIX: There should only be ONE default admin
        // This ensures the admin UI shows even if the server request fails  
        // IMPORTANT: "kmichaeltbekele@gmail.com" is NOT a default admin and must NOT have special privileges
        const DEFAULT_ADMIN_EMAIL = "kmichaeltb@gmail.com"; // Only ONE default admin!
        
        // If this is the default admin email, automatically set admin status
        // Use strict equality check to ensure only the exact default admin email gets special treatment
        const isDefaultAdmin = user.email === DEFAULT_ADMIN_EMAIL;
        if (isDefaultAdmin) {
          console.log(`CRITICAL: Default admin detected: ${user.email}`);
          setIsAdmin(true);
          
          // Update user object to reflect admin status
          setUser({
            ...user,
            isAdmin: true
          });
          
          // No need to check with server, we know this is an admin
          return;
        }
        
        try {
          // Make a server request to check if the user is an admin
          // The server is the source of truth for non-default admin status
          const response = await fetch('/api/auth/user');
          
          if (response.ok) {
            const userData = await response.json();
            
            // Set the admin status based on the server response
            const isAdminUser = userData.isAdmin === true;
            setIsAdmin(isAdminUser);
            
            // Update the user object with the admin status and any server-side data
            setUser({
              id: userData.id || user.id,
              email: userData.email || user.email,
              displayName: userData.displayName || user.displayName,
              photoURL: userData.photoURL || user.photoURL,
              isAdmin: isAdminUser
            });
            
            console.log(`User ${user.email} is${userData.isAdmin ? '' : ' not'} an admin`);
          } else {
            // If server check fails but this is a hardcoded admin, set admin status
            if (user.email === "kmichaeltb@gmail.com") {
              console.log("CRITICAL OVERRIDE: Forcing admin status for kmichaeltb@gmail.com");
              setIsAdmin(true);
              setUser({
                ...user,
                isAdmin: true
              });
            } else {
              console.log("Failed to verify admin status from server");
              setIsAdmin(false);
            }
          }
        } catch (error) {
          // If server check fails but this is a hardcoded admin, set admin status
          if (user.email === "kmichaeltb@gmail.com") {
            console.log("CRITICAL OVERRIDE: Forcing admin status for kmichaeltb@gmail.com");
            setIsAdmin(true);
            setUser({
              ...user,
              isAdmin: true
            });
          } else {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          }
        }
      }
    };
    
    checkAdminStatus();
  }, [user?.email]);

  const login = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return authContext;
}