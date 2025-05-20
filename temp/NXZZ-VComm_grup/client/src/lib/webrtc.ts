// WebRTC connection management
import { ws, chatWs, voiceWs, videoWs } from './websocket';

// ICE servers configuration for intranet and local Windows deployment
const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  // Optimize for local network connections - improved settings for military comms
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  iceTransportPolicy: 'all', // Allow both UDP and TCP (more reliable for military networks)
  rtcpMuxPolicy: 'require', // Required for better performance
};

// Track information for remote tracks
interface RemoteTrackInfo {
  id: string;
  kind: string;
  enabled: boolean;
  readyState: string;
  label: string;
}

// Track active connections
interface PeerConnection {
  peerId: number;
  connection: RTCPeerConnection;
  mediaStream?: MediaStream;
  // Connection information for debugging
  createdAt: Date;
  lastIceCandidate?: Date;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  callType: 'video' | 'audio';
  isOfferer: boolean;
  // Track remote tracks for detailed diagnostics
  remoteTracks?: RemoteTrackInfo[];
}

// Media configuration
interface MediaConfig {
  audio: boolean;
  video: boolean;
}

let localStream: MediaStream | null = null;
let localMediaConfig: MediaConfig = { audio: true, video: true };
let peerConnections: PeerConnection[] = [];
let onRemoteStreamHandler: ((stream: MediaStream, peerId: number) => void) | null = null;
let onConnectionStateChangeHandler: ((state: RTCPeerConnectionState, peerId: number) => void) | null = null;

// Initialize local media stream with optimizations for call type
export const initializeLocalMedia = async (config: MediaConfig = { audio: true, video: true }, portraitMode: boolean = true): Promise<MediaStream> => {
  try {
    console.log(`Initializing local media with config:`, config, `portraitMode:`, portraitMode);
    
    // Enhanced debugging for video call debugging
    if (portraitMode === true) {
      console.log('*** IMPORTANT: This is a VIDEO call with PORTRAIT mode enabled ***');
    }
    
    // Release any existing streams
    if (localStream) {
      console.log('Stopping existing media tracks before reinitializing');
      localStream.getTracks().forEach(track => {
        try {
          track.stop();
          console.log(`Stopped ${track.kind} track: ${track.label}`);
        } catch (error) {
          console.warn(`Error stopping ${track.kind} track:`, error);
        }
      });
    }
    
    // Store config for later use
    localMediaConfig = config;
    
    // Enhanced configuration for Windows environment with optimization for military comms
    let enhancedConfig: MediaStreamConstraints = { ...config };
    
    if (config.audio && !config.video) {
      // This is an audio-only call (voice tactical call), optimize for voice quality & bandwidth
      // Use proper type for audio constraints - use type assertion for complex constraints
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Lower sampleRate for better performance on limited bandwidth networks
        sampleRate: { ideal: 22050 },
        // Add advanced constraints for better voice quality in military environments
        advanced: [
          {
            echoCancellation: { exact: true },
            noiseSuppression: { exact: true },
            autoGainControl: { exact: true }
          }
        ]
      };
      
      enhancedConfig = {
        audio: audioConstraints,
        video: false
      };
      
      console.log('Enhanced audio config with voice optimizations for audio-only call');
    } else if (config.video) {
      // This is a video call, optimize for portrait mode (9:16) if requested
      // Useful for mobile devices where portrait orientation is more natural
      // Attempt to get device capabilities to better optimize the video
      let deviceInfo = "";
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
          deviceInfo = `Found ${videoDevices.length} camera(s): ${videoDevices.map(d => d.label || 'unnamed camera').join(', ')}`;
          console.log(deviceInfo);
        } else {
          console.warn('No video input devices found!');
        }
      } catch (enumError) {
        console.error('Error enumerating devices:', enumError);
      }
      
      if (portraitMode) {
        console.log('Configuring video for portrait mode (9:16)');
        
        // First try with ideal constraints for portrait
        let videoConstraints: MediaTrackConstraints = {
          width: { ideal: 720 },  // Width in portrait is narrower
          height: { ideal: 1280 }, // Height in portrait is taller
          aspectRatio: { ideal: 9/16 }, // 9:16 aspect ratio for portrait
          facingMode: 'user' // Default to front camera
        };
        
        enhancedConfig = {
          audio: config.audio,
          video: videoConstraints
        };
        
        console.log('Enhanced video config with portrait mode optimizations');
        
        // On mobile devices, we might need a fallback approach if the aspect ratio is not supported
        console.log('Also preparing fallback approach for portrait video if needed');
      } else {
        // Standard landscape video configuration (16:9)
        const videoConstraints: MediaTrackConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 }
        };
        
        enhancedConfig = {
          audio: config.audio,
          video: videoConstraints
        };
        
        console.log('Using standard landscape video configuration');
      }
    }
    
    // Get the media stream with our enhanced config
    console.log('Requesting media with enhanced config:', enhancedConfig);
    try {
      localStream = await navigator.mediaDevices.getUserMedia(enhancedConfig);
      
      // Verify we got the media tracks we expected
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      
      console.log(`Acquired ${localStream.getTracks().length} media tracks:`);
      console.log(`- ${videoTracks.length} video tracks`);
      console.log(`- ${audioTracks.length} audio tracks`);
      
      // Detailed log for each track
      localStream.getTracks().forEach(track => {
        console.log(`- ${track.kind} track (${track.label}): enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
        
        // Log track settings
        if (track.getSettings) {
          console.log(`  Settings:`, track.getSettings());
        }
      });
      
      // Check for video track issues and try fallback approach if needed
      if (config.video && videoTracks.length === 0) {
        console.warn('Failed to get video tracks with portrait mode constraints, trying fallback approach...');
        
        // Try a simplified approach without aspect ratio constraints
        const fallbackConstraints = { 
          video: { 
            facingMode: 'user',
            width: { ideal: portraitMode ? 720 : 1280 },
            height: { ideal: portraitMode ? 1280 : 720 }
          },
          audio: config.audio
        };
        
        console.log('Trying fallback video constraints:', fallbackConstraints);
        
        // Release current stream
        localStream.getTracks().forEach(track => track.stop());
        
        // Try again with fallback constraints
        localStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        
        // Log the results of the fallback attempt
        const fallbackVideoTracks = localStream.getVideoTracks();
        console.log(`Fallback approach resulted in ${fallbackVideoTracks.length} video tracks`);
        
        if (fallbackVideoTracks.length > 0) {
          console.log('Successfully obtained video tracks with fallback constraints');
        } else {
          console.warn('Still unable to get video tracks, continuing with audio only');
        }
      }
    } catch (mediaError) {
      console.error('Error accessing requested media devices:', mediaError);
      
      // If we failed with enhanced config, try a minimal config
      if (config.video && config.audio) {
        console.log('Trying fallback with minimal constraints...');
        try {
          // First try with just video
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          console.log('Successfully obtained video-only stream as fallback');
          
          // Now try to add audio
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Add audio track to our stream
            audioStream.getAudioTracks().forEach(track => {
              if (localStream) {
                localStream.addTrack(track);
              }
            });
            console.log('Successfully added audio track to fallback stream');
          } catch (audioError) {
            console.warn('Could not add audio to fallback stream:', audioError);
          }
        } catch (videoError) {
          console.warn('Video fallback failed, trying audio only:', videoError);
          try {
            // Last resort: just audio
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('Successfully obtained audio-only stream as last resort');
          } catch (audioOnlyError) {
            console.error('All fallback attempts failed:', audioOnlyError);
            throw new Error('Could not access any media devices after multiple attempts');
          }
        }
      } else {
        // Re-throw the original error if we're not trying both audio and video
        throw mediaError;
      }
    }
    
    // Final check on the obtained stream
    if (localStream) {
      console.log(`Final media stream has ${localStream.getTracks().length} tracks:`);
      
      // Get track counts by type for verification
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      
      console.log(`✓ Final stream contains ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);
      
      // Extra verification and correction specifically for video calls
      if (config.video && videoTracks.length === 0) {
        console.warn(`⚠️ CRITICAL: No video tracks found in final stream for video call!`);
        
        try {
          // Create a synthetic video track with a canvas as absolute last resort
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            console.log(`🎥 Creating fallback canvas video track for video call`);
            // Draw placeholder content
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.fillText('Camera Unavailable', canvas.width/2, canvas.height/2);
            
            // Create a video track from the canvas
            // @ts-ignore - captureStream might not be fully typed
            const canvasStream = canvas.captureStream(5); // 5 fps
            const syntheticVideoTrack = canvasStream.getVideoTracks()[0];
            
            // Add the synthetic track to our stream
            if (syntheticVideoTrack) {
              localStream.addTrack(syntheticVideoTrack);
              console.log(`✓ Added synthetic video track as fallback for video call`);
            }
          }
        } catch (canvasError) {
          console.error(`Failed to create synthetic track:`, canvasError);
        }
      }
      
      // Log all tracks in the final stream
      localStream.getTracks().forEach(track => {
        console.log(`- ${track.kind} track (${track.label}): enabled=${track.enabled}, readyState=${track.readyState}`);
      });
      
      // Enable all tracks to ensure they're active
      localStream.getTracks().forEach(track => {
        if (!track.enabled) {
          track.enabled = true;
          console.log(`Enabled ${track.kind} track that was initially disabled`);
        }
      });
      
      return localStream;
    } else {
      throw new Error('Failed to initialize media stream');
    }
  } catch (error) {
    console.error('Fatal error accessing media devices:', error);
    throw error;
  }
};

