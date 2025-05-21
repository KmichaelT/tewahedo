import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsersIcon } from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Manage application settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users and their admin privileges from the User Management section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Admin privileges are now managed directly from the User Management page.
            You can view all users who have signed in and toggle their admin status.
          </p>
          
          <Link to="/admin/users">
            <Button>
              <UsersIcon className="mr-2 h-4 w-4" />
              Go to User Management
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Default admins info */}
      <Card>
        <CardHeader>
          <CardTitle>Default Administrators</CardTitle>
          <CardDescription>
            These email addresses automatically receive admin privileges for system reliability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* CRITICAL: Only ONE default admin */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="font-medium">kmichaeltb@gmail.com</div>
            </div>
            
            {user?.email && user.email !== 'kmichaeltb@gmail.com' && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="font-medium">{user.email} (You)</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}