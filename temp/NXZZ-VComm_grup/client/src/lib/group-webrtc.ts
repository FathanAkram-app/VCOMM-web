// Group WebRTC functions
import { 
  createOffer, 
  removePeerConnection, 
  closeAllConnections, 
  initializeLocalMedia,
  handleOffer,
  handleAnswer,
  addIceCandidate,
  getLocalStream
} from './webrtc';
import { 
  sendGroupCallOffer, 
  sendGroupCallAnswer, 
  sendGroupCallIceCandidate,
  sendGroupCallUserJoined,
  sendGroupCallUserLeft
} from './websocket';

// Flag to use the server-managed approach for group calls
const USE_SERVER_MANAGED_CALLS = true;

// Interface to match PeerConnection in webrtc.ts
interface PeerConnection {
  peerId: number;
  connection: RTCPeerConnection;
}

// Stub for peerConnections to avoid TypeScript errors
const peerConnections: PeerConnection[] = [];

// Definition for group member
interface GroupMember {
  id: number;
  connected: boolean;
}

// State
let groupCallMembers: GroupMember[] = [];
let onGroupOfferCreatedHandler: ((peerId: number, offer: RTCSessionDescriptionInit, isRoom: boolean) => void) | null = null;
let currentUserId: number = 0; // Store the current user's ID

// Initialize group call connections with optimizations for call type
export const initializeGroupCall = async (memberIds: number[], selfId: number, callType: 'audio' | 'video') => {
  // Enhanced logging for debugging call initialization
  if (callType === 'video') {
    console.log(`[GroupRTC] 🎥 Initializing VIDEO group call with ${memberIds.length} members`, memberIds);
    console.log(`[GroupRTC] 🎥 VIDEO CALL TYPE VERIFICATION: callType=${callType}`);
  } else {
    console.log(`[GroupRTC] 🔈 Initializing AUDIO-ONLY group call with ${memberIds.length} members`, memberIds);
  }
  
  // Store the current user's ID for proper peer connection management
  currentUserId = selfId;
  
  // Initialize the group members array (exclude self to avoid circular connections)
  groupCallMembers = memberIds
    .filter(id => id !== selfId) // Don't include self in connection list
    .map(id => ({
      id,
      connected: false
    }));
  
  console.log('[GroupRTC] Group call members initialized:', groupCallMembers);

  // Initialize local media with appropriate configuration for call type
  try {
    // Video-specific setup for group calls
    if (callType === 'video') {
      console.log(`[GroupRTC] 🎥 Initializing VIDEO local media for tactical group video call`);
      console.log(`[GroupRTC] 🎥 VIDEO CALL MEDIA CONFIG: video=true, audio=true, portraitMode=true`);
    } else {
      console.log(`[GroupRTC] Initializing local media for audio group tactical call`);
    }
    
    // For voice tactical calls, we'll use enhanced audio settings
    // For video tactical calls, we'll include both audio and video with portrait mode
    const stream = await initializeLocalMedia({
      audio: true,
      video: callType === 'video'
    }, callType === 'video'); // Enable portrait mode (9:16) for video calls
    
    // Log detailed info about initialized media tracks
    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    
    console.log(`[GroupRTC] Local media initialized for ${callType} group tactical call:`);
    console.log(`[GroupRTC] - Audio tracks: ${audioTracks.length} (${audioTracks.map(t => t.label).join(', ')})`);
    
    if (callType === 'video') {
      console.log(`[GroupRTC] - Video tracks: ${videoTracks.length} (${videoTracks.map(t => t.label).join(', ')})`);
    }
    
    // For audio tracks, log detailed audio settings to help with debugging
    audioTracks.forEach(track => {
      if (track.getSettings) {
        const settings = track.getSettings();
        console.log(`[GroupRTC] Audio track settings for ${track.label}:`, settings);
      }
      
      if (track.getConstraints) {
        const constraints = track.getConstraints();
        console.log(`[GroupRTC] Audio track constraints for ${track.label}:`, constraints);
      }
    });
    
    // Verify we have appropriate tracks for this call type
    if (audioTracks.length === 0) {
      console.warn('[GroupRTC] No audio tracks available for tactical group call - microphone might not be accessible');
      throw new Error('No microphone access for tactical voice communications');
    }
    
    if (callType === 'video' && videoTracks.length === 0) {
      console.warn('[GroupRTC] No video tracks available for video group call - camera might not be accessible');
      // For video calls, we should have video tracks, but don't throw an error
      // Instead, continue with audio-only but log the issue
      console.error('[GroupRTC] Continuing with audio-only mode due to missing video tracks');
    }
    
    console.log(`[GroupRTC] Successfully initialized local media for ${callType} group tactical call`);
  } catch (error) {
    console.error(`[GroupRTC] Error initializing local media for ${callType} group tactical call:`, error);
    throw error;
  }
};