// Toggle audio
export const toggleAudio = async (enabled: boolean): Promise<void> => {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
    localMediaConfig.audio = enabled;
  }
};

// Toggle video
export const toggleVideo = async (enabled: boolean): Promise<void> => {
  console.log(`🎥 Toggling video to ${enabled ? 'ON' : 'OFF'}`);
  
  if (localStream) {
    const videoTracks = localStream.getVideoTracks();
    console.log(`🎥 Found ${videoTracks.length} video tracks to toggle`);
    
    // If we're enabling video but don't have any video tracks, try to add them
    if (enabled && videoTracks.length === 0) {
      console.log(`🎥 Enabling video but no video tracks present - attempting to add video track`);
      
      try {
        // Try to get a new video stream and add its tracks to our existing stream
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 720 },
            height: { ideal: 1280 },
            aspectRatio: { ideal: 9/16 },
            facingMode: 'user'
          } 
        });
        
        // Add all video tracks from the new stream to our existing stream
        const newVideoTracks = videoStream.getVideoTracks();
        newVideoTracks.forEach(track => {
          localStream!.addTrack(track);
          console.log(`🎥 Added new video track: ${track.id}`);
        });
        
        // Now toggle the newly added tracks
        localStream.getVideoTracks().forEach(track => {
          track.enabled = enabled;
          console.log(`🎥 Set newly added video track ${track.id} enabled=${enabled}`);
        });
      } catch (error) {
        console.error(`Failed to add video track when enabling video:`, error);
        
        // Create a fallback canvas-based video track as a last resort
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 720;
          canvas.height = 1280;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            console.log(`🎥 Creating fallback canvas video track`);
            // Draw placeholder image
            ctx.fillStyle = '#333333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.font = '24px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('Camera Unavailable', canvas.width/2, canvas.height/2);
            
            // @ts-ignore - captureStream might not be fully typed
            const canvasStream = canvas.captureStream(5); // 5 fps
            const canvasTrack = canvasStream.getVideoTracks()[0];
            
            if (canvasTrack) {
              localStream.addTrack(canvasTrack);
              canvasTrack.enabled = enabled;
              console.log(`🎥 Added and enabled fallback canvas video track`);
            }
          }
        } catch (canvasError) {
          console.error(`Failed to create canvas fallback:`, canvasError);
        }
      }
    } else {
      // Normal case: toggle existing video tracks
      videoTracks.forEach(track => {
        track.enabled = enabled;
        console.log(`🎥 Set video track ${track.id} enabled=${enabled}`);
      });
    }
    
    // Update media config
    localMediaConfig.video = enabled;
    console.log(`🎥 Updated localMediaConfig.video = ${enabled}`);
    
    // Log the final state of video tracks
    const finalVideoTracks = localStream.getVideoTracks();
    console.log(`🎥 Final video track state: ${finalVideoTracks.length} tracks, all enabled=${enabled}`);
  } else {
    console.warn(`🎥 Cannot toggle video: No local stream available`);
  }
};

