import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import MainLayout from "./pages/MainLayoutNew";
import LoginPage from "./pages/LoginPage";
import LoginSimple from "./pages/LoginSimple";
import SimpleLoginPage from "./pages/SimpleLoginPage";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import ConfigPage from "./pages/ConfigPage";
import CameraConfigPage from "./pages/CameraConfigPage";
import TestCallPage from "./pages/TestCallPage";
import GroupVideoTestPage from "./pages/GroupVideoTestPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import CommsView from "./pages/CommsView";
import ChatView from "./pages/ChatView";
import DirectChat from "./DirectChat";
import CallManager from "./components/CallManager";
import GroupCallManager from "./components/GroupCallManager";
import SimplifiedGroupVideo from "./components/SimplifiedGroupVideo";
import MessageSender from "./pages/MessageSender";
import { useToast } from "./hooks/use-toast";
import { useAuth, AuthProvider } from "./hooks/use-auth";
import { SimpleAuthProvider, useSimpleAuth } from "./lib/simpleAuthProvider";
import { ChatProvider } from "./context/ChatContext";
import { CallProvider } from "./context/CallContext";
import { GroupCallProvider } from "./context/GroupCallContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PollingProvider } from "./context/PollingContext";
import { useEffect, useState, useContext } from "react";
import { initializeAllWebSockets, authenticate } from "./lib/websocket";
import { PollingContext } from "./context/PollingContext";

// Protected route component
const ProtectedRoute = ({ component: Component }: { component: React.ComponentType }) => {
  const { user, isLoading } = useAuth();
  const pollingContext = useContext(PollingContext);
  const { toast } = useToast();
  
  // State to track if we're using polling fallback and notifications
  const [usingPolling, setUsingPolling] = useState<boolean>(false);
  const [notificationShown, setNotificationShown] = useState<boolean>(false);
  
  // Initialize WebSocket connections when user is authenticated
  useEffect(() => {
    let wsInitialized = false;
    let wsTimeout: NodeJS.Timeout | null = null;
    
    // Function to handle WebSocket errors (specifically 1006 errors)
    const handleWebSocketError = (event: Event) => {
      console.log("WebSocket error detected in ProtectedRoute");
      // If we keep getting connection errors and we're not already polling, activate fallback
      if (user?.id && pollingContext && !usingPolling) {
        console.log("Activating polling fallback due to WebSocket errors");
        setUsingPolling(true);
        pollingContext.startPolling(user.id);
        
        // Status koneksi sekarang ditampilkan di NavBar
        // Tidak perlu menampilkan toast lagi
        setNotificationShown(true);
      }
    };
    
    // Function to handle WebSocket recovery
    const handleWebSocketRecovery = (event: Event) => {
      console.log("WebSocket recovery detected in ProtectedRoute");
      // If we're using polling, stop it and switch back to WebSockets
      if (usingPolling && pollingContext) {
        console.log("Stopping polling fallback due to WebSocket recovery");
        pollingContext.stopPolling();
        setUsingPolling(false);
        setNotificationShown(false); // Reset notification state
        
        // Status koneksi sekarang ditampilkan di NavBar
        // Tidak perlu menampilkan toast lagi
      }
    };
    
    // Add event listeners to window 
    window.addEventListener('ws-error-1006', handleWebSocketError);
    window.addEventListener('ws-recovery', handleWebSocketRecovery);
    
    if (user) {
      // Set a timeout to activate polling if WebSockets don't connect within 8 seconds
      wsTimeout = setTimeout(() => {
        if (!wsInitialized && user.id && pollingContext && !usingPolling) {
          console.log("WebSocket connections timed out, activating polling fallback");
          setUsingPolling(true);
          pollingContext.startPolling(user.id);
          setNotificationShown(true); // Update state but don't show toast
          
          // Status koneksi sekarang ditampilkan di NavBar
          // Tidak perlu menampilkan toast lagi
        }
      }, 8000);
      
      // Initialize all WebSocket connections (legacy, chat, voice, video)
      initializeAllWebSockets()
        .then(() => {
          console.log("WebSocket connections initialized successfully");
          wsInitialized = true;
          
          if (wsTimeout) {
            clearTimeout(wsTimeout);
            wsTimeout = null;
          }
          
          // Stop polling if it was started
          if (usingPolling && pollingContext) {
            pollingContext.stopPolling();
            setUsingPolling(false);
          }
          
          // Authenticate with the WebSocket connections
          if (user.username) {
            const deviceInfo = user.deviceInfo || `Browser: ${navigator.userAgent}`;
            localStorage.setItem('currentUser', JSON.stringify(user));
            authenticate(user.username, user.password || "SESSION_AUTHENTICATED", deviceInfo);
            console.log("WebSocket authentication initiated for user:", user.username);
          }
        })
        .catch(err => {
          console.error("Failed to initialize WebSocket connections:", err);
          
          // Fall back to polling if WebSockets fail and we're not already polling
          if (user.id && pollingContext && !usingPolling) {
            setUsingPolling(true);
            pollingContext.startPolling(user.id);
            
            // Only show notification if not already shown
            if (!notificationShown) {
              setNotificationShown(true);
              toast({
                title: "Menggunakan Sistem Alternatif",
                description: "Komunikasi tetap berjalan melalui sistem cadangan",
                variant: "default",
                duration: 5000 // Show for 5 seconds only
              });
            }
          }
        });
    }
    
    // Cleanup function
    return () => {
      if (wsTimeout) {
        clearTimeout(wsTimeout);
      }
      
      // Stop polling when component unmounts
      if (pollingContext && usingPolling) {
        pollingContext.stopPolling();
      }
      
      // Remove the event listeners
      window.removeEventListener('ws-error-1006', handleWebSocketError);
      window.removeEventListener('ws-recovery', handleWebSocketRecovery);
    };
  }, [user, pollingContext, toast, usingPolling]);
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent font-bold">
          AUTHENTICATING...
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/" />;
  }
  
  return <Component />;
};

