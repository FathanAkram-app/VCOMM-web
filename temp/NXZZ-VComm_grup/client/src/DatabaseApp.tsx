import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import MainLayout from "./pages/MainLayoutNew";
import DatabaseLoginPage from "./pages/DatabaseLoginPage";
import { AuthProvider } from "./context/LocalAuthContext";
import { CallProvider } from "./context/CallContext";
import { ChatProvider } from "./context/ChatContext";
import { PollingProvider } from "./context/PollingContext";
import { GroupCallProvider } from "./context/GroupCallContext";

// Tipe untuk user dari database
export interface User {
  id: number;
  username: string;
  nrp?: string;
  name?: string;
  role?: string;
  rank?: string;
  unit?: string;
}

// Komponen untuk protected routes
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(!!user.isAuthenticated);
      } catch (error) {
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);
  
  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent font-bold">
          AUTHENTICATING...
        </div>
      </div>
    );
  }
  
  if (isAuthenticated === false) {
    return <Redirect to="/" />;
  }
  
  return <Component />;
}

// Main App component
export default function DatabaseApp() {
  return (
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <PollingProvider>
          <ChatProvider>
            <CallProvider>
              <GroupCallProvider>
                <Switch>
                  <Route path="/" component={DatabaseLoginPage} />
                  <Route path="/dashboard">
                    <ProtectedRoute path="/dashboard" component={MainLayout} />
                  </Route>
                  <Route path="/chat/:type/:id">
                    <ProtectedRoute path="/chat/:type/:id" component={MainLayout} />
                  </Route>
                  <Route path="/:tab">
                    <ProtectedRoute path="/:tab" component={MainLayout} />
                  </Route>
                </Switch>
              </GroupCallProvider>
            </CallProvider>
          </ChatProvider>
        </PollingProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}