import { WebSocket } from 'ws';
import { WebSocketMessage } from '@shared/schema';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: number;
}

export interface SessionInfo {
  sessionId: string;
  timestamp: number;
  ws?: AuthenticatedWebSocket;
}

export type ClientsMap = Map<number, AuthenticatedWebSocket>;
export type SessionsMap = Map<number, SessionInfo>;
export type GroupCallsMap = Map<string, Set<number>>;
