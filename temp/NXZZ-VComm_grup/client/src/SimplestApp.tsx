import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import SimpleViewFixed from "./SimpleViewFixed";
import BasicLoginPage from "./pages/BasicLoginPage";

// Main App component
export default function SimplestApp() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Cek apakah user sudah login
    const userData = localStorage.getItem("currentUser");
    setIsAuthenticated(!!userData);
  }, []);
  
  return (
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/" component={isAuthenticated ? SimpleViewFixed : BasicLoginPage} />
        <Route path="/:any*">
          {isAuthenticated ? <SimpleViewFixed /> : <BasicLoginPage />}
        </Route>
      </Switch>
    </TooltipProvider>
  );
}