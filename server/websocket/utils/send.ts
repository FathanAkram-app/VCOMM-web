import { WebSocket } from 'ws';
import { ClientsMap, AuthenticatedWebSocket } from './types';

export function createSendToUser(clients: ClientsMap) {
  return function sendToUser(userId: number, message: any): boolean {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      return true;
    }
    return false;
  };
}

export function sendToClient(client: AuthenticatedWebSocket, message: any): boolean {
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message to client:', error);
      return false;
    }
  }
  return false;
}