// Register offer handler (legacy approach - use WebSocket signaling instead)
export const setOnGroupOfferCreated = (handler: (peerId: number, offer: RTCSessionDescriptionInit, isRoom: boolean) => void) => {
  onGroupOfferCreatedHandler = handler;
};

// Add a member to the group call
export const addGroupCallMember = (memberId: number) => {
  console.log(`[GroupRTC] Adding member ${memberId} to group call`);
  
  // Check if member already exists
  const existingMember = groupCallMembers.find(m => m.id === memberId);
  if (existingMember) {
    console.log(`[GroupRTC] Member ${memberId} already in group call`);
    return;
  }
  
  // Add member to group
  groupCallMembers.push({
    id: memberId,
    connected: false
  });
  
  console.log('[GroupRTC] Updated group call members:', groupCallMembers);
};

// Remove a member from the group call
export const removeGroupCallMember = (memberId: number) => {
  console.log(`[GroupRTC] Removing member ${memberId} from group call`);
  
  // Check if member exists
  const memberIndex = groupCallMembers.findIndex(m => m.id === memberId);
  if (memberIndex === -1) {
    console.log(`[GroupRTC] Member ${memberId} not found in group call`);
    return;
  }
  
  // Close connection to this member
  const peerConn = peerConnections.find((pc: PeerConnection) => pc.peerId === memberId);
  if (peerConn) {
    try {
      peerConn.connection.close();
      console.log(`[GroupRTC] Closed connection with group member ${memberId}`);
    } catch (error) {
      console.error(`[GroupRTC] Error closing connection with group member ${memberId}:`, error);
    }
    
    // Remove from peerConnections
    removePeerConnection(memberId);
  }
  
  // Remove member from group
  groupCallMembers.splice(memberIndex, 1);
  
  console.log('[GroupRTC] Updated group call members:', groupCallMembers);
};

// Update group call member connection status
export const updateGroupCallMemberStatus = (memberId: number, connected: boolean) => {
  console.log(`[GroupRTC] Updating group call member ${memberId} status: connected=${connected}`);
  
  // Update member status
  const member = groupCallMembers.find(m => m.id === memberId);
  if (member) {
    member.connected = connected;
    console.log(`[GroupRTC] Updated group call member ${memberId} status to connected=${connected}`);
  } else {
    console.log(`[GroupRTC] Member ${memberId} not found in group call`);
  }
};

// Get all group call members
export const getGroupCallMembers = () => {
  return [...groupCallMembers];
};

// Removed duplicate imports