// Switch camera (mobile) - preserves portrait mode settings
export const switchCamera = async (portraitMode: boolean = true): Promise<void> => {
  if (!localStream) return;
  
  // Get current video track
  const videoTrack = localStream.getVideoTracks()[0];
  if (!videoTrack) return;
  
  // Get all video devices
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  
  if (videoDevices.length <= 1) return; // Only one camera available
  
  // Find current camera's index
  const currentSettings = videoTrack.getSettings();
  const currentDeviceId = currentSettings.deviceId;
  const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
  
  // Choose next camera in rotation
  const nextIndex = (currentIndex + 1) % videoDevices.length;
  const nextDeviceId = videoDevices[nextIndex].deviceId;
  
  // Determine if this is front or back camera
  const isFrontCamera = nextIndex === 0; // Typically, the first camera is the front one
  const facingMode = isFrontCamera ? 'user' : 'environment';
  
  // Create video constraints that maintain portrait mode and set the specific device
  const videoConstraints: MediaTrackConstraints = {
    deviceId: { exact: nextDeviceId },
    facingMode: facingMode
  };
  
  // Add portrait mode constraints if needed
  if (portraitMode) {
    Object.assign(videoConstraints, {
      width: { ideal: 720 },
      height: { ideal: 1280 },
      aspectRatio: { ideal: 9/16 }
    });
  } else {
    Object.assign(videoConstraints, {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      aspectRatio: { ideal: 16/9 }
    });
  }
  
  console.log(`Switching to camera ${nextIndex} with constraints:`, videoConstraints);
  
  // Get new stream with next camera
  try {
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: localMediaConfig.audio,
    });
    
    // Replace track in all peer connections
    const newVideoTrack = newStream.getVideoTracks()[0];
    
    // Replace in local stream
    localStream.removeTrack(videoTrack);
    localStream.addTrack(newVideoTrack);
    
    // Replace in all RTCPeerConnections
    for (const peer of peerConnections) {
      const sender = peer.connection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(newVideoTrack);
      }
    }
    
    // Stop old track
    videoTrack.stop();
    
    console.log(`Camera switched successfully to ${isFrontCamera ? 'front' : 'back'} camera`);
  } catch (error) {
    console.error('Error switching camera:', error);
    throw error;
  }
};

