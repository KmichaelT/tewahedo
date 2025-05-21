import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext, useEffect } from "react";
import { AuthContext } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Use this hook to access auth data directly from React Query
export function useAuthData() {
  const queryClient = useQueryClient();
  
  // Set up Firebase auth state listener to invalidate auth queries when auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener in useAuthData");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed in hook:", user ? "signed in" : "signed out");
      // Invalidate auth queries when auth state changes
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    });
    
    return () => unsubscribe();
  }, [queryClient]);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always refetch on mount
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

// Use this hook to access the complete Auth context including login/logout methods
export function useAuth() {
  const authContext = useContext(AuthContext);
  
  if (!authContext) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return authContext;
}