// Create connections to all group members
export const connectToGroupMembers = async (callType: 'video' | 'audio', roomId: number) => {
  // Enhanced logging for video calls
  if (callType === 'video') {
    console.log(`[GroupRTC] 🎥 Connecting to ${groupCallMembers.length} group members for VIDEO call in room ${roomId}`);
    console.log(`[GroupRTC] 🎥 VIDEO CALL: Ensuring media configuration is correct for video`);
    
    // SPECIAL HANDLING FOR VIDEO: Verify that local media stream has video tracks
    // If we're in a video call, make sure we have a video track
    // We'll use the exposed getLocalStream function from webrtc.ts
    const localStream = getLocalStream();
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log(`[GroupRTC] 🎥 Local stream has ${videoTracks.length} video tracks and ${localStream.getAudioTracks().length} audio tracks`);
      
      if (videoTracks.length === 0) {
        console.warn(`[GroupRTC] ⚠️ VIDEO CALL BUT NO VIDEO TRACKS FOUND! Re-initializing local media...`);
        
        // Try to initialize local media again with explicit video=true
        try {
          // This will reinitialize our localStream with video
          await initializeLocalMedia({
            audio: true,
            video: true
          }, true); // true for portrait mode
          
          // Verify we got video tracks this time
          const newLocalStream = getLocalStream();
          if (newLocalStream) {
            const newVideoTracks = newLocalStream.getVideoTracks();
            console.log(`[GroupRTC] 🎥 Re-initialized stream now has ${newVideoTracks.length} video tracks`);
            
            if (newVideoTracks.length === 0) {
              console.warn(`[GroupRTC] ⚠️ Still no video tracks after re-initialization - continuing with audio only`);
            } else {
              console.log(`[GroupRTC] ✓ Successfully added video tracks for video call`);
            }
          }
        } catch (error) {
          console.error(`[GroupRTC] Failed to re-initialize local media with video:`, error);
        }
      } else {
        // Make sure video tracks are enabled
        videoTracks.forEach((track: MediaStreamTrack) => {
          track.enabled = true;
          console.log(`[GroupRTC] ✓ Verified video track is enabled: ${track.label}`);
        });
      }
    } else {
      console.warn(`[GroupRTC] ⚠️ No local stream available for video call! This will cause issues.`);
    }
  } else {
    console.log(`[GroupRTC] 🔈 Connecting to ${groupCallMembers.length} group members for AUDIO call in room ${roomId}`);
  }
  
  // Notify that the user has joined the call via the WebSocket server
  await sendGroupCallUserJoined(roomId, currentUserId, callType);
  
  if (USE_SERVER_MANAGED_CALLS) {
    console.log(`[GroupRTC] Using server-managed approach for group ${callType} call in room ${roomId}`);
    
    // With server-managed calls, we wait for peer offers
    // The server keeps track of active participants and manages the signaling
    console.log(`[GroupRTC] Waiting for group call connection events from server`);
    
    // Query active participants in this room's call via API
    // Enhanced with allowCreate parameter to support new rooms
    try {
      // Include allowCreate and callType parameters to ensure the API can create a placeholder
      // if the room doesn't exist yet or if we're the first to join this call
      const response = await fetch(`/api/rooms/${roomId}/active-call?allowCreate=true&callType=${callType}`);
      
      if (response.ok) {
        const callInfo = await response.json();
        console.log(`[GroupRTC] Successfully retrieved active call info for room ${roomId}:`, callInfo);
        
        // Verify we got the right call type - critical for video calls
        if (callInfo.callType !== callType) {
          console.warn(`[GroupRTC] Call type mismatch: requested ${callType} but got ${callInfo.callType}`);
          console.log(`[GroupRTC] Will proceed with the requested ${callType} call type`);
          // We'll continue with our requested type - this helps ensure video calls stay video
        }
        
        // Extract participants (excluding self)
        const participants = callInfo.participants.filter((p: any) => p.userId !== currentUserId);
        console.log(`[GroupRTC] Found ${participants.length} other participants in call:`, 
          participants.map((p: any) => p.userId));
        
        // Update our local tracking of group members
        for (const participant of participants) {
          const existingMember = groupCallMembers.find(m => m.id === participant.userId);
          if (!existingMember) {
            groupCallMembers.push({
              id: participant.userId,
              connected: false
            });
          }
        }
        
        // We don't initiate connections immediately - we'll wait for the server 
        // to tell existing participants about us, and they'll send us offers
      } else {
        // This case should be rare now with our improved API endpoint
        console.warn(`[GroupRTC] Error retrieving active call info: ${response.status} ${response.statusText}`);
        console.log(`[GroupRTC] Will proceed with client-side group member list as fallback`);
        console.log(`[GroupRTC] Using client-side group member list: ${groupCallMembers.length} members`);
      }
    } catch (error) {
      console.error(`[GroupRTC] Error retrieving active call info for room ${roomId}:`, error);
    }
  } else {
    // Legacy peer-to-peer approach (direct connections to all members)
    // For each member, create a peer connection and send offer
    for (const member of groupCallMembers) {
      // Skip already connected members
      if (member.connected) {
        console.log(`[GroupRTC] Member ${member.id} already connected, skipping`);
        continue;
      }
      
      try {
        console.log(`[GroupRTC] Creating ${callType} offer for group member ${member.id}`);
        
        // Create the WebRTC offer with proper audio/video configuration
        const offer = await createOffer(member.id, callType);
      
        // Log details about the connection before sending
        const pc = peerConnections.find(pc => pc.peerId === member.id);
        if (pc) {
          const senders = pc.connection.getSenders();
          console.log(`[GroupRTC] Connection has ${senders.length} sender tracks:`, 
            senders.map(s => s.track ? `${s.track.kind} (${s.track.label})` : 'null track'));
        }
      
        // Send the offer through the WebSocket signaling channel
        await sendGroupCallOffer(roomId, member.id, offer.sdp || '', callType);
        
        // Legacy approach - notify handlers about the offer
        if (onGroupOfferCreatedHandler && offer) {
          onGroupOfferCreatedHandler(member.id, offer, true);
        }
        
        // Mark as connection in progress
        member.connected = true;
        
        console.log(`[GroupRTC] Successfully created ${callType} offer for group member ${member.id}`);
      } catch (error) {
        console.error(`[GroupRTC] Failed to create ${callType} offer for group member ${member.id}:`, error);
      }
    }
  }
  
  console.log('[GroupRTC] Group connection process initiated');
};

// Reset group call state
export const resetGroupCall = () => {
  console.log('[GroupRTC] Resetting group call state');
  groupCallMembers = [];
  closeAllConnections();
};

