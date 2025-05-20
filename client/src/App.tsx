import { Route, Switch } from 'wouter';
import { Toaster } from './components/ui/toaster';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import CallManager from './components/CallManager';
import GroupCallManager from './components/GroupCallManager';

// Impor halaman lain
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Komponen untuk routing
function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/chat/:id" component={ChatPage} />
      <Route path="/audio-call" component={CallManager} />
      <Route path="/video-call" component={CallManager} />
      <Route path="/group-audio-call" component={GroupCallManager} />
      <Route path="/group-video-call" component={GroupCallManager} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <>
      <NotificationProvider>
        <WebSocketProvider>
          <CallProvider>
            <GroupCallProvider>
              <AppRoutes />
              <CallManager />
              <Toaster />
            </GroupCallProvider>
          </CallProvider>
        </WebSocketProvider>
      </NotificationProvider>
      
      {/* Modal container untuk modals */}
      <div id="modal-root"></div>
    </>
  );
}