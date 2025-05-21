import { Route, Switch, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import MilitaryLoginPage from "./pages/MilitaryLoginPage";

// Create a query client for tanstack/react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen">
          <Router>
            <Switch>
              <Route path="/" component={MilitaryLoginPage} />
              <Route path="/login" component={MilitaryLoginPage} />
              {/* Add more routes as they are developed */}
            </Switch>
          </Router>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}