// Handle an incoming group call offer
export const handleGroupCallOffer = async (
  roomId: number,
  peerId: number,
  sdp: string,
  callType: 'video' | 'audio'
): Promise<void> => {
  console.log(`[GroupRTC] Received group ${callType} call offer from peer ${peerId} in room ${roomId}`);
  
  // Create a session description from the SDP
  const offer: RTCSessionDescriptionInit = {
    type: 'offer',
    sdp
  };
  
  try {
    console.log(`[GroupRTC] Processing ${callType} offer from peer ${peerId}`);
    
    // Handle the offer and generate an answer
    const answer = await handleOffer(peerId, offer, callType);
    
    // Log details about the connection after handling offer
    const pc = peerConnections.find(pc => pc.peerId === peerId);
    if (pc) {
      const senders = pc.connection.getSenders();
      const receivers = pc.connection.getReceivers();
      
      console.log(`[GroupRTC] Connection has ${senders.length} sender track(s):`, 
        senders.map(s => s.track ? `${s.track.kind} (${s.track.label})` : 'null track'));
      console.log(`[GroupRTC] Connection has ${receivers.length} receiver track(s):`, 
        receivers.map(r => r.track ? `${r.track.kind} (${r.track.label})` : 'null track'));
    }
    
    // Send the answer via WebSocket
    await sendGroupCallAnswer(roomId, peerId, answer.sdp || '', callType);
    
    console.log(`[GroupRTC] Successfully sent group ${callType} call answer to peer ${peerId} in room ${roomId}`);
  } catch (error) {
    console.error(`[GroupRTC] Error handling group ${callType} call offer:`, error);
  }
};

// Handle an incoming group call answer
export const handleGroupCallAnswer = async (
  roomId: number,
  peerId: number,
  sdp: string,
  callType: 'video' | 'audio'
): Promise<void> => {
  console.log(`[GroupRTC] Received group ${callType} call answer from peer ${peerId} in room ${roomId}`);
  
  // Create a session description from the SDP
  const answer: RTCSessionDescriptionInit = {
    type: 'answer',
    sdp
  };
  
  try {
    console.log(`[GroupRTC] Processing ${callType} answer from peer ${peerId}`);
    
    // Apply the answer to the peer connection
    await handleAnswer(peerId, answer, callType);
    
    // Log connection state after applying answer
    const pc = peerConnections.find(pc => pc.peerId === peerId);
    if (pc) {
      console.log(`[GroupRTC] Connection state after applying answer: 
        - Connection state: ${pc.connection.connectionState}
        - ICE connection state: ${pc.connection.iceConnectionState}
        - Signaling state: ${pc.connection.signalingState}`);
      
      // Log connection diagnostics on this peer connection
      const conn = peerConnections.find(pc => pc.peerId === peerId);
      if (conn) {
        console.log(`[GroupRTC] Connection diagnostics for peer ${peerId}:
          - Connection state: ${conn.connection.connectionState}
          - ICE connection state: ${conn.connection.iceConnectionState}
          - Signaling state: ${conn.connection.signalingState}
          - Call type: ${callType}`);
      }
    }
    
    console.log(`[GroupRTC] Successfully processed group ${callType} call answer from peer ${peerId} in room ${roomId}`);
  } catch (error) {
    console.error(`[GroupRTC] Error handling group ${callType} call answer:`, error);
  }
};

// Handle an incoming group call ICE candidate
export const handleGroupCallIceCandidate = async (
  roomId: number,
  peerId: number,
  candidate: RTCIceCandidateInit,
  callType: 'video' | 'audio'
): Promise<void> => {
  console.log(`[GroupRTC] Received group ${callType} call ICE candidate from peer ${peerId} in room ${roomId}`);
  
  try {
    // Add the ICE candidate to the peer connection
    await addIceCandidate(peerId, candidate);
    
    console.log(`[GroupRTC] Successfully added ICE candidate for peer ${peerId} in room ${roomId}`);
  } catch (error) {
    console.error(`[GroupRTC] Error adding ICE candidate for peer ${peerId}:`, error);
  }
};

// Leave group call
export const leaveGroupCall = async (roomId?: number, callType?: 'video' | 'audio') => {
  console.log(`[GroupRTC] Leaving group call. Room ID: ${roomId}, Call Type: ${callType}`);
  
  // Make sure we have valid parameters
  if (roomId !== undefined && callType !== undefined) {
    // Notify other users that we're leaving the call
    try {
      await sendGroupCallUserLeft(roomId, currentUserId, callType);
      console.log(`[GroupRTC] Sent group call user left notification for room ${roomId}`);
    } catch (error) {
      console.error('[GroupRTC] Error sending group call user left notification:', error);
    }
  } else {
    console.warn('[GroupRTC] Missing parameters for full leave notification, performing local cleanup only');
  }
  
  // Reset local state regardless of notification success
  resetGroupCall();
};