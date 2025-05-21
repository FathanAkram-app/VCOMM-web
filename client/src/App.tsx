import { Route, Switch } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { Toaster } from './components/ui/toaster';

// Placeholder for DashboardPage until it's implemented
const DashboardPage = () => <div>Dashboard Page</div>;
// Placeholder for CallManager until it's implemented
const CallManager = () => null;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-black text-white">
        <Switch>
          <Route path="/" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/dashboard" component={DashboardPage} />
        </Switch>
        
        {/* Call Manager - selalu aktif untuk menangani panggilan masuk */}
        <CallManager />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;