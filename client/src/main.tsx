import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global WebSocket interceptor to prevent localhost:undefined errors
const originalWebSocket = window.WebSocket;
window.WebSocket = class extends originalWebSocket {
  constructor(url: string | URL, protocols?: string | string[]) {
    const urlString = url.toString();
    
    // Block any WebSocket attempts with invalid hosts
    if (urlString.includes('localhost:undefined') || 
        urlString.includes('://undefined') ||
        urlString.match(/wss?:\/\/localhost:undefined/)) {
      console.error('[WebSocket Interceptor] ❌ Blocked invalid WebSocket URL:', urlString);
      throw new Error('Invalid WebSocket URL detected and blocked');
    }
    
    console.log('[WebSocket Interceptor] ✅ Allowing valid WebSocket:', urlString);
    super(url, protocols);
  }
} as any;

createRoot(document.getElementById("root")!).render(<App />);
