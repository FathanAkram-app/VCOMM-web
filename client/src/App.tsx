import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Chat from "@/pages/Chat";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import { useAuth } from "@/hooks/useAuth";
import { ChatProvider } from "@/contexts/ChatContext";

function PrivateRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="military-logo">
            <span className="text-xl font-bold text-white">
              VCOMM
            </span>
          </div>
          <p className="mt-4 text-foreground">Loading secure connection...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

// Redirect authenticated users away from auth pages
function PublicOnlyRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="military-logo">
            <span className="text-xl font-bold text-white">
              VCOMM
            </span>
          </div>
          <p className="mt-4 text-foreground">Verifying credentials...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/chat" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login">
        {() => <PublicOnlyRoute component={Login} />}
      </Route>
      <Route path="/register">
        {() => <PublicOnlyRoute component={Register} />}
      </Route>
      <Route path="/chat">
        {() => <PrivateRoute component={Chat} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <ChatProvider>
      <Router />
    </ChatProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppWithAuth />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