// Create RTCPeerConnection for a peer
export const createPeerConnection = (peerId: number, callType: 'video' | 'audio' = 'video', isOfferer: boolean = false): RTCPeerConnection => {
  console.log(`Creating ${callType} peer connection with peer ${peerId}, isOfferer: ${isOfferer}`);
  
  // Check if connection already exists
  const existingConnection = peerConnections.find(pc => pc.peerId === peerId);
  if (existingConnection) {
    console.log(`Reusing existing connection with peer ${peerId}`);
    
    // Update the connection state info
    existingConnection.callType = callType;
    existingConnection.isOfferer = isOfferer;
    
    return existingConnection.connection;
  }
  
  // Create new connection with configuration optimized for call type
  const peerConnection = new RTCPeerConnection(configuration);
  
  // Add local stream tracks to connection
  if (localStream) {
    // Log all available tracks in local stream
    console.log(`Local stream has ${localStream.getTracks().length} tracks:`, 
      localStream.getTracks().map(t => `${t.kind} (${t.label}, enabled: ${t.enabled})`));
    
    // For 'audio' calls, only add audio tracks with optimized settings
    // For 'video' calls, add both audio and video tracks
    const videoTracks = localStream.getVideoTracks();
    const audioTracks = localStream.getAudioTracks();
    
    // Enhanced video track handling for video calls
    if (callType === 'video') {
      console.log(`🎥 VIDEO CALL: Found ${videoTracks.length} video tracks and ${audioTracks.length} audio tracks`);
      
      // For video calls, if no video tracks are found, try to create a fallback video track
      if (videoTracks.length === 0) {
        console.warn(`⚠️ VIDEO CALL but no video tracks found! Will attempt to create a fallback track`);
        try {
          // Create a canvas element to generate a fallback video track
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 480; // Portrait mode aspect ratio (3:4)
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Draw a placeholder video frame showing "No Camera"
            ctx.fillStyle = '#2f3640'; // Dark background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw a border
            ctx.strokeStyle = '#4cd137'; // Military green border
            ctx.lineWidth = 4;
            ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
            
            // Draw text
            ctx.fillStyle = '#fff'; // White text
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NO CAMERA ACCESS', canvas.width / 2, canvas.height / 2 - 15);
            ctx.font = '16px sans-serif';
            ctx.fillText('Tactical Video Unavailable', canvas.width / 2, canvas.height / 2 + 15);
            
            // Create a video track from the canvas
            // @ts-ignore - captureStream is not in the TypeScript types
            const canvasStream = canvas.captureStream(15); // 15 fps
            const fallbackVideoTrack = canvasStream.getVideoTracks()[0];
            
            if (fallbackVideoTrack) {
              console.log(`✓ Created fallback video track: ${fallbackVideoTrack.id}`);
              // Add the fallback video track to the local stream
              localStream.addTrack(fallbackVideoTrack);
              videoTracks.push(fallbackVideoTrack);
            }
          }
        } catch (error) {
          console.error(`Failed to create fallback video track:`, error);
        }
      }
    }
    
    // Add all appropriate tracks to the connection based on call type
    localStream.getTracks().forEach(track => {
      // For audio calls, only add audio tracks
      // For video calls, add both audio and video tracks
      if ((callType === 'audio' && track.kind === 'audio') || 
          (callType === 'video')) {
            
        console.log(`Adding local ${track.kind} track to ${callType} call with peer ${peerId} - track ID: ${track.id}`);
        const sender = peerConnection.addTrack(track, localStream!);
        
        // Attempt to optimize audio for voice calls
        if (track.kind === 'audio') {
          // Log track constraints and settings
          if (track.getConstraints) {
            console.log(`Audio track constraints:`, track.getConstraints());
          }
          if (track.getSettings) {
            console.log(`Audio track settings:`, track.getSettings());
          }
          
          // Ensure the audio track is enabled
          if (!track.enabled) {
            track.enabled = true;
            console.log(`Enabled audio track for call with peer ${peerId}`);
          }
        }
        
        // For video tracks in video calls
        if (track.kind === 'video' && callType === 'video') {
          console.log(`🎥 Adding video track ${track.id} to connection`);
          
          // Ensure the video track is enabled
          if (!track.enabled) {
            track.enabled = true;
            console.log(`🎥 Enabled video track for call with peer ${peerId}`);
          }
        }
        
        // Set audio processing to prioritize voice
        if (track.getCapabilities) {
          const caps = track.getCapabilities();
          console.log(`Audio track capabilities:`, caps);
          
          // We could apply specific constraints here if needed
          // but we'll leave the browser default settings for now
        }
        
        console.log(`Created audio sender with ID: ${sender.track?.id || 'unknown'}`);
      } 
      // This code is unnecessary as it's handled above - causing TS error
      /* else if (callType === 'video') {
        console.log(`Adding local ${track.kind} track to ${callType} call with peer ${peerId} - track ID: ${track.id}`);
        const sender = peerConnection.addTrack(track, localStream!);
        
        // For video tracks in video calls, we can set bandwidth requirements 
        // but we'll leave them at default for now
      } */
    });
    
    // Log detailed info about tracks being sent
    const senders = peerConnection.getSenders();
    console.log(`Added ${senders.length} track(s) to connection with peer ${peerId}:`, 
      senders.map(s => s.track ? `${s.track.kind} (${s.track.label})` : 'null-track'));
  }
  
  // Set additional connection options based on call type
  if (callType === 'audio') {
    // For audio calls, we can use a more aggressive ICE candidate policy
    // to establish connections faster, as audio requires less bandwidth
    try {
      // Force TURN relay for consistent audio experience in choppy networks
      // This is specific to our military use case where reliability is key
      peerConnection.setConfiguration({
        ...configuration,
        iceTransportPolicy: 'relay'
      });
    } catch (error) {
      console.warn('Failed to set ICE transport policy to relay:', error);
    }
  }
  
  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`Local ICE candidate generated for peer ${peerId}`);
      
      // Update the last ICE candidate timestamp
      const peerConn = peerConnections.find(pc => pc.peerId === peerId);
      if (peerConn) {
        peerConn.lastIceCandidate = new Date();
      }
      
      // Notify via callback
      if (onIceCandidateHandler) {
        onIceCandidateHandler(peerId, event.candidate);
      }
    }
  };
  
  // Handle remote stream
  peerConnection.ontrack = (event) => {
    // Get the remote stream
    const remoteStream = event.streams[0];
    console.log(`Received remote ${event.track.kind} track from peer ${peerId}`);
    
    // Enhanced debugging for video tracks in video calls
    if (callType === 'video' && event.track.kind === 'video') {
      console.log(`🎥 VIDEO CALL: Received remote video track from peer ${peerId}`, {
        trackId: event.track.id,
        trackEnabled: event.track.enabled,
        trackReadyState: event.track.readyState,
        streamId: remoteStream?.id,
        streamActive: remoteStream?.active
      });
      
      // Enable the track explicitly if it's not enabled
      if (!event.track.enabled) {
        console.log(`🎥 Enabling previously disabled remote video track from peer ${peerId}`);
        event.track.enabled = true;
      }
    }
    
    // Store media stream with the peer connection
    const peerConn = peerConnections.find(pc => pc.peerId === peerId);
    if (peerConn) {
      peerConn.mediaStream = remoteStream;
      
      // Update track information for detailed diagnostics
      if (!peerConn.remoteTracks) {
        peerConn.remoteTracks = [];
      }
      
      // Add or update track information
      const existingTrackIndex = peerConn.remoteTracks.findIndex(t => t.id === event.track.id);
      if (existingTrackIndex !== -1) {
        peerConn.remoteTracks[existingTrackIndex] = {
          id: event.track.id,
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          label: event.track.label
        };
      } else {
        peerConn.remoteTracks.push({
          id: event.track.id,
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState,
          label: event.track.label
        });
      }
      
      console.log(`Updated remote tracks for peer ${peerId}:`, peerConn.remoteTracks);
    }
    
    // Notify via callback
    if (onRemoteStreamHandler) {
      onRemoteStreamHandler(remoteStream, peerId);
    }
  };
  
  // Handle connection state change
  peerConnection.onconnectionstatechange = () => {
    console.log(`Connection state changed to "${peerConnection.connectionState}" for peer ${peerId}`);
    
    // Update connection state in our tracking
    const peerConn = peerConnections.find(pc => pc.peerId === peerId);
    if (peerConn) {
      peerConn.connectionState = peerConnection.connectionState;
    }
    
    // Log detailed connection state for important state changes
    if (
      peerConnection.connectionState === 'connected' || 
      peerConnection.connectionState === 'disconnected' || 
      peerConnection.connectionState === 'failed' || 
      peerConnection.connectionState === 'closed'
    ) {
      logConnectionState(peerId);
    }
    
    // Notify via callback
    if (onConnectionStateChangeHandler) {
      onConnectionStateChangeHandler(peerConnection.connectionState, peerId);
    }
    
    // Clean up closed connections
    if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
      console.log(`Connection with peer ${peerId} is ${peerConnection.connectionState}, removing`);
      removePeerConnection(peerId);
    }
  };
  
  // Handle ICE connection state change
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`ICE connection state changed to "${peerConnection.iceConnectionState}" for peer ${peerId}`);
    
    // Update ICE connection state in our tracking
    const peerConn = peerConnections.find(pc => pc.peerId === peerId);
    if (peerConn) {
      peerConn.iceConnectionState = peerConnection.iceConnectionState;
    }
    
    // Log detailed connection state for important state changes
    if (
      peerConnection.iceConnectionState === 'connected' || 
      peerConnection.iceConnectionState === 'disconnected' || 
      peerConnection.iceConnectionState === 'failed' || 
      peerConnection.iceConnectionState === 'closed'
    ) {
      logConnectionState(peerId);
    }
    
    // Take action for specific ICE connection states
    if (peerConnection.iceConnectionState === 'failed') {
      console.warn(`ICE connection failed for peer ${peerId}, attempting recovery...`);
      
      // Try to restart ICE by creating a new offer if we're the offerer
      const pc = peerConnections.find(pc => pc.peerId === peerId);
      if (pc && pc.isOfferer) {
        console.log(`We are the call initiator for peer ${peerId}, attempting ICE restart...`);
        try {
          // Attempt an ICE restart by creating a new offer with the ICE restart flag
          peerConnection.createOffer({ iceRestart: true })
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
              console.log(`ICE restart initiated for peer ${peerId}`);
              
              // The new local description will trigger new ICE candidates
              // The caller is responsible for sending the new offer via the signaling channel
            })
            .catch(error => {
              console.error(`Failed to restart ICE for peer ${peerId}:`, error);
            });
        } catch (error) {
          console.error(`Error attempting ICE restart for peer ${peerId}:`, error);
        }
      }
    }
  };
  
  // Handle signaling state change
  peerConnection.onsignalingstatechange = () => {
    console.log(`Signaling state changed to "${peerConnection.signalingState}" for peer ${peerId}`);
    
    // Update signaling state in our tracking
    const peerConn = peerConnections.find(pc => pc.peerId === peerId);
    if (peerConn) {
      peerConn.signalingState = peerConnection.signalingState;
    }
  };
  
  // Store the connection with metadata
  peerConnections.push({
    peerId,
    connection: peerConnection,
    createdAt: new Date(),
    connectionState: peerConnection.connectionState,
    iceConnectionState: peerConnection.iceConnectionState,
    signalingState: peerConnection.signalingState,
    callType,
    isOfferer,
    mediaStream: undefined, // Will be set when remote stream is received
    remoteTracks: [] // Initialize empty array for remote track info
  });
  
  console.log(`Created new ${callType} peer connection with peer ${peerId}`);
  return peerConnection;
};

