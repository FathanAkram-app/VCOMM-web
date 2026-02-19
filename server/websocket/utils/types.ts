import { WebSocket } from 'ws';
import { WebSocketMessage } from '@shared/schema';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
  source?: 'foreground' | 'background';  // Distinguish connection source
  isAlive?: boolean;
  closedByServer?: boolean;  // Flag to prevent race condition on session replacement
}

export interface SessionInfo {
  sessionId: string;
  timestamp: number;
  ws?: AuthenticatedWebSocket;
  source?: 'foreground' | 'background';
}

// Map userId -> Map of source -> WebSocket (allows both foreground and background connections)
export type ClientsMap = Map<number, Map<string, AuthenticatedWebSocket>>;
export type SessionsMap = Map<number, Map<string, SessionInfo>>;
export type GroupCallsMap = Map<string, Set<number>>;
