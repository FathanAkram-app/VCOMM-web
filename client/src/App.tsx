import { Switch, Route, useLocation } from "wouter";
import { ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Handle manual redirects based on auth state
  useEffect(() => {
    if (!isLoading) {
      if (user && (location === "/" || location === "/login")) {
        // If user is logged in and on home/login page, go to chat
        setLocation("/chat");
      } else if (!user && location === "/chat") {
        // If user is not logged in and tries to access chat, go to login
        setLocation("/login");
      }
    }
  }, [user, isLoading, location, setLocation]);
  
  // Simple loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#a6c455]"></div>
      </div>
    );
  }
  
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat">{user ? <Chat /> : <Login />}</Route>
      <Route path="/">{user ? <Chat /> : <Login />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}