// Remove peer connection
export const removePeerConnection = (peerId: number): void => {
  console.log(`Removing peer connection with peer ${peerId}`);
  
  const index = peerConnections.findIndex(pc => pc.peerId === peerId);
  if (index !== -1) {
    const { connection, mediaStream } = peerConnections[index];
    
    try {
      // Remove all tracks from the connection
      connection.getSenders().forEach(sender => {
        if (sender.track) {
          try {
            connection.removeTrack(sender);
          } catch (error) {
            console.error(`Error removing track from connection with peer ${peerId}:`, error);
          }
        }
      });
      
      // Stop all tracks in the remote media stream if it exists
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
          try {
            track.stop();
            console.log(`Stopped remote ${track.kind} track from peer ${peerId}`);
          } catch (error) {
            console.error(`Error stopping remote ${track.kind} track from peer ${peerId}:`, error);
          }
        });
      }
      
      // Close the connection
      connection.close();
      console.log(`Closed connection with peer ${peerId}`);
    } catch (error) {
      console.error(`Error closing connection with peer ${peerId}:`, error);
    } finally {
      // Always remove from our tracking array
      peerConnections.splice(index, 1);
      console.log(`Removed peer ${peerId} from connections list`);
    }
  } else {
    console.log(`No connection found for peer ${peerId}`);
  }
};

// Close all peer connections
export const closeAllConnections = (): void => {
  console.log(`Closing all WebRTC connections (${peerConnections.length} connections active)`);
  
  // Close each connection properly
  peerConnections.forEach(({ peerId, connection }) => {
    try {
      // Remove all tracks from the connection
      connection.getSenders().forEach(sender => {
        if (sender.track) {
          connection.removeTrack(sender);
        }
      });
      
      // Close the connection
      connection.close();
      console.log(`Closed connection with peer ${peerId}`);
    } catch (error) {
      console.error(`Error closing connection with peer ${peerId}:`, error);
    }
  });
  
  // Clear peer connections array
  peerConnections = [];
  
  // Stop local media properly
  if (localStream) {
    console.log('Stopping local media tracks');
    localStream.getTracks().forEach(track => {
      try {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      } catch (error) {
        console.error(`Error stopping ${track.kind} track:`, error);
      }
    });
    localStream = null;
  }
  
  console.log('All WebRTC connections closed');
};

// Create and send offer
export const createOffer = async (peerId: number, callType: 'video' | 'audio' = 'video'): Promise<RTCSessionDescriptionInit> => {
  console.log(`Creating ${callType} offer for peer ${peerId}`);
  
  // Verify we have the necessary media tracks for the call type
  if (!localStream) {
    console.error(`[CRITICAL] No local media stream available when creating ${callType} offer for peer ${peerId}`);
    try {
      // Try to recover by initializing local media
      console.log(`Attempting to recover by initializing local media for ${callType} call`);
      await initializeLocalMedia({ 
        audio: true, 
        video: callType === 'video' 
      }, callType === 'video');
      
      if (!localStream) {
        throw new Error(`Failed to initialize local media for ${callType} call`);
      }
    } catch (error) {
      console.error(`Failed to recover - could not initialize local media:`, error);
      throw new Error(`Cannot create ${callType} offer without local media stream`);
    }
  }
  
  // Additional validation for video calls
  if (callType === 'video') {
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn(`[ISSUE DETECTED] Creating video offer but no video tracks available`);
      
      // Try to recover by re-initializing with explicit video
      try {
        console.log(`Attempting to recover by re-initializing local media with video`);
        await initializeLocalMedia({ audio: true, video: true }, true); // Enable portrait mode
        
        // Check if we now have video tracks
        if (localStream && localStream.getVideoTracks().length === 0) {
          console.warn(`Still no video tracks after recovery attempt - continuing with audio-only`);
          // We'll continue but log this issue clearly
        }
      } catch (recoveryError) {
        console.error(`Failed to recover video tracks:`, recoveryError);
        // Continue with what we have, but log the issue
      }
    }
  }
  
  // Create peer connection with proper call type and offerer status
  const peerConnection = createPeerConnection(peerId, callType, true);
  
  try {
    // Configure the offer based on call type
    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: callType === 'video',
      // Note: voiceActivityDetection is not in standard RTCOfferOptions
      // but we'll use appropriate audio settings in the connection
    };
    
    console.log(`Creating ${callType} offer with options:`, offerOptions);
    
    // Log sender tracks before creating offer
    const senders = peerConnection.getSenders();
    console.log(`Connection has ${senders.length} sender track(s) before creating offer:`, 
      senders.map(s => s.track ? `${s.track.kind} (${s.track.label}, enabled: ${s.track.enabled})` : 'null track'));
    
    // Check if we have appropriate senders for this call type
    const hasAudioSender = senders.some(s => s.track?.kind === 'audio');
    const hasVideoSender = senders.some(s => s.track?.kind === 'video');
    
    if (!hasAudioSender) {
      console.warn(`[ISSUE DETECTED] No audio sender found when creating ${callType} offer`);
    }
    
    if (callType === 'video' && !hasVideoSender) {
      console.warn(`[ISSUE DETECTED] No video sender found when creating video offer`);
    }
    
    // Create offer with appropriate options
    const offer = await peerConnection.createOffer(offerOptions);
    
    // Log SDP for debugging purposes (summarized)
    const sdpLines = offer.sdp?.split('\n') || [];
    const audioLines = sdpLines.filter(line => line.includes('audio')).length;
    const videoLines = sdpLines.filter(line => line.includes('video')).length;
    console.log(`Offer SDP contains ${audioLines} audio-related lines and ${videoLines} video-related lines`);
    
    // Add validation for video offers
    if (callType === 'video' && videoLines === 0) {
      console.warn(`[CRITICAL ISSUE] Created a video offer but SDP contains no video lines!`);
      // Continue anyway, but this is a clear issue that needs to be reported
    }
    
    // Set as local description
    await peerConnection.setLocalDescription(offer);
    console.log(`Local description set for ${callType} offer to peer ${peerId}`);
    
    // Add connection diagnostics after setting local description
    const pc = peerConnections.find(pc => pc.peerId === peerId);
    if (pc) {
      console.log(`Connection diagnostic after creating offer for peer ${peerId}:
        - Connection state: ${pc.connection.connectionState}
        - ICE connection state: ${pc.connection.iceConnectionState}
        - Signaling state: ${pc.connection.signalingState}
        - Call type: ${callType}`);
    }
    
    return offer;
  } catch (error) {
    console.error(`Error creating ${callType} offer for peer ${peerId}:`, error);
    throw error;
  }
};

