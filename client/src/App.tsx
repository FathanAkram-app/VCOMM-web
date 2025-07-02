import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect } from "react";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import AudioCall from "@/components/AudioCall";
import VideoCall from "@/components/VideoCall";
import GroupCall from "@/components/GroupCall";
import GroupVideoCallFixed from "@/components/GroupVideoCallFixed";
import AudioTest from "@/components/AudioTest";
import { CallProvider } from "@/context/CallContext";
import { useServiceWorker } from "@/hooks/useServiceWorker";
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
      <Route path="/group-call">
        <AuthCheck>
          <GroupCall groupId={0} groupName="" />
        </AuthCheck>
      </Route>
      <Route path="/group-video-call">
        <AuthCheck>
          <GroupVideoCallFixed />
        </AuthCheck>
      </Route>
      <Route path="/audio-test">
        <AuthCheck>
          <AudioTest />
        </AuthCheck>
      </Route>
      <Route path="/settings">
        <AuthCheck>
          <Settings onBack={() => window.history.back()} />
        </AuthCheck>
      </Route>
      <Route path="/">
        <Login />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Background Manager Component
function BackgroundManager() {
  const {
    isSupported,
    isRegistered,
    requestNotificationPermission,
    registerForPushNotifications,
    showNotification,
    registerForCalls,
    keepAlive
  } = useServiceWorker();

  useEffect(() => {
    if (isRegistered) {
      console.log('[App] Service Worker registered, setting up background features...');
      
      // Request notification permission
      requestNotificationPermission().then((granted) => {
        if (granted) {
          console.log('[App] Notification permission granted');
          registerForPushNotifications();
          registerForCalls();
        }
      });

      // Keep connection alive every 30 seconds
      const keepAliveInterval = setInterval(() => {
        keepAlive();
      }, 30000);

      // Listen for service worker messages
      const handleSWMessage = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('[App] Service worker message:', customEvent.detail);
        // Handle call actions from notifications
      };

      window.addEventListener('sw-answer-call', handleSWMessage as EventListener);
      window.addEventListener('sw-reject-call', handleSWMessage as EventListener);

      return () => {
        clearInterval(keepAliveInterval);
        window.removeEventListener('sw-answer-call', handleSWMessage as EventListener);
        window.removeEventListener('sw-reject-call', handleSWMessage as EventListener);
      };
    }
  }, [isRegistered]);

  // Add visibility change handler to keep app alive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[App] App went to background, maintaining connection...');
      } else {
        console.log('[App] App returned to foreground');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Add beforeunload handler to show notification
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isSupported && isRegistered) {
        showNotification('NXZZ-VComm Aktif', {
          body: 'Aplikasi berjalan di background. Anda akan menerima notifikasi panggilan masuk.',
          tag: 'background-active',
          silent: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSupported, isRegistered, showNotification]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CallProvider>
        <BackgroundManager />
        <Toaster />
        <Router />
      </CallProvider>
    </QueryClientProvider>
  );
}