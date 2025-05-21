import { initializeApp, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDADhmC1c5cYF02EW-Ak2KJcRy53BgdPIU",
  authDomain: "tewahedoanswers-eac01.firebaseapp.com",
  projectId: "tewahedoanswers-eac01", 
  storageBucket: "tewahedoanswers-eac01.firebasestorage.app",
  messagingSenderId: "907543438242",
  appId: "1:907543438242:web:bc16b772e86fa2bc9108fb",
  measurementId: "G-SGMD0HBGSL"
};

// Initialize Firebase - check if already initialized
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  // Check if error is due to duplicate app
  if (error?.code === 'app/duplicate-app') {
    app = getApp(); // Use the existing app
  } else {
    console.error("Firebase initialization error:", error);
    throw error;
  }
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// This function is called when the user clicks the login button
export const signInWithGoogle = async () => {
  try {
    console.log("Signing in with Google...");
    
    // For Replit environments, use popup instead of redirect to avoid issues
    // with the authentication flow being interrupted
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    if (result) {
      // User was successfully signed in
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;

      console.log("User signed in with Google:", user.displayName);

      // Send token to server for verification
      if (user) {
        const idToken = await user.getIdToken();
        
        // Post the token to our backend to create a session
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
          credentials: 'include' // Important for cookies/session
        });
        
        if (!response.ok) {
          throw new Error(`Auth failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Server session created:", data);
      }
      
      return { user, token };
    }
    
    throw new Error("Google sign in failed - no result returned");
  } catch (error: any) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

// Handle the redirect result (if we switch back to redirect method)
export const handleRedirectResult = async () => {
  try {
    console.log("Checking for redirect result...");
    const result = await getRedirectResult(auth);
    
    if (result) {
      console.log("Got redirect result:", result);
      // User was successfully signed in
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const user = result.user;

      console.log("User signed in:", user.displayName, user.email);

      // Send token to server for verification
      if (user) {
        const idToken = await user.getIdToken();
        
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idToken }),
          credentials: 'include' // Important for cookies/session
        });
        
        const data = await response.json();
        console.log("Server response:", data);
      }
      
      return { user, token };
    }
    
    console.log("No redirect result found");
    return null;
  } catch (error: any) {
    console.error("Redirect result error:", error);
    return null;
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    console.log("Signing out...");
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    // Clear server-side session
    const response = await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed with status ${response.status}`);
    }
    
    console.log("Logout successful");
    return true;
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      reject
    );
  });
};

export { auth };