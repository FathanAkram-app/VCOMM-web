import { Route, Switch, Router } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "./pages/LoginPage";

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
        <div className="bg-[#171717] text-white min-h-screen">
          <Router>
            <Switch>
              <Route path="/" component={LoginPage} />
              <Route path="/login" component={LoginPage} />
              {/* Add more routes as they are developed */}
            </Switch>
          </Router>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}