// Handle incoming offer and create answer
export const handleOffer = async (peerId: number, offer: RTCSessionDescriptionInit, callType: 'video' | 'audio' = 'video'): Promise<RTCSessionDescriptionInit> => {
  console.log(`Handling ${callType} offer from peer ${peerId}`);
  
  // For video calls, ensure we have video tracks before processing
  if (callType === 'video') {
    console.log(`🎥 VIDEO CALL: Handling offer for VIDEO call from peer ${peerId}`);
    
    // Check if we have a local stream with video tracks
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log(`🎥 Local stream has ${videoTracks.length} video tracks for this video call`);
      
      // If we don't have video tracks but this is a video call, create them
      if (videoTracks.length === 0) {
        console.warn(`🎥 VIDEO CALL WITH NO VIDEO TRACKS: Attempting to create video tracks before processing offer`);
        
        try {
          // Try to get camera access
          const videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: {
              width: { ideal: 720 },
              height: { ideal: 1280 },
              aspectRatio: { ideal: 9/16 },
              facingMode: 'user'
            } 
          });
          
          // Add the video tracks to our existing stream
          videoStream.getVideoTracks().forEach(track => {
            console.log(`🎥 Adding video track ${track.id} to local stream`);
            localStream!.addTrack(track);
          });
          
          console.log(`🎥 Successfully added video tracks to local stream for video call`);
        } catch (error) {
          console.error(`🎥 Failed to get video tracks for video call:`, error);
          
          // Create a canvas fallback video track
          try {
            console.log(`🎥 Creating canvas fallback video track for video call`);
            const canvas = document.createElement('canvas');
            canvas.width = 720;
            canvas.height = 1280;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Draw placeholder
              ctx.fillStyle = '#333333';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.font = '24px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.fillText('Video Unavailable', canvas.width/2, canvas.height/2);
              
              // Create a video track from the canvas
              // @ts-ignore - captureStream might not be fully typed
              const canvasStream = canvas.captureStream(15); // 15 fps
              const canvasTrack = canvasStream.getVideoTracks()[0];
              
              if (canvasTrack) {
                localStream.addTrack(canvasTrack);
                console.log(`🎥 Added canvas fallback video track to local stream`);
              }
            }
          } catch (canvasError) {
            console.error(`🎥 Failed to create canvas fallback:`, canvasError);
          }
        }
      }
    } else {
      console.error(`🎥 No local stream available for video call - trying to initialize media`);
      
      // Try to initialize local media since we need it for video call
      try {
        await initializeLocalMedia({ 
          audio: true, 
          video: true 
        }, true); // true for portrait mode
        console.log(`🎥 Successfully initialized local media for video call`);
      } catch (error) {
        console.error(`🎥 Failed to initialize local media for video call:`, error);
      }
    }
  }
  
  // Analyze the offer SDP to detect any issues
  if (offer.sdp) {
    const offerSdpLines = offer.sdp.split('\n');
    const offerAudioLines = offerSdpLines.filter(line => line.includes('audio')).length;
    const offerVideoLines = offerSdpLines.filter(line => line.includes('video')).length;
    
    console.log(`Received offer SDP contains ${offerAudioLines} audio-related lines and ${offerVideoLines} video-related lines`);
    
    // Additional validation for video offers
    if (callType === 'video' && offerVideoLines === 0) {
      console.warn(`⚠️ ISSUE DETECTED: Received a video call offer from peer ${peerId} but no video lines in SDP`);
      console.log(`🎥 VIDEO CALL FIX: Will still process as video call despite missing SDP video lines`);
      // Important: We still treat this as a video call even if the SDP doesn't have video lines
      // This ensures the UI will show the video interface properly
    }
  }
  
  // Create peer connection with proper call type and offerer status (false)
  const peerConnection = createPeerConnection(peerId, callType, false);
  
  try {
    // Set remote description from the offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log(`Remote description set for ${callType} offer from peer ${peerId}`);
    
    // Log the number of transceivers to verify the offer was processed correctly
    const transceivers = peerConnection.getTransceivers();
    console.log(`Connection has ${transceivers.length} transceivers after setting remote description:`, 
      transceivers.map(t => ({ 
        kind: t.receiver.track?.kind || 'unknown',
        mid: t.mid,
        direction: t.direction,
        currentDirection: t.currentDirection
      })));
    
    // Verify we have all the right track kinds based on call type
    const hasAudioTransceiver = transceivers.some(t => t.receiver.track?.kind === 'audio');
    const hasVideoTransceiver = transceivers.some(t => t.receiver.track?.kind === 'video');
    
    if (!hasAudioTransceiver) {
      console.warn(`ISSUE DETECTED: No audio transceiver found after setting remote description for ${callType} call`);
    }
    
    if (callType === 'video' && !hasVideoTransceiver) {
      console.warn(`⚠️ ISSUE DETECTED: No video transceiver found after setting remote description for video call`);
      
      // This is a critical issue for video calls - try to force a video transceiver
      if (localStream) {
        let videoTracks = localStream.getVideoTracks();
        
        // If we don't have video tracks, try to create a fallback track one more time
        if (videoTracks.length === 0) {
          console.log(`🎥 CRITICAL FIX: Creating emergency fallback video track right now`);
          
          try {
            // Create an emergency fallback video track from canvas
            const canvas = document.createElement('canvas');
            canvas.width = 320; 
            canvas.height = 480;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Draw something on the canvas
              ctx.fillStyle = '#233142';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.font = 'bold 20px sans-serif';
              ctx.fillStyle = '#f95959';
              ctx.textAlign = 'center';
              ctx.fillText('TACTICAL VIDEO', canvas.width/2, canvas.height/2 - 15);
              ctx.fillText('FEED ACTIVE', canvas.width/2, canvas.height/2 + 15);
              
              // Create a stream from the canvas
              // @ts-ignore
              const canvasStream = canvas.captureStream(5); // 5fps for lower bandwidth
              const fallbackTrack = canvasStream.getVideoTracks()[0];
              
              if (fallbackTrack) {
                localStream.addTrack(fallbackTrack);
                videoTracks = [fallbackTrack]; // Use this track
                console.log(`🎥 Created emergency fallback video track`);
              }
            }
          } catch (error) {
            console.error(`Failed to create emergency fallback track:`, error);
          }
        }
        
        if (videoTracks.length > 0) {
          console.log(`🎥 VIDEO CALL FIX: Adding missing video transceiver to connection`);
          
          // Add a video transceiver with our local video track
          try {
            peerConnection.addTransceiver(videoTracks[0], { 
              direction: 'sendrecv',
              streams: [localStream]
            });
            console.log(`✓ Successfully added video transceiver to connection`);
          } catch (transceiverError) {
            console.error(`Failed to add video transceiver:`, transceiverError);
          }
        } else {
          console.warn(`🎥 Cannot add video transceiver: no local video tracks available despite attempts`);
        }
      }
    }
    
    // Create answer with appropriate settings for the call type
    const answerOptions = {};
    const answer = await peerConnection.createAnswer(answerOptions);
    
    // Log SDP for debugging purposes (summarized)
    const sdpLines = answer.sdp?.split('\n') || [];
    const audioLines = sdpLines.filter(line => line.includes('audio')).length;
    const videoLines = sdpLines.filter(line => line.includes('video')).length;
    console.log(`Answer SDP contains ${audioLines} audio-related lines and ${videoLines} video-related lines`);
    
    // Verify our answer has the right media types
    if (audioLines === 0) {
      console.warn(`ISSUE DETECTED: Our answer has no audio lines for ${callType} call`);
    }
    
    if (callType === 'video' && videoLines === 0) {
      console.warn(`ISSUE DETECTED: Our answer has no video lines for video call`);
    }
    
    // Set as local description
    await peerConnection.setLocalDescription(answer);
    console.log(`Local description set for ${callType} answer to peer ${peerId}`);
    
    // Add connection diagnostics after setting local description
    const pc = peerConnections.find(pc => pc.peerId === peerId);
    if (pc) {
      console.log(`Connection diagnostic after creating answer for peer ${peerId}:
        - Connection state: ${pc.connection.connectionState}
        - ICE connection state: ${pc.connection.iceConnectionState}
        - Signaling state: ${pc.connection.signalingState}
        - Call type: ${callType}`);
    }
    
    return answer;
  } catch (error) {
    console.error(`Error handling ${callType} offer from peer ${peerId}:`, error);
    throw error;
  }
};

