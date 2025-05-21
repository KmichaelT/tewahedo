import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/context/AuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  
  // Check if user is authenticated and is an admin
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return <Redirect to="/" />;
  }
  
  // If admin, render the children components
  return <>{children}</>;
}