import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  
  // Check if user is already logged in
  const { data, isLoading } = useQuery<User | null>({
    queryKey: ['/api/admin/user'],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 1000, // 1 second
    retry: false,
    enabled: true,
    // Custom queryFn to handle 401 errors
    queryFn: async () => {
      try {
        const res = await fetch('/api/admin/user', {
          credentials: "include"
        });
        
        if (res.status === 401) {
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`Failed to fetch user: ${res.status}`);
        }
        
        return res.json();
      } catch (error) {
        console.error("Auth check error:", error);
        return null;
      }
    }
  });
  
  // Set user when data changes
  useEffect(() => {
    setUser(data || null);
  }, [data]);
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await apiRequest('POST', '/api/login', credentials);
      return res.json();
    },
    onSuccess: (userData) => {
      setUser(userData);
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/questions'] });
      toast({
        title: "Login successful",
        description: "You are now logged in",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    }
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/logout', {});
      return res.json();
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Failed to log out",
      });
    }
  });
  
  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      await loginMutation.mutateAsync({ username, password });
      return true;
    } catch (error) {
      return false;
    }
  };
  
  // Logout function
  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync();
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
        isAuthenticated: !!user,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook for using the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
