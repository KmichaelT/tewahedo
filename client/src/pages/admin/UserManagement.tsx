import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ShieldAlert, User2 } from 'lucide-react';
import { auth, getCurrentUser } from '@/lib/firebase';

interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// CRITICAL: Only one default admin email - Keep this in sync with the backend
// IMPORTANT: "kmichaeltbekele@gmail.com" is NOT a default admin and must NOT be in this list!
const DEFAULT_ADMIN_EMAILS = [
  'kmichaeltb@gmail.com' // Only ONE default admin
];

export default function UserManagement() {
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, userId: string, email: string, makeAdmin: boolean}>({
    open: false,
    userId: '',
    email: '',
    makeAdmin: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser, isAdmin } = useAuth();

  // Use state to track currently logged in user
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Helper function to check if an email is a default admin
  // CRITICAL: Use strict equality check to ensure only "kmichaeltb@gmail.com" is recognized
  const isDefaultAdmin = (email: string | null): boolean => {
    if (!email) return false;
    // Use strictly equal to the single default admin email - never use includes() for safety
    return email.toLowerCase() === 'kmichaeltb@gmail.com';
  };
  
  // Helper function to safely check admin emails
  // CRITICAL: "kmichaeltbekele@gmail.com" must NOT be treated as a default admin
  const isEmailDefaultAdmin = (email: string | null): boolean => {
    if (!email) return false;
    // Use strict equality to prevent partial matches
    return email.toLowerCase() === 'kmichaeltb@gmail.com';
  };
  
  // Helper function to check if a user can have their admin status modified
  const canModifyUserStatus = (user: User): boolean => {
    // Can't modify default admins
    if (isEmailDefaultAdmin(user.email)) {
      return false;
    }
    
    // Can't modify your own status
    if (currentUser && user.id === currentUser.id) {
      return false;
    }
    
    return true;
  };

  // Mutation to update user admin status
  const updateUserAdminStatus = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string, isAdmin: boolean }) => {
      console.log(`Setting admin status for user ${userId} to ${isAdmin}`);
      return await apiRequest('PUT', `/api/admin/users/${userId}`, {
        isAdmin
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: 'Success',
        description: 'User admin status updated successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error updating user admin status:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update user admin status',
        variant: 'destructive'
      });
    }
  });

  const handleAdminToggle = (userId: string, email: string | null, currentStatus: boolean) => {
    const makeAdmin = !currentStatus;
    const safeEmail = email || "No email";
    
    // If removing admin privileges, show confirmation dialog
    if (!makeAdmin) {
      setConfirmDialog({ open: true, userId, email: safeEmail, makeAdmin });
    } else {
      // If making admin, proceed without confirmation
      updateUserAdminStatus.mutate({ userId, isAdmin: makeAdmin });
    }
  };

  const confirmAdminStatusChange = () => {
    updateUserAdminStatus.mutate({ 
      userId: confirmDialog.userId, 
      isAdmin: confirmDialog.makeAdmin 
    });
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  // Fetch all users from the server
  const { data: users = [], isLoading: isUsersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!currentUser?.isAdmin, // Only fetch if user is an admin
  });
  
  if (isLoading || isUsersLoading) return <div className="container py-8">Loading users...</div>;
  if (error || usersError) return <div className="container py-8">Error loading: {(error || usersError)?.message}</div>;
  if (!currentUser) return <div className="container py-8">Please log in to view user management.</div>;

  // Calculate user stats from all users
  const totalUsers = users ? users.length : 0;
  const adminUsers = users ? users.filter((user: User) => user.isAdmin).length : 0;
  const regularUsers = totalUsers - adminUsers;

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      
      {/* Stats dashboard */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <User2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{adminUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regular Users</CardTitle>
            <User2 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{regularUsers}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Toggle admin status for users who have signed in to TewahedAnswers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.map((user: User) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email || 'No Email'}</TableCell>
                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                    <TableCell>
                      {user.isAdmin ? (
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-green-600" />
                          <span className="font-medium text-green-600">Admin</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <User2 className="h-4 w-4 mr-2 text-slate-600" />
                          <span className="text-slate-600">Regular User</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Switch 
                          checked={user.isAdmin || false}
                          onCheckedChange={() => handleAdminToggle(user.id, user.email || "", user.isAdmin || false)}
                          disabled={
                            updateUserAdminStatus.isPending || 
                            !canModifyUserStatus(user) ||
                            isEmailDefaultAdmin(user.email)
                          }
                        />
                        <span className="ml-2 flex items-center">
                          {user.isAdmin ? 
                            <span className="text-green-600 font-medium">Admin</span> : 
                            <span className="text-slate-600">User</span>
                          }
                          {isEmailDefaultAdmin(user.email) && 
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">Default Admin</span>
                          }
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({...confirmDialog, open})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Privileges</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove admin privileges from {confirmDialog.email}?
              This will prevent them from accessing admin features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAdminStatusChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}