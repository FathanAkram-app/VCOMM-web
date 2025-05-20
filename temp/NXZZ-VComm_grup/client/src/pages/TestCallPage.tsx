import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useCall } from '@/hooks/useCall';
import useGroupCall from '@/hooks/useGroupCall';
import { useToast } from '@/hooks/use-toast';

/**
 * TestCallPage
 * 
 * A testing page for video and audio calls with debugging tools.
 * This helps identify issues with group calls by providing direct options
 * to initiate different call scenarios.
 */
export default function TestCallPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  
  // Call hooks
  const { activeCall, hangupCall } = useCall();
  const { 
    availableGroups, 
    activeGroupCall, 
    createGroupCall, 
    joinGroupCall, 
    leaveGroupCall 
  } = useGroupCall();
  
  // State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('TEST-GROUP-1');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(
    availableGroups.length > 0 ? availableGroups[0].id : null
  );
  
  // Log call state for debugging
  useEffect(() => {
    console.log('[TestCallPage] Active call state:', activeCall);
    console.log('[TestCallPage] Active group call state:', activeGroupCall);
    console.log('[TestCallPage] Available groups:', availableGroups);

    // Enhanced diagnostics for video call state
    if (activeGroupCall && activeGroupCall.callType === 'video') {
      console.log(`[TestCallPage] 🎥 ACTIVE VIDEO GROUP CALL DIAGNOSTICS:`);
      console.log(`[TestCallPage] 🎥 Video Group ID: ${activeGroupCall.id}`);
      console.log(`[TestCallPage] 🎥 Video Group Name: ${activeGroupCall.name}`);
      console.log(`[TestCallPage] 🎥 Video Group Creator: ${activeGroupCall.creatorId}`);
      console.log(`[TestCallPage] 🎥 Video Group Members (${activeGroupCall.members.length}):`, 
        activeGroupCall.members.map(m => ({
          id: m.id,
          username: m.username,
          isActive: m.isActive,
          isOnline: m.isOnline,
          isMuted: m.isMuted,
          hasJoined: m.hasJoined
        }))
      );
      
      // Check WebRTC status from the imported library
      if (typeof window !== 'undefined') {
        // Import WebRTC debugging functions only on client-side
        import('../lib/webrtc').then(webrtc => {
          try {
            const diagnostics = webrtc.getConnectionDiagnostics();
            console.log(`[TestCallPage] 🎥 WebRTC Connection Diagnostics:`, diagnostics);
            
            // Log media status
            const mediaStatus = webrtc.getMediaStatus();
            console.log(`[TestCallPage] 🎥 Media Status: audio=${mediaStatus.audio}, video=${mediaStatus.video}`);
            
            // Log local stream info if available
            const localStream = webrtc.getLocalStream();
            if (localStream) {
              console.log(`[TestCallPage] 🎥 Local Stream:`, {
                audioTracks: localStream.getAudioTracks().length,
                videoTracks: localStream.getVideoTracks().length,
                trackDetails: localStream.getTracks().map(t => ({
                  kind: t.kind,
                  label: t.label,
                  enabled: t.enabled,
                  muted: t.muted,
                  readyState: t.readyState
                }))
              });
            } else {
              console.warn(`[TestCallPage] ⚠️ No local media stream available for video call!`);
            }
          } catch (error) {
            console.error(`[TestCallPage] Error getting WebRTC diagnostics:`, error);
          }
        });
      }
    }
  }, [activeCall, activeGroupCall, availableGroups]);
  
  // Create a new group (test only)
  const handleCreateGroup = async (callType: 'audio' | 'video') => {
    try {
      setIsCreatingGroup(true);
      
      // Enhanced logging for video calls
      if (callType === 'video') {
        console.log(`[TestCallPage] 🎥 Creating VIDEO test group: ${groupName}`);
        console.log(`[TestCallPage] 🎥 VIDEO CALL: Explicitly setting callType="video"`);
      } else {
        console.log(`[TestCallPage] Creating audio test group: ${groupName}`);
      }
      
      await createGroupCall(groupName, [], callType);
      
      // Post-creation verification
      if (callType === 'video' && activeGroupCall) {
        console.log(`[TestCallPage] 🎥 VIDEO group creation verification:`, {
          wasCreatedAsVideoCall: activeGroupCall.callType === 'video',
          actualCallType: activeGroupCall.callType,
          groupId: activeGroupCall.id,
          groupName: activeGroupCall.name
        });
      }
      
      toast({
        title: 'Test Group Created',
        description: `Created test ${callType} group: ${groupName}`,
      });
    } catch (error) {
      console.error('Error creating test group:', error);
      toast({
        title: 'Group Creation Failed',
        description: 'Could not create test group',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };
  
  // Join an existing group
  const handleJoinGroup = async () => {
    if (!selectedGroupId) {
      toast({
        title: 'No Group Selected',
        description: 'Please select a group to join',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await joinGroupCall(selectedGroupId);
      toast({
        title: 'Joined Test Group',
        description: 'Successfully joined test group',
      });
    } catch (error) {
      console.error('Error joining test group:', error);
      toast({
        title: 'Failed to Join Group',
        description: 'Could not join test group',
        variant: 'destructive',
      });
    }
  };
  
  // Create and auto-join group
  const handleCreateAndJoin = async (callType: 'audio' | 'video') => {
    try {
      setIsCreatingGroup(true);
      
      // Enhanced logging for video calls
      if (callType === 'video') {
        console.log(`[TestCallPage] 🎥 Creating & joining VIDEO test group: ${groupName}`);
        console.log(`[TestCallPage] 🎥 VIDEO CALL (auto-join): Explicitly setting callType="video"`);
        
        // For video calls, pre-initialize media to ensure video tracks are ready
        try {
          // Import WebRTC module for media initialization
          const webrtc = await import('../lib/webrtc');
          console.log(`[TestCallPage] 🎥 Pre-initializing video media BEFORE creating group call`);
          
          // Initialize local media with video enabled in portrait mode
          const stream = await webrtc.initializeLocalMedia({
            audio: true,
            video: true
          }, true); // true = portrait mode
          
          // Verify we have video tracks
          const videoTracks = stream.getVideoTracks();
          console.log(`[TestCallPage] 🎥 Pre-initialized media has ${videoTracks.length} video tracks`);
          
          if (videoTracks.length === 0) {
            console.warn(`[TestCallPage] ⚠️ No video tracks after pre-initialization - will use fallback`);
          } else {
            console.log(`[TestCallPage] ✓ Successfully pre-initialized video media for test call`);
          }
        } catch (mediaError) {
          console.error(`[TestCallPage] Error pre-initializing video media:`, mediaError);
          console.log(`[TestCallPage] Will continue with group creation despite media error`);
        }
      } else {
        console.log(`[TestCallPage] Creating & joining audio test group: ${groupName}`);
      }
      
      // Create group call with appropriate call type
      console.log(`[TestCallPage] Creating group call with type="${callType}"`);
      await createGroupCall(groupName, [], callType);
      
      // Post-creation verification for video calls
      if (callType === 'video' && activeGroupCall) {
        console.log(`[TestCallPage] 🎥 VIDEO group auto-join verification:`, {
          wasCreatedAsVideoCall: activeGroupCall.callType === 'video',
          actualCallType: activeGroupCall.callType,
          groupId: activeGroupCall.id,
          groupName: activeGroupCall.name
        });
        
        // Add additional delay to ensure everything is initialized
        setTimeout(async () => {
          try {
            const webrtc = await import('../lib/webrtc');
            const localStream = webrtc.getLocalStream();
            if (localStream) {
              const videoTracks = localStream.getVideoTracks();
              console.log(`[TestCallPage] 🎥 Post-creation check: Local stream has ${videoTracks.length} video tracks and ${localStream.getAudioTracks().length} audio tracks`);
            }
          } catch (error) {
            console.error(`[TestCallPage] Error in post-creation check:`, error);
          }
        }, 1000);
      }
      
      // No need to explicitly join since createGroupCall already activates the call
      toast({
        title: 'Test Setup Complete',
        description: `Created and joined ${callType} group: ${groupName}`,
      });
    } catch (error) {
      console.error('Error in test setup:', error);
      toast({
        title: 'Test Setup Failed',
        description: 'Could not create and join test group',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingGroup(false);
    }
  };
  
  // Leave current group
  const handleLeaveGroup = async () => {
    try {
      await leaveGroupCall();
      hangupCall();
      toast({
        title: 'Left Test Group',
        description: 'Successfully left test group',
      });
    } catch (error) {
      console.error('Error leaving test group:', error);
      toast({
        title: 'Failed to Leave Group',
        description: 'Could not leave test group',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="p-4 max-w-2xl mx-auto my-8">
      <h1 className="text-2xl font-bold mb-6">Call Testing Tools</h1>
      
      {/* Current Call Status */}
      <div className="p-4 border rounded-md mb-6 bg-muted/20">
        <h2 className="text-lg font-semibold mb-2">Current Status</h2>
        <p className="mb-1">
          <strong>Active Call:</strong> {activeCall ? `${activeCall.callType} call with ${activeCall.peerName}` : 'None'}
        </p>
        <p className="mb-1">
          <strong>Group Call:</strong> {activeGroupCall ? `${activeGroupCall.callType} group: ${activeGroupCall.name}` : 'None'}
        </p>
        <p>
          <strong>Available Groups:</strong> {availableGroups.length} groups
        </p>
      </div>
      
      {/* Create Group Form */}
      <div className="p-4 border rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Create Test Group</h2>
        <div className="flex items-center gap-2 mb-4">
          <input 
            type="text" 
            value={groupName} 
            onChange={(e) => setGroupName(e.target.value)} 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Group Name"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleCreateGroup('audio')} 
            disabled={isCreatingGroup}
            variant="outline"
          >
            Create Audio Group
          </Button>
          <Button 
            onClick={() => handleCreateGroup('video')} 
            disabled={isCreatingGroup}
          >
            Create Video Group
          </Button>
        </div>
      </div>
      
      {/* Join Existing Group */}
      <div className="p-4 border rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Join Existing Group</h2>
        <div className="mb-4">
          <select 
            value={selectedGroupId || ''} 
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a group</option>
            {availableGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.callType})
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handleJoinGroup} disabled={!selectedGroupId}>
          Join Selected Group
        </Button>
      </div>
      
      {/* Quick Test Options */}
      <div className="p-4 border rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Quick Test</h2>
        <div className="flex gap-2 mb-4">
          <Button onClick={() => handleCreateAndJoin('audio')} variant="outline">
            Create & Join Audio Group
          </Button>
          <Button onClick={() => handleCreateAndJoin('video')}>
            Create & Join Video Group
          </Button>
        </div>
        
        {activeGroupCall && (
          <Button onClick={handleLeaveGroup} variant="destructive">
            Leave Current Group
          </Button>
        )}
      </div>
      
      <div className="mt-8 text-center">
        <Button onClick={() => navigate('/')} variant="outline">
          Return to Main App
        </Button>
      </div>
    </div>
  );
}