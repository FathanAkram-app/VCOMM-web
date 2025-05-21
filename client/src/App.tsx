import { Route, Switch } from 'wouter';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CallManager from './components/CallManager';

function App() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Switch>
        <Route path="/" component={LoginPage} />
        <Route path="/dashboard" component={DashboardPage} />
      </Switch>
      
      {/* Call Manager - selalu aktif untuk menangani panggilan masuk */}
      <CallManager />
    </div>
  );
}

export default App;