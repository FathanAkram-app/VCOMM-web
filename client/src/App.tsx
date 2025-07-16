import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect } from "react";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Chat from "@/pages/Chat";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import SuperAdmin from "@/pages/SuperAdmin";
import NotFound from "@/pages/not-found";
import AudioCall from "@/components/AudioCall";
import VideoCall from "@/components/VideoCall";
import GroupCall from "@/components/GroupCall";
import GroupVideoCallSimple from "@/components/GroupVideoCallSimple";
import AudioTest from "@/components/AudioTest";
import { CallProvider } from "@/context/CallContext";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { usePWA } from "@/hooks/usePWA";

// Admin Guard Component
function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminAuth() {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          alert('Anda belum login. Silakan login terlebih dahulu.');
          window.location.href = '/login';
          return;
        }
        
        const userData = await response.json();
        
        if (!userData || (userData.role !== 'admin' && userData.role !== 'super_admin')) {
          alert('Akses ditolak. Anda tidak memiliki hak akses Admin.');
          window.location.href = '/';
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking admin auth:', error);
        alert('Terjadi kesalahan saat memeriksa akses. Silakan login ulang.');
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAdminAuth();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#8d9c6b] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-[#8d9c6b]">VERIFYING ADMIN ACCESS...</p>
        </div>
      </div>
    );
  }
  
  return isAuthorized ? children : null;
}

// Super Admin Guard Component
function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkSuperAdminAuth() {
      try {
        const response = await fetch('/api/auth/user', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          alert('Anda belum login. Silakan login terlebih dahulu.');
          window.location.href = '/login';
          return;
        }
        
        const userData = await response.json();
        
        if (!userData || userData.role !== 'super_admin') {
          alert('Akses ditolak. Anda tidak memiliki hak akses Super Admin.');
          window.location.href = '/';
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking super admin auth:', error);
        alert('Terjadi kesalahan saat memeriksa akses. Silakan login ulang.');
        window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }
    
    checkSuperAdminAuth();
  }, []);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#171717]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#8d9c6b] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-[#8d9c6b]">VERIFYING SUPER ADMIN ACCESS...</p>
        </div>
      </div>
    );
  }
  
  return isAuthorized ? children : null;
}

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
          const userData = await response.json();
          setIsLoggedIn(true);
          
          // Auto-redirect super admin to dashboard
          if (userData.role === 'super_admin' && window.location.pathname === '/') {
            window.location.href = '/superadmin';
          }
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
          <CallProvider>
            <Chat />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/audio-call">
        <AuthCheck>
          <CallProvider>
            <AudioCall />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/video-call">
        <AuthCheck>
          <CallProvider>
            <VideoCall />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/group-call">
        <AuthCheck>
          <CallProvider>
            <GroupCall groupId={0} groupName="" />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/group-video-call">
        <AuthCheck>
          <CallProvider>
            <GroupVideoCallSimple />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/audio-test">
        <AuthCheck>
          <CallProvider>
            <AudioTest />
          </CallProvider>
        </AuthCheck>
      </Route>
      <Route path="/settings">
        <AuthCheck>
          <Settings onBack={() => window.history.back()} />
        </AuthCheck>
      </Route>
      <Route path="/admin">
        <AuthCheck>
          <AdminGuard>
            <Admin />
          </AdminGuard>
        </AuthCheck>
      </Route>
      <Route path="/superadmin">
        <AuthCheck>
          <SuperAdminGuard>
            <SuperAdmin />
          </SuperAdminGuard>
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
      <BackgroundManager />
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}