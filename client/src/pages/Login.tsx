import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function Login() {
  const { login, isLoading, isAuthenticated } = useAuth();
  const [loginError, setLoginError] = useState(false);
  const [_, setLocation] = useLocation();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // If already authenticated, redirect to admin page
  if (isAuthenticated) {
    setLocation("/admin/questions");
    return null;
  }

  async function onSubmit(data: FormData) {
    setLoginError(false);
    const success = await login(data.username, data.password);
    
    if (success) {
      setLocation("/admin/questions");
    } else {
      setLoginError(true);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full bg-white rounded-lg shadow-card">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-secondary">Admin Login</h2>
            <p className="mt-2 text-sm text-gray-600">Sign in to access the admin dashboard</p>
          </div>
          
          {loginError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Invalid username or password. Please try again.
              </AlertDescription>
            </Alert>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-hover text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-4 text-center text-sm">
            <p className="text-gray-500">For demo: username: admin, password: password</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