function Router() {
  const { user } = useAuth();
  
  // Use proper wouter Redirect component to preserve authentication state
  if (user && window.location.pathname === '/') {
    return <Redirect to="/dashboard" />;
  }
  
  // Use proper wouter Redirect component to preserve authentication state
  if (user && window.location.pathname === '/auth') {
    return <Redirect to="/dashboard" />;
  }
  
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/auth" component={Login} />
      <Route path="/register" component={require('./pages/Registration').default} />
      <Route path="/tabbed-login" component={require('./pages/TabbedLoginPage').default} />
      <Route path="/login-simple" component={LoginSimple} />
      <Route path="/test-call">
        <ProtectedRoute component={TestCallPage} />
      </Route>
      <Route path="/video-test" component={GroupVideoTestPage} />
      <Route path="/simple-group" component={SimplifiedGroupVideo} />
      <Route path="/dashboard">
        <ProtectedRoute component={MainLayout} />
      </Route>
      <Route path="/chat/:type/:id">
        <ProtectedRoute component={ChatRoomPage} />
      </Route>
      <Route path="/room/:id">
        <ProtectedRoute component={ChatRoomPage} />
      </Route>
      <Route path="/direct/:id">
        <ProtectedRoute component={ChatRoomPage} />
      </Route>
      <Route path="/send-message">
        <ProtectedRoute component={MessageSender} />
      </Route>
      <Route path="/config">
        <ProtectedRoute component={ConfigPage} />
      </Route>
      <Route path="/camera-config">
        <ProtectedRoute component={CameraConfigPage} />
      </Route>
      <Route path="/main">
        <ProtectedRoute component={MainLayout} />
      </Route>
      <Route path="/comms">
        <ProtectedRoute component={require('./FinalChat').default} />
      </Route>
      <Route path="/chat/:chatId">
        <ProtectedRoute component={require('./SimpleViewFixed').default} />
      </Route>
      <Route path="/direct/:id">
        <ProtectedRoute component={DirectChat} />
      </Route>
      <Route path="/group-test">
        <ProtectedRoute component={require('./components/WhatsAppDemo').default} />
      </Route>
      <Route path="/direct-chat-test">
        <ProtectedRoute component={require('./pages/DirectChatTestPage').default} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// Call management logic is now handled by the CallManager component

function App() {
  const { toast } = useToast();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <SimpleAuthProvider>
            <AuthProvider>
              <PollingProvider>
                <ChatProvider>
                  <CallProvider>
                    <GroupCallProvider>
                      <Router />
                      <CallManager />
                      <GroupCallManager />
                    </GroupCallProvider>
                  </CallProvider>
                </ChatProvider>
              </PollingProvider>
            </AuthProvider>
          </SimpleAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
