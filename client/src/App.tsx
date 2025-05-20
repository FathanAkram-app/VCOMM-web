import { Route, Switch } from 'wouter';
import { Toaster } from './components/ui/toaster';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import CallManager from './components/CallManager';
import GroupCallManager from './components/GroupCallManager';
import NotificationManager from './components/NotificationManager';

// Impor halaman lain
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/not-found';
import Home from './pages/Home';

// Komponen untuk routing
function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/chat" component={Chat} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/audio-call" component={CallManager} />
      <Route path="/video-call" component={CallManager} />
      <Route path="/group-audio-call" component={GroupCallManager} />
      <Route path="/group-video-call" component={GroupCallManager} />
      <Route component={NotFound} />
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
              <NotificationManager />
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