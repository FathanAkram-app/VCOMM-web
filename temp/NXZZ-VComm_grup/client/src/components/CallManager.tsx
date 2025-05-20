import { useEffect } from "react";
import { useCall } from "../hooks/useCall";
import useGroupCall from "../hooks/useGroupCall";
import VideoCall from "./VideoCall";
import AudioCall from "./AudioCall";
import GroupVideoCall from "./GroupVideoCall";
import IncomingCallModal from "./IncomingCallModal";
import GroupCallManager from "./GroupCallManager";

/**
 * CallManager Component
 * 
 * This component intelligently routes between video and audio call interfaces
 * based on the active call type. It also handles displaying the incoming call modal
 * when there's an incoming call but no active call yet.
 */
export default function CallManager() {
  const { activeCall, incomingCall } = useCall();
  const { activeGroupCall } = useGroupCall();
  
  // Debug log to check call state
  useEffect(() => {
    console.log("[CallManager] Current call state:", { 
      activeCall, 
      incomingCall,
      hasActiveGroupCall: !!activeGroupCall
    });
  }, [activeCall, incomingCall, activeGroupCall]);
  
  // Priority 1: Show active group call if exists
  if (activeGroupCall) {
    console.log("[CallManager] Rendering group call interface for activeGroupCall:", activeGroupCall);
    console.log("[CallManager] With activeCall:", activeCall);
    
    // IMPORTANT FIX: Be explicit about the group call type to ensure correct display
    // Adding comprehensive logs to diagnose call type issues
    console.log(`[CallManager] Active group call type: ${activeGroupCall.callType}`);
    console.log(`[CallManager] Explicitly checking for video call type: ${activeGroupCall.callType === 'video'}`);
    
    // CRITICAL FIX: Force the display of GroupVideoCall for video call type
    // For active video group calls, always show the video interface
    if (activeGroupCall.callType === 'video') {
      console.log("[CallManager] ✓ CONFIRMED: Rendering GROUP VIDEO CALL interface");
      console.log("[CallManager] Group call details:", {
        id: activeGroupCall.id,
        name: activeGroupCall.name,
        callType: activeGroupCall.callType,
        isActive: activeGroupCall.isActive,
        memberCount: activeGroupCall.members.length
      });
      
      // Additional debug information if activeCall exists
      if (activeCall) {
        console.log("[CallManager] Group VIDEO call with activeCall:", {
          callType: activeCall.callType,
          isRoom: activeCall.isRoom,
          videoEnabled: activeCall.videoEnabled,
          hasLocalStream: !!activeCall.localStream,
          remoteStreamsCount: activeCall.remoteStreams.size
        });
      }
      
      return (
        <div className="fixed inset-0 z-50 bg-background">
          <GroupVideoCall />
        </div>
      );
    }
    
    // If we reach here, it's either an audio group call or we need to show the management interface
    console.log("[CallManager] Rendering GroupCallManager for audio call or management");
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <GroupCallManager />
      </div>
    );
  }
  
  // Priority 2: Render incoming call modal if there's an incoming call and no active call
  if (incomingCall && !activeCall) {
    console.log("[CallManager] Rendering incoming call modal");
    return (
      <div className="fixed inset-0 z-50">
        <IncomingCallModal />
      </div>
    );
  }
  
  // Priority 3: Route to the appropriate call interface based on call type
  if (activeCall) {
    console.log("[CallManager] Rendering active call interface for:", activeCall.callType);
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {activeCall.callType === 'video' ? <VideoCall /> : <AudioCall />}
      </div>
    );
  }
  
  // Nothing to render if no call is active or incoming
  console.log("[CallManager] No active or incoming call to render");
  return null;
}