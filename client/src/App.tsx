import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect } from "react";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import NotFound from "@/pages/not-found";
import AudioCall from "@/components/AudioCall";
import VideoCall from "@/components/VideoCall";
import { CallProvider } from "@/context/CallContext";
// import { usePWA } from "@/hooks/usePWA"; // Removed PWA install prompts

// Komponen sederhana untuk mengecek login
function AuthCheck({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function checkLogin() {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
          // Redirect to login if needed
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error checking login status:', error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkLogin();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#8d9c6b] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-[#8d9c6b]">AUTHENTICATING...</p>
        </div>
      </div>
    );
  }
  
  return isLoggedIn ? children : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat">
        <AuthCheck>
          <Chat />
        </AuthCheck>
      </Route>
      <Route path="/audio-call">
        <AuthCheck>
          <AudioCall />
        </AuthCheck>
      </Route>
      <Route path="/video-call">
        <AuthCheck>
          <VideoCall />
        </AuthCheck>
      </Route>
      <Route path="/">
        <Login />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CallProvider>
        <Toaster />
        <Router />
      </CallProvider>
    </QueryClientProvider>
  );
}