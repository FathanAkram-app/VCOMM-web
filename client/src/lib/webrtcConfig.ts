/**
 * WebRTC Configuration
 * Shared configuration for all WebRTC connections in the Web Client
 */

// Configurable TURN server defaults
// These should match the values in the turnserver.conf file
const TURN_USERNAME = 'test';
const TURN_CREDENTIAL = 'test123';

/**
 * Returns the standard ICE server configuration, including public STUN servers
 * and the local TURN server for cross-network (NAT traversal) capabilities.
 */
export const getIceServerConfig = (): RTCConfiguration => {
  // Try to use the same host as the window location if available, otherwise default to the known IP.
  // In a real production setup, this could be fetched from an API.
  let host = '192.168.100.241';
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
     // Optional: If we want to dynamically use the current server's IP, we could uncomment this
     // host = window.location.hostname;
  }
  
  const turnServer = `${host}:3478`;

  return {
    iceServers: [
      // Google's public STUN servers
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // TURN server (local network cross-routing)
      { urls: `turn:${turnServer}`, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
      { urls: `turn:${turnServer}?transport=udp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
      { urls: `turn:${turnServer}?transport=tcp`, username: TURN_USERNAME, credential: TURN_CREDENTIAL },
    ],
    iceTransportPolicy: 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
};
