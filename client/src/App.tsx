import { Route, Switch } from 'wouter';
import { Suspense, lazy } from 'react';
import { WebSocketProvider } from './context/WebSocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { CallProvider } from './context/CallContext';
import { GroupCallProvider } from './context/GroupCallContext';
import NotificationManager from './components/NotificationManager';
import CallManager from './components/CallManager';
import GroupCallManager from './components/GroupCallManager';

// Lazy-loaded components
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ChatsPage = lazy(() => import('./pages/ChatsPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

function App() {
  return (
    <WebSocketProvider>
      <NotificationProvider>
        <CallProvider>
          <GroupCallProvider>
            <div className="min-h-screen bg-zinc-900 text-white">
              <Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-zinc-900">
                  <div className="animate-pulse text-green-500 text-2xl font-bold">
                    NXZZ-VComm Loading...
                  </div>
                </div>
              }>
                <Switch>
                  <Route path="/" component={LoginPage} />
                  <Route path="/dashboard" component={DashboardPage} />
                  <Route path="/chats" component={ChatsPage} />
                  <Route path="/profile" component={UserProfilePage} />
                  <Route path="/chat/:id/:isRoom?" component={ChatPage} />
                </Switch>
              </Suspense>
              
              {/* Notification and call managers yang selalu aktif */}
              <NotificationManager />
              <CallManager />
              <GroupCallManager />
            </div>
          </GroupCallProvider>
        </CallProvider>
      </NotificationProvider>
    </WebSocketProvider>
  );
}

export default App;