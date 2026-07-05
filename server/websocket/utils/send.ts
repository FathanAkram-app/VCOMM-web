import { WebSocket } from 'ws';
import { ClientsMap, AuthenticatedWebSocket } from './types';

export function createSendToUser(clients: ClientsMap) {
  // Send to all connections of a user (both foreground and background)
  return function sendToUser(userId: number, message: any): boolean {
    const userClients = clients.get(userId);
    if (!userClients || userClients.size === 0) {
      return false;
    }

    const messageStr = JSON.stringify(message);
    let sent = false;

    userClients.forEach((client, source) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
          sent = true;
          console.log(`[SendToUser] Message sent to user ${userId} (${source})`);
        } catch (error) {
          console.error(`[SendToUser] Error sending to user ${userId} (${source}):`, error);
        }
      }
    });

    return sent;
  };
}

// Get a specific connection for a user (prefers foreground over background)
export function getUserClient(clients: ClientsMap, userId: number): AuthenticatedWebSocket | null {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) {
    return null;
  }

  // Prefer foreground connection if available
  const foreground = userClients.get('foreground');
  if (foreground && foreground.readyState === WebSocket.OPEN) {
    return foreground;
  }

  // Fall back to background
  const background = userClients.get('background');
  if (background && background.readyState === WebSocket.OPEN) {
    return background;
  }

  return null;
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