// Handle incoming answer
export const handleAnswer = async (peerId: number, answer: RTCSessionDescriptionInit, callType: 'video' | 'audio' = 'video'): Promise<void> => {
  console.log(`Handling ${callType} answer from peer ${peerId}`);
  
  // Get existing connection
  const peerConn = peerConnections.find(pc => pc.peerId === peerId);
  
  // If no connection exists, try to recreate it (this is a failsafe)
  if (!peerConn) {
    console.warn(`No peer connection found for peer ${peerId} when handling answer, creating one...`);
    try {
      // Create a new connection as the offerer since we're handling an answer
      const newConnection = createPeerConnection(peerId, callType, true);
      
      // Set the remote description with the answer
      await newConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Set remote description on newly created connection for peer ${peerId}`);
      
      return;
    } catch (error) {
      console.error(`Failed to handle answer on newly created connection for peer ${peerId}:`, error);
      throw new Error(`No peer connection found for peer ID ${peerId} and failed to create a new one`);
    }
  }
  
  const peerConnection = peerConn.connection;
  
  // Update call type in tracking
  peerConn.callType = callType;
  
  try {
    // Check signaling state before setting remote description
    if (peerConnection.signalingState === 'stable') {
      console.warn(`Peer ${peerId} connection already in 'stable' state when handling answer`);
    } else if (peerConnection.signalingState === 'closed') {
      throw new Error(`Cannot set remote description on closed connection for peer ${peerId}`);
    }
    
    // Set the remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log(`Successfully set remote description for ${callType} answer from peer ${peerId}`);
    
    // Connection should now be established
    console.log(`WebRTC connection with peer ${peerId} should now be established`);
  } catch (error) {
    console.error(`Error handling ${callType} answer from peer ${peerId}:`, error);
    
    // Try to recover if possible
    if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
      console.log(`Connection with peer ${peerId} is in ${peerConnection.connectionState} state after handling answer, removing...`);
      removePeerConnection(peerId);
    }
    
    throw error;
  }
};

// Add ICE candidate received from remote peer
export const addIceCandidate = async (peerId: number, candidate: RTCIceCandidateInit): Promise<void> => {
  console.log(`Adding ICE candidate for peer ${peerId}`);
  
  // Check if the candidate is valid
  if (!candidate || !candidate.candidate) {
    console.warn(`Received empty or invalid ICE candidate for peer ${peerId}`, candidate);
    return; // Skip invalid candidates instead of throwing
  }
  
  const peerConnection = peerConnections.find(pc => pc.peerId === peerId)?.connection;
  
  if (!peerConnection) {
    console.error(`No peer connection found for peer ID ${peerId}`);
    
    // Create a new peer connection if one doesn't exist
    // This helps with reconnection scenarios
    try {
      console.log(`Creating new peer connection for peer ${peerId} to add ICE candidate`);
      
      // Store the candidate temporarily
      const pendingCandidate = new RTCIceCandidate(candidate);
      
      // Try to infer the call type from the candidate
      const inferredCallType = 
        candidate.candidate && candidate.candidate.toLowerCase().includes('video') ? 'video' : 'audio';
      
      // Create a new connection with the inferred call type
      const newPeerConnection = createPeerConnection(peerId, inferredCallType, false);
      
      // We can't add ICE candidates until we have a remote description
      // So we'll store the candidate and let the next handleOffer/handleAnswer set it
      console.log(`Storing ICE candidate for later use with peer ${peerId} as we have no remote description yet`);
      
      // Add a handler to apply the candidate once we get a remote description
      const originalSetRemoteDescription = newPeerConnection.setRemoteDescription.bind(newPeerConnection);
      newPeerConnection.setRemoteDescription = async function(description) {
        await originalSetRemoteDescription(description);
        try {
          await newPeerConnection.addIceCandidate(pendingCandidate);
          console.log(`Applied stored ICE candidate after setting remote description for peer ${peerId}`);
        } catch (innerError) {
          console.error(`Failed to apply stored ICE candidate for peer ${peerId}:`, innerError);
        }
      };
      
      return;
    } catch (error) {
      console.error(`Failed to create new peer connection for peer ${peerId}:`, error);
      throw new Error(`No peer connection found for peer ID ${peerId} and failed to create a new one`);
    }
  }
  
  try {
    // Check connection state before adding
    if (peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
      console.warn(`Trying to add ICE candidate to a ${peerConnection.connectionState} connection for peer ${peerId}`);
    }
    
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log(`Successfully added ICE candidate for peer ${peerId}`);
  } catch (error) {
    console.error(`Error adding ICE candidate for peer ${peerId}:`, error);
    
    // Try to recover by recreating the connection if it's in a bad state
    if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'closed') {
      console.log(`Attempting to recover failed connection with peer ${peerId}`);
      removePeerConnection(peerId);
      // Let the caller handle reconnection
    }
    
    throw error;
  }
};

// Event handlers
type IceCandidateHandler = (peerId: number, candidate: RTCIceCandidate) => void;
let onIceCandidateHandler: IceCandidateHandler | null = null;

export const setOnIceCandidate = (handler: IceCandidateHandler): void => {
  onIceCandidateHandler = handler;
};

export const setOnRemoteStream = (handler: (stream: MediaStream, peerId: number) => void): void => {
  onRemoteStreamHandler = handler;
};

export const setOnConnectionStateChange = (handler: (state: RTCPeerConnectionState, peerId: number) => void): void => {
  onConnectionStateChangeHandler = handler;
};

// Get local stream
export const getLocalStream = (): MediaStream | null => {
  return localStream;
};

// Get remote stream for a specific peer
export const getRemoteStream = (peerId: number): MediaStream | undefined => {
  return peerConnections.find(pc => pc.peerId === peerId)?.mediaStream;
};

// Get media status
export const getMediaStatus = (): MediaConfig => {
  return localMediaConfig;
};

// Get diagnostic information for connections
export const getConnectionDiagnostics = (): Record<string, any>[] => {
  return peerConnections.map(connection => {
    const { peerId, createdAt, lastIceCandidate, connectionState, iceConnectionState, signalingState, callType, isOfferer } = connection;
    
    // Extract basic information about the connection
    const diagnostics: Record<string, any> = {
      peerId,
      createdAt: createdAt.toISOString(),
      lastIceCandidate: lastIceCandidate ? lastIceCandidate.toISOString() : null,
      age: Math.round((Date.now() - createdAt.getTime()) / 1000),
      connectionState,
      iceConnectionState,
      signalingState,
      callType,
      isOfferer,
      hasRemoteStream: !!connection.mediaStream,
    };
    
    // Add track information if available
    if (connection.connection) {
      const senders = connection.connection.getSenders();
      const receivers = connection.connection.getReceivers();
      
      diagnostics.senders = senders.map(sender => ({
        kind: sender.track?.kind || 'unknown',
        enabled: sender.track?.enabled || false,
        muted: sender.track?.muted || false,
        readyState: sender.track?.readyState || 'unknown',
      }));
      
      diagnostics.receivers = receivers.map(receiver => ({
        kind: receiver.track?.kind || 'unknown',
        enabled: receiver.track?.enabled || false,
        muted: receiver.track?.muted || false,
        readyState: receiver.track?.readyState || 'unknown',
      }));
      
      // Add ICE data
      const iceTransport = connection.connection.getConfiguration();
      diagnostics.iceServers = iceTransport.iceServers?.map(server => ({ 
        urls: server.urls,
        username: server.username || null,
      }));
    }
    
    return diagnostics;
  });
};

// Log detailed connection state
export const logConnectionState = (peerId?: number): void => {
  console.group('WebRTC Connection State');
  
  if (peerId !== undefined) {
    // Log specific connection
    const connection = peerConnections.find(pc => pc.peerId === peerId);
    if (connection) {
      console.log(`Connection with peer ${peerId}:`, {
        connectionState: connection.connectionState,
        iceConnectionState: connection.iceConnectionState,
        signalingState: connection.signalingState,
        callType: connection.callType,
        isOfferer: connection.isOfferer,
        createdAt: connection.createdAt.toISOString(),
        age: Math.round((Date.now() - connection.createdAt.getTime()) / 1000) + ' seconds',
      });
    } else {
      console.log(`No connection found for peer ${peerId}`);
    }
  } else {
    // Log all connections
    console.log(`Active connections: ${peerConnections.length}`);
    peerConnections.forEach(connection => {
      console.log(`Peer ${connection.peerId}:`, {
        connectionState: connection.connectionState,
        iceConnectionState: connection.iceConnectionState,
        signalingState: connection.signalingState,
        callType: connection.callType,
        isOfferer: connection.isOfferer,
        hasRemoteStream: !!connection.mediaStream,
        createdAt: connection.createdAt.toISOString(),
        age: Math.round((Date.now() - connection.createdAt.getTime()) / 1000) + ' seconds',
      });
    });
  }
  
  // Log local media state
  if (localStream) {
    console.log('Local media tracks:', localStream.getTracks().map(track => ({
      kind: track.kind,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
    })));
  } else {
    console.log('No local media stream available');
  }
  
  // Get WebSocket state information from websocket.ts
  try {
    const wsConnections = {
      legacy: ws ? ws.readyState : 'not initialized',
      chat: chatWs ? chatWs.readyState : 'not initialized',
      voice: voiceWs ? voiceWs.readyState : 'not initialized',
      video: videoWs ? videoWs.readyState : 'not initialized',
    };
    
    const wsStateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
    
    console.log('Call WebSocket connections:', {
      // Convert readyState numbers to names for better debugging
      legacy: typeof wsConnections.legacy === 'number' ? 
        wsStateNames[wsConnections.legacy] : wsConnections.legacy,
      chat: typeof wsConnections.chat === 'number' ? 
        wsStateNames[wsConnections.chat] : wsConnections.chat,
      voice: typeof wsConnections.voice === 'number' ? 
        wsStateNames[wsConnections.voice] : wsConnections.voice,
      video: typeof wsConnections.video === 'number' ? 
        wsStateNames[wsConnections.video] : wsConnections.video,
    });
  } catch (e) {
    console.error('Could not access WebSocket state information:', e);
  }
  
  console.groupEnd();
};
