import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import AskQuestion from "@/pages/AskQuestion";
import About from "@/pages/About";
import QuestionDetail from "@/pages/QuestionDetail";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminRoute from "@/components/AdminRoute";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/ask" component={AskQuestion} />
      <Route path="/about" component={About} />
      <Route path="/questions/:id" component={QuestionDetail} />
      <Route path="/admin/*">
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-grow">
              <Router />
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
