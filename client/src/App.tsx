import { Switch, Route } from "wouter";
import { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

// Konten ini akan diganti dengan halaman Chat yang sesungguhnya
const PlaceholderChat = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary mb-4">VCOMM Chat</h1>
        <p className="text-lg text-muted-foreground">Halaman chat sedang dikembangkan</p>
      </div>
    </div>
  );
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      <Route path="/chat">
        <ProtectedRoute>
          <PlaceholderChat />
        </ProtectedRoute>
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