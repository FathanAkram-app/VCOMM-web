import { Switch, Route, useLocation, Redirect } from "wouter";
import { ReactNode, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";

// Komponen untuk redirect berdasarkan status otentikasi
function AuthenticatedRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        console.log("User terautentikasi, mengarahkan ke /chat");
        setLocation("/chat");
      } else {
        console.log("User tidak terautentikasi, mengarahkan ke /login");
        setLocation("/login");
      }
    }
  }, [isAuthenticated, isLoading, setLocation]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat">
        <ProtectedRoute>
          <Chat />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <AuthenticatedRedirect />
      </Route>
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