import { useEffect, useState } from "react";
import { useLocation, Route, Switch } from "wouter";
import { useAuth } from "@/context/AuthContext";
import AdminNavigation from "@/components/AdminNavigation";
import AdminQuestions from "@/pages/admin/AdminQuestions";
import UserManagement from "@/pages/admin/UserManagement";
import { DEFAULT_ADMIN_TABS, SITE_NAME } from "@/lib/constants";

// We've removed settings functionality as requested
// and are only using Questions and Users tabs

// Main AdminDashboard component
export default function AdminDashboard() {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("questions");
  
  // Extract the tab from the URL, default to questions
  useEffect(() => {
    // Check if at root admin path
    if (location === "/admin") {
      setLocation("/admin/questions");
      return;
    }
    
    // Extract tab from path
    const pathParts = location.split("/");
    if (pathParts.length >= 3) {
      const tab = pathParts[2];
      if (DEFAULT_ADMIN_TABS.includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [location, setLocation]);
  
  // If not authenticated or not admin, redirect
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (!isAdmin) {
      setLocation("/"); // Redirect to home if authenticated but not an admin
    }
  }, [isAuthenticated, isAdmin, setLocation]);
  
  if (!isAuthenticated || !isAdmin) {
    return null;
  }
  
  // Handle logout
  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };
  
  return (
    <div className="min-h-screen bg-accent-2 -mt-6">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-secondary">{SITE_NAME} Admin</h1>
          </div>
          
          {/* Admin Navigation */}
          <AdminNavigation activeTab={activeTab} />
          
          {/* Admin Content */}
          <Switch>
            <Route path="/admin/questions" component={AdminQuestions} />
            <Route path="/admin/users" component={UserManagement} />
            <Route>
              <div className="bg-white shadow-sm rounded-lg p-6">
                <h3 className="text-lg font-medium text-secondary">Page Not Found</h3>
                <p className="mt-1 text-sm text-gray-500">The requested admin page doesn't exist.</p>
              </div>
            </Route>
          </Switch>
        </div>
      </div>
    </div>
  );
}
