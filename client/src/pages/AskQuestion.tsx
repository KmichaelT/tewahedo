import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertQuestionSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const formSchema = insertQuestionSchema.extend({
  // Auto-populate author field from Firebase user
  author: z.string().optional(),
  title: z.string().min(5, {
    message: "Title must be at least 5 characters."
  }),
  content: z.string().min(20, {
    message: "Question details must be at least 20 characters."
  }),
  // Category and tags removed as requested - will be set by admins
});

type FormData = z.infer<typeof formSchema>;

export default function AskQuestion() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      author: user?.displayName || "",
      // Category and tags will be set by admins, not users
    },
  });
  
  // Update form with user data when available
  useEffect(() => {
    if (user) {
      // Always use user's display name from Firebase Auth
      form.setValue("author", user.displayName || user.email || "Anonymous");
    }
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Submitting question:", data);
      return await apiRequest("POST", "/api/questions", data);
    },
    onSuccess: (response) => {
      console.log("Question submitted successfully:", response);
      toast({
        title: "Question submitted",
        description: "Your question has been submitted for review!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/questions'] });
      form.reset();
      // Redirect to home page after a short delay
      setTimeout(() => setLocation('/'), 1500);
    },
    onError: (error) => {
      console.error("Error submitting question:", error);
      toast({
        variant: "destructive",
        title: "Failed to submit question",
        description: error instanceof Error ? error.message : "There was an error submitting your question. Please try again.",
      });
    },
  });

  function onSubmit(data: FormData) {
    console.log("Form submitted with data:", data);
    mutation.mutate(data);
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="px-4 sm:px-0">
        <Card className="bg-white rounded-lg shadow-card text-center p-6">
          <CardContent>
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="mb-6">Please log in to ask questions.</p>
            <a href="/api/login">
              <Button className="bg-primary hover:bg-primary-hover text-white">
                Log In
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <Card className="bg-white rounded-lg shadow-card mb-6">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold mb-6">Ask a Question</h1>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. What is the significance of fasting in Orthodox tradition?" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide more context or details about your question..." 
                        className="min-h-[120px]" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input 
                        readOnly 
                        disabled
                        className="bg-gray-50"
                        placeholder="Auto-detected from your account" 
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">This is auto-populated from your account information</p>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  className="bg-primary hover:bg-primary-hover text-white font-medium"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Submitting..." : "Submit Question"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="bg-white rounded-lg shadow-card">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">Tips for asking good questions:</h2>
          <ul className="list-disc pl-5 text-text space-y-2">
            <li>Be specific and clear about what you're asking</li>
            <li>Provide relevant context or background</li>
            <li>Check if your question has already been asked</li>
            <li>Use proper grammar and formatting</li>
            <li>Be respectful and considerate in your language</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
