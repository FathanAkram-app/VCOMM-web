import { createContext, useState, useEffect, ReactNode, useContext } from "react";
import { User } from "@shared/schema";
import { useAuth } from "../hooks/use-auth";
import { useCall } from "../hooks/useCall";
import { useToast } from "../hooks/use-toast";
import { 
  initializeGroupCall, 
  connectToGroupMembers, 
  leaveGroupCall as leaveGroupCallRTC,
  addGroupCallMember as addGroupCallMemberRTC,
  removeGroupCallMember as removeGroupCallMemberRTC,
  setOnGroupOfferCreated,
  resetGroupCall,
  handleGroupCallOffer,
  handleGroupCallAnswer,
  handleGroupCallIceCandidate
} from "../lib/group-webrtc";
// We need to access the webrtc module's functions
let createOfferFunc: any;
import { 
  addEventListener, 
  removeEventListener,
  sendGroupCallOffer,
  sendGroupCallAnswer,
  sendGroupCallIceCandidate,
  sendGroupCallUserJoined,
  sendGroupCallUserLeft,
  endGroupCall
} from "../lib/websocket";

interface GroupMember {
  id: number;
  username: string;
  isActive: boolean;
  isOnline: boolean;
  isMuted: boolean;
  hasJoined: boolean;
}

interface GroupCall {
  id: number;
  callId?: number; // The ID of the call in the database (may be the same as room ID)
  name: string;
  creatorId: number;
  callType: 'audio' | 'video';
  isActive: boolean;
  startTime: Date;
  members: GroupMember[];
}

interface GroupCallContextProps {
  activeGroupCall: GroupCall | null;
  availableGroups: GroupCall[];
  isCreatingCall: boolean;
  createGroupCall: (name: string, initialMembers: number[], callType: 'audio' | 'video') => Promise<void>;
  joinGroupCall: (groupId: number) => Promise<void>;
  leaveGroupCall: () => Promise<void>;
  endGroupCallForAll: () => Promise<void>;
  addMemberToCall: (userId: number) => Promise<void>;
  removeMemberFromCall: (userId: number) => Promise<void>;
  toggleMemberMute: (userId: number) => Promise<void>;
}

export const GroupCallContext = createContext<GroupCallContextProps | undefined>(undefined);

export const GroupCallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { activeCall, startRoomCall, hangupCall } = useCall();
  const { toast } = useToast();
  
  // Initialize with mock data for testing purposes
  const mockGroups: GroupCall[] = [
    {
      id: 3001,
      name: "ALPHA SQUAD",
      creatorId: 1,
      callType: 'audio',
      isActive: true,
      startTime: new Date(),
      members: [
        { id: 1, username: "COMMANDER", isActive: true, isOnline: true, isMuted: false, hasJoined: true },
        { id: 2, username: "ALPHA1", isActive: false, isOnline: true, isMuted: false, hasJoined: false },
        { id: 3, username: "BRAVO2", isActive: false, isOnline: true, isMuted: false, hasJoined: false },
      ]
    },
    {
      id: 3002,
      name: "RECON TEAM",
      creatorId: 4,
      callType: 'video',
      isActive: true,
      startTime: new Date(),
      members: [
        { id: 4, username: "CHARLIE3", isActive: true, isOnline: true, isMuted: false, hasJoined: true },
        { id: 5, username: "DELTA4", isActive: false, isOnline: true, isMuted: false, hasJoined: false },
      ]
    }
  ];
  
  const [activeGroupCall, setActiveGroupCall] = useState<GroupCall | null>(null);
  const [availableGroups, setAvailableGroups] = useState<GroupCall[]>(mockGroups);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  
  // Monitor active call status to sync with group call state
  useEffect(() => {
    if (activeCall && activeCall.isRoom && activeGroupCall) {
      // Update group call with active call status
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          isActive: activeCall.status === 'connected' || activeCall.status === 'connecting',
        };
      });
    } else if (!activeCall && activeGroupCall?.isActive) {
      // If active call is gone but group call is still active, update state
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          isActive: false,
        };
      });
    }
  }, [activeCall, activeGroupCall]);
  
  // WebSocket event handlers for group call signaling
  useEffect(() => {
    // Handler for incoming group call offers
    const handleGroupCallOfferEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] Received group call offer from peer ${data.peerId} in room ${data.roomId}`);
      await handleGroupCallOffer(data.roomId, data.peerId, data.sdp, data.callType);
    };
    
    // Handler for incoming group call answers
    const handleGroupCallAnswerEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] Received group call answer from peer ${data.peerId} in room ${data.roomId}`);
      await handleGroupCallAnswer(data.roomId, data.peerId, data.sdp, data.callType);
    };
    
    // Handler for incoming ICE candidates
    const handleGroupCallIceCandidateEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] Received ICE candidate from peer ${data.peerId} in room ${data.roomId}`);
      await handleGroupCallIceCandidate(data.roomId, data.peerId, data.candidate, data.callType);
    };
    
    // Handler for user joining a group call
    const handleGroupCallUserJoinedEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] User ${data.userId} joined group call in room ${data.roomId}`);
      
      // Update member status to indicate they've joined
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        // Check if member already exists in our group
        const existingMember = prev.members.find(m => m.id === data.userId);
        
        if (existingMember) {
          // Update existing member
          return {
            ...prev,
            members: prev.members.map(member => {
              if (member.id === data.userId) {
                return {
                  ...member,
                  hasJoined: true,
                  isActive: true
                };
              }
              return member;
            })
          };
        } else {
          // Add new member to the group
          console.log(`[GroupCall] Adding new member ${data.userId} to active group call`);
          const newMember: GroupMember = {
            id: data.userId,
            username: data.username || `USER-${data.userId}`,
            isActive: true,
            isOnline: true,
            isMuted: false,
            hasJoined: true
          };
          
          return {
            ...prev,
            members: [...prev.members, newMember]
          };
        }
      });
      
      try {
        // If we're the initiator (creator), we should send an offer to the new participant
        if (user && activeGroupCall.creatorId === user.id && user.id !== data.userId) {
          console.log(`[GroupCall] We are the initiator. Creating connection to new member ${data.userId}`);
          
          // Add the new member to the WebRTC connections
          addGroupCallMemberRTC(data.userId);
          
          // With server-managed approach, we'll let the connectToGroupMembers function
          // handle creating offers to all participants including this new member
          console.log(`[GroupCall] Reconnecting to all group members including new member ${data.userId}`);
          
          // After a small delay to ensure the member has been processed
          setTimeout(async () => {
            try {
              // Connect to group members (this will use the server-managed approach)
              await connectToGroupMembers(activeGroupCall.callType, activeGroupCall.id);
            } catch (error) {
              console.error(`[GroupCall] Error connecting to new group member ${data.userId}:`, error);
            }
          }, 500);
        }
      } catch (error) {
        console.error(`[GroupCall] Error handling user joined event:`, error);
      }
      
      // Also notify in UI
      const joinedMember = activeGroupCall.members.find(m => m.id === data.userId);
      toast({
        title: "OPERATOR JOINED",
        description: `${joinedMember?.username || 'Unknown operator'} has joined the tactical group.`,
      });
    };
    
    // Handler for user leaving a group call
    const handleGroupCallUserLeftEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] User ${data.userId} left group call in room ${data.roomId}`);
      
      // Update member status to indicate they've left
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        const updatedMembers = prev.members.map(member => {
          if (member.id === data.userId) {
            return {
              ...member,
              hasJoined: false,
              isActive: false
            };
          }
          return member;
        });
        
        return {
          ...prev,
          members: updatedMembers
        };
      });
      
      // Also remove the member from the WebRTC connections
      removeGroupCallMemberRTC(data.userId);
      
      // Notify in UI
      const leftMember = activeGroupCall.members.find(m => m.id === data.userId);
      toast({
        title: "OPERATOR LEFT",
        description: `${leftMember?.username || 'Unknown operator'} has left the tactical group.`,
      });
    };
    
    // Handler for group call being ended
    const handleGroupCallEndedEvent = async (data: any) => {
      if (!activeGroupCall || activeGroupCall.id !== data.roomId) return;
      
      console.log(`[GroupCall] Group call ended in room ${data.roomId}`);
      
      // Store necessary info before clearing state
      const groupId = activeGroupCall.id;
      const callType = activeGroupCall.callType;
      
      // Reset the group WebRTC connections
      if (typeof leaveGroupCallRTC === 'function') {
        await leaveGroupCallRTC(groupId, callType);
      }
      
      // Reset group call state
      resetGroupCall();
      
      // Clear active group call
      setActiveGroupCall(null);
      
      // Show notification
      toast({
        title: "TACTICAL GROUP DISBANDED",
        description: `The tactical group has been disbanded by administrator.`,
      });
    };
    
    // Register event listeners
    addEventListener("group_call_offer", handleGroupCallOfferEvent);
    addEventListener("group_call_answer", handleGroupCallAnswerEvent);
    addEventListener("group_call_ice_candidate", handleGroupCallIceCandidateEvent);
    addEventListener("group_call_user_joined", handleGroupCallUserJoinedEvent);
    addEventListener("group_call_user_left", handleGroupCallUserLeftEvent);
    addEventListener("group_call_ended", handleGroupCallEndedEvent);
    
    // Clean up listeners on unmount
    return () => {
      removeEventListener("group_call_offer", handleGroupCallOfferEvent);
      removeEventListener("group_call_answer", handleGroupCallAnswerEvent);
      removeEventListener("group_call_ice_candidate", handleGroupCallIceCandidateEvent);
      removeEventListener("group_call_user_joined", handleGroupCallUserJoinedEvent);
      removeEventListener("group_call_user_left", handleGroupCallUserLeftEvent);
      removeEventListener("group_call_ended", handleGroupCallEndedEvent);
    };
  }, [activeGroupCall, toast, leaveGroupCallRTC, resetGroupCall, user, hangupCall]);
  
  // Create a new group call
  const createGroupCall = async (name: string, initialMembers: number[], callType: 'audio' | 'video') => {
    if (!user) return;
    
    try {
      setIsCreatingCall(true);
      
      // Add special logging for video calls to track issues
      if (callType === 'video') {
        console.log(`[GroupCall] 🎥 Creating new VIDEO tactical group "${name}" with ${initialMembers.length} initial members`);
        console.log(`[GroupCall] 🎥 VIDEO CALL: Explicitly setting callType="video"`);
      } else {
        console.log(`[GroupCall] Creating new AUDIO tactical group "${name}" with ${initialMembers.length} initial members`);
      }
      
      // Create a group call entity
      const newGroupCall: GroupCall = {
        id: Math.floor(Math.random() * 10000),
        name: name.toUpperCase(),
        creatorId: user.id,
        // Make absolutely sure we're using the correct call type
        callType: callType === 'video' ? 'video' : 'audio',
        isActive: false,
        startTime: new Date(),
        members: [
          // Add creator to the members list
          {
            id: user.id,
            username: user.username,
            isActive: true,
            isOnline: true,
            isMuted: false,
            hasJoined: true,
          },
          // Add initial members
          ...initialMembers.map(memberId => ({
            id: memberId,
            username: `USER-${memberId}`, // In real app, fetch usernames from API
            isActive: false,
            isOnline: true, // Placeholder - should be fetched from online status
            isMuted: false,
            hasJoined: false,
          })),
        ],
      };
      
      // Add to available groups
      setAvailableGroups(prev => [...prev, newGroupCall]);
      
      // Set as active group call
      setActiveGroupCall(newGroupCall);
      
      // Initialize WebRTC for group call
      console.log(`[GroupCall] Initializing WebRTC for group ${newGroupCall.id}`);
      // Create an array of all member IDs including the current user
      const allMemberIds = [user.id, ...initialMembers];
      
      // Enhanced logging for video calls
      if (callType === 'video') {
        console.log(`[GroupCall] 🎥 This is a VIDEO tactical group - ensuring video is properly configured`);
        console.log(`[GroupCall] 🎥 Created video group call with ID ${newGroupCall.id}, callType=${newGroupCall.callType}`);
        console.log(`[GroupCall] 🎥 Group call details: ${JSON.stringify({
          id: newGroupCall.id,
          name: newGroupCall.name,
          callType: newGroupCall.callType,
          memberCount: newGroupCall.members.length
        })}`);
      }
      
      // Initialize the group call WebRTC connections
      await initializeGroupCall(allMemberIds, user.id, callType);
      
      // Register offer handler to send offers via WebSocket signaling
      setOnGroupOfferCreated((peerId, offer, isRoom) => {
        console.log(`[GroupCall] Sending ${callType} offer to peer ${peerId} in room ${newGroupCall.id}`);
        
        // Format and send the SDP offer through our WebSocket channel
        sendGroupCallOffer(newGroupCall.id, peerId, JSON.stringify(offer), callType)
          .then(() => {
            console.log(`[GroupCall] Successfully sent ${callType} offer to peer ${peerId}`);
          })
          .catch(error => {
            console.error(`[GroupCall] Failed to send offer to peer ${peerId}:`, error);
            toast({
              title: "SIGNALING ERROR",
              description: "Failed to establish connection with operator.",
              variant: "destructive",
            });
          });
      });
      
      // Start the actual WebRTC call
      console.log(`[GroupCall] Starting WebRTC room call for group ${newGroupCall.id}`);
      await startRoomCall(newGroupCall.id, newGroupCall.name, callType);
      
      // Connect to all group members using WebRTC
      await connectToGroupMembers(callType, newGroupCall.id);
      
      // Update group call state to reflect call has started
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          isActive: true,
        };
      });
      
      toast({
        title: "TACTICAL GROUP CREATED",
        description: `Group ${name.toUpperCase()} has been established.`,
      });
      
      // For demo/testing - create initial call activity
      console.log(`[GroupCall] Tactical group ${newGroupCall.name} created successfully`);
      
      // Dispatch event to inform others
      window.dispatchEvent(new CustomEvent('group-call-created', { 
        detail: { 
          groupId: newGroupCall.id,
          groupName: newGroupCall.name,
          callType: callType
        }
      }));
      
    } catch (error) {
      console.error("Failed to create group call:", error);
      toast({
        title: "GROUP CREATION FAILED",
        description: "Unable to establish tactical group. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCall(false);
    }
  };
  
  // Join an existing group call
  const joinGroupCall = async (groupId: number) => {
    try {
      console.log(`[GroupCall] Attempting to join group with ID ${groupId}`);
      
      // Find the group call
      const groupCall = availableGroups.find(g => g.id === groupId);
      
      if (!groupCall) {
        console.error(`[GroupCall] Group with ID ${groupId} not found`);
        throw new Error("Tactical group not found");
      }
      
      // Enhanced debugging for video calls specifically
      if (groupCall.callType === 'video') {
        console.log(`[GroupCall] 🎥 Found VIDEO group "${groupCall.name}" - preparing video call settings`);
        console.log(`[GroupCall] 🎥 VIDEO CALL VERIFICATION: group.callType=${groupCall.callType}`);
      } else {
        console.log(`[GroupCall] Found audio group ${groupCall.name}, type: ${groupCall.callType}`);
      }
      
      // Set as active group call
      setActiveGroupCall(groupCall);
      
      // Initialize WebRTC for group call
      console.log(`[GroupCall] Initializing WebRTC for group ${groupCall.id}`);
      
      // Get all member IDs from the group
      const memberIds = groupCall.members.map(m => m.id);
      
      // Initialize the group call WebRTC connections
      if (user) {
        // For video calls, make absolutely sure we're using video type
        const callType = groupCall.callType === 'video' ? 'video' : 'audio';
        
        if (callType === 'video') {
          console.log(`[GroupCall] 🎥 Explicitly initializing VIDEO group call with ${memberIds.length} members`);
          console.log(`[GroupCall] 🎥 VIDEO CALL: Passing explicit callType='video' to initializeGroupCall`);
        }
        
        await initializeGroupCall(memberIds, user.id, callType);
        
        // Register offer handler to send offers via WebSocket signaling
        setOnGroupOfferCreated((peerId, offer, isRoom) => {
          // Use the explicit callType to ensure video calls are properly handled
          console.log(`[GroupCall] Sending ${callType} offer to peer ${peerId} in room ${groupCall.id}`);
          
          // Format and send the SDP offer through our WebSocket channel
          sendGroupCallOffer(groupCall.id, peerId, JSON.stringify(offer), callType)
            .then(() => {
              console.log(`[GroupCall] Successfully sent ${callType} offer to peer ${peerId}`);
            })
            .catch(error => {
              console.error(`[GroupCall] Failed to send offer to peer ${peerId}:`, error);
              toast({
                title: "SIGNALING ERROR",
                description: "Failed to establish connection with operator.",
                variant: "destructive",
              });
            });
        });
      }
      
      // Start the WebRTC call to join
      console.log(`[GroupCall] Starting WebRTC room call to join group ${groupCall.id}`);
      await startRoomCall(groupCall.id, groupCall.name, groupCall.callType);
      
      // Connect to all group members using WebRTC
      await connectToGroupMembers(groupCall.callType, groupCall.id);
      
      console.log(`[GroupCall] WebRTC call initiated for group ${groupCall.id}`);
      
      // Update group to reflect user has joined
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === groupId
            ? {
                ...g,
                isActive: true,
                members: g.members.map(m => 
                  m.id === user?.id
                    ? { ...m, hasJoined: true, isActive: true }
                    : m
                ),
              }
            : g
        )
      );
      
      // Update active group call state
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          isActive: true,
          members: prev.members.map(m => 
            m.id === user?.id
              ? { ...m, hasJoined: true, isActive: true }
              : m
          ),
        };
      });
      
      // Dispatch event to inform system of join
      window.dispatchEvent(new CustomEvent('group-call-joined', { 
        detail: { 
          groupId: groupCall.id,
          groupName: groupCall.name,
          callType: groupCall.callType
        }
      }));
      
      // Send notification to other members via WebSocket
      if (user) {
        sendGroupCallUserJoined(groupCall.id, user.id, groupCall.callType)
          .then(() => {
            console.log(`[GroupCall] Sent join notification for group ${groupCall.id}`);
          })
          .catch(error => {
            console.error(`[GroupCall] Failed to send join notification:`, error);
          });
      }
      
      toast({
        title: "JOINED TACTICAL GROUP",
        description: `You have joined ${groupCall.name}.`,
      });
      
      console.log(`[GroupCall] Successfully joined group ${groupCall.name}`);
    } catch (error) {
      console.error("Failed to join group call:", error);
      toast({
        title: "FAILED TO JOIN GROUP",
        description: "Unable to join tactical group. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Leave the current group call
  // Function to explicitly terminate a call for all participants
  const endGroupCallForAll = async () => {
    if (!activeGroupCall) return;
    
    try {
      console.log(`[GroupCall] Terminating tactical group call for all members: ${activeGroupCall.name}`);
      
      // Store call info before clearing the state
      const groupName = activeGroupCall.name;
      const groupId = activeGroupCall.id;
      const callType = activeGroupCall.callType;
      
      // Get the call ID from the active group call
      // If we don't have a call ID stored directly, we'll use the room ID as the call ID
      // (This is the pattern used in the server implementation)
      // Make sure we have a valid call ID (cannot be undefined for the function call)
      const callId = activeGroupCall.callId !== undefined ? activeGroupCall.callId : activeGroupCall.id;
      
      // First end all WebRTC connections
      if (typeof leaveGroupCallRTC === 'function') {
        await leaveGroupCallRTC(groupId, callType);
      }
      
      // Reset regular call system
      hangupCall();
      
      // Reset group call state
      resetGroupCall();
      
      // Send the group_call_end message to server
      // Make sure we have a valid call ID (non-undefined)
      const finalCallId = callId !== undefined ? callId : groupId;
      await endGroupCall(finalCallId, groupId, callType);
      
      // Update available groups list
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === groupId
            ? {
                ...g,
                members: g.members.map(m => ({ ...m, hasJoined: false, isActive: false })),
                isActive: false,
              }
            : g
        )
      );
      
      // Clear active group call
      setActiveGroupCall(null);
      
      // Dispatch event to inform system of call end
      window.dispatchEvent(new CustomEvent('group-call-ended', { 
        detail: { 
          groupId: groupId,
          groupName: groupName,
          callType: callType,
          endedBy: user?.id
        }
      }));
      
      toast({
        title: "TACTICAL GROUP CALL TERMINATED",
        description: `You have ended the call for all members in ${groupName}.`,
      });
      
      console.log(`[GroupCall] Successfully terminated group call ${groupName} for all members`);
    } catch (error) {
      console.error("Failed to terminate group call:", error);
      toast({
        title: "FAILED TO END CALL",
        description: "Error terminating tactical group call. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const leaveGroupCall = async () => {
    if (!activeGroupCall) return;
    
    try {
      console.log(`[GroupCall] Leaving tactical group ${activeGroupCall.name}`);
      
      // Store group name for toast message before clearing the active call
      const groupName = activeGroupCall.name;
      const groupId = activeGroupCall.id;
      const callType = activeGroupCall.callType;
      
      // End the WebRTC call
      console.log(`[GroupCall] Ending WebRTC call for group ${activeGroupCall.id}`);
      
      // First end the group WebRTC connections with connection parameters
      if (activeGroupCall && typeof leaveGroupCallRTC === 'function') {
        // Pass the required parameters to the RTC implementation
        await leaveGroupCallRTC(activeGroupCall.id, activeGroupCall.callType);
      }
      
      // Then end the regular call system call
      hangupCall();
      
      // Reset group call state
      resetGroupCall();
      
      // Update available groups list
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === activeGroupCall.id
            ? {
                ...g,
                members: g.members.map(m => 
                  m.id === user?.id
                    ? { ...m, hasJoined: false, isActive: false }
                    : m
                ),
              }
            : g
        )
      );
      
      // Clear active group call
      setActiveGroupCall(null);
      
      // Dispatch event to inform system of leave
      window.dispatchEvent(new CustomEvent('group-call-left', { 
        detail: { 
          groupId: groupId,
          groupName: groupName,
          callType: callType
        }
      }));
      
      // Send notification to other members via WebSocket
      if (user) {
        // First send notification that the user left the call
        sendGroupCallUserLeft(groupId, user.id, callType)
          .then(() => {
            console.log(`[GroupCall] Sent leave notification for group ${groupId}`);
            
            // If this user is the last participant, also terminate the call completely
            if (activeGroupCall?.members.length <= 1) {
              console.log(`[GroupCall] Last participant leaving, ending group call ${groupId}`);
              
              // End the call for everyone
              // Make sure we have a valid call ID (cannot be undefined for the function call)
              const finalCallId = activeGroupCall.callId !== undefined ? activeGroupCall.callId : groupId;
              endGroupCall(finalCallId, groupId, callType)
                .then(() => {
                  console.log(`[GroupCall] Successfully ended group call ${groupId}`);
                })
                .catch(error => {
                  console.error(`[GroupCall] Failed to end group call:`, error);
                });
            }
          })
          .catch(error => {
            console.error(`[GroupCall] Failed to send leave notification:`, error);
          });
      }
      
      toast({
        title: "LEFT TACTICAL GROUP",
        description: `You have left ${groupName}.`,
      });
      
      console.log(`[GroupCall] Successfully left group ${groupName}`);
    } catch (error) {
      console.error("Failed to leave group call:", error);
      toast({
        title: "FAILED TO LEAVE GROUP",
        description: "Error leaving tactical group. The connection may have already been terminated.",
        variant: "destructive",
      });
    }
  };
  
  // Add a member to the current group call
  const addMemberToCall = async (userId: number) => {
    if (!activeGroupCall) return;
    
    try {
      // Check if user is already a member
      if (activeGroupCall.members.some(m => m.id === userId)) {
        toast({
          title: "MEMBER ALREADY IN GROUP",
          description: "This operator is already part of the tactical group.",
        });
        return;
      }
      
      // Add member to the WebRTC group call
      addGroupCallMemberRTC(userId);
      
      // Update available groups list
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === activeGroupCall.id
            ? {
                ...g,
                members: [
                  ...g.members,
                  {
                    id: userId,
                    username: `USER-${userId}`, // In real app, fetch username from API
                    isActive: false,
                    isOnline: true, // Placeholder
                    isMuted: false,
                    hasJoined: false,
                  },
                ],
              }
            : g
        )
      );
      
      // Update active group call
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          members: [
            ...prev.members,
            {
              id: userId,
              username: `USER-${userId}`, // In real app, fetch username from API
              isActive: false,
              isOnline: true, // Placeholder
              isMuted: false,
              hasJoined: false,
            },
          ],
        };
      });
      
      toast({
        title: "OPERATOR ADDED",
        description: `New operator added to tactical group ${activeGroupCall.name}.`,
      });
    } catch (error) {
      console.error("Failed to add member to group call:", error);
      toast({
        title: "FAILED TO ADD OPERATOR",
        description: "Unable to add the operator to the tactical group.",
        variant: "destructive",
      });
    }
  };
  
  // Remove a member from the current group call
  const removeMemberFromCall = async (userId: number) => {
    if (!activeGroupCall) return;
    
    // Prevent removing yourself through this method
    if (userId === user?.id) {
      toast({
        title: "INVALID ACTION",
        description: "Use 'Leave Group' to remove yourself from the tactical group.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Remove member from WebRTC group call
      removeGroupCallMemberRTC(userId);
      
      // Update available groups list
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === activeGroupCall.id
            ? {
                ...g,
                members: g.members.filter(m => m.id !== userId),
              }
            : g
        )
      );
      
      // Update active group call
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          members: prev.members.filter(m => m.id !== userId),
        };
      });
      
      toast({
        title: "OPERATOR REMOVED",
        description: `Operator has been removed from tactical group ${activeGroupCall.name}.`,
      });
    } catch (error) {
      console.error("Failed to remove member from group call:", error);
      toast({
        title: "FAILED TO REMOVE OPERATOR",
        description: "Unable to remove the operator from the tactical group.",
        variant: "destructive",
      });
    }
  };
  
  // Toggle mute status for a member
  const toggleMemberMute = async (userId: number) => {
    if (!activeGroupCall) return;
    
    try {
      // Update available groups list
      setAvailableGroups(prev => 
        prev.map(g => 
          g.id === activeGroupCall.id
            ? {
                ...g,
                members: g.members.map(m => 
                  m.id === userId
                    ? { ...m, isMuted: !m.isMuted }
                    : m
                ),
              }
            : g
        )
      );
      
      // Update active group call
      setActiveGroupCall(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          members: prev.members.map(m => 
            m.id === userId
              ? { ...m, isMuted: !m.isMuted }
              : m
          ),
        };
      });
      
      // If this is the current user, also toggle audio in the actual WebRTC call
      if (userId === user?.id && activeCall) {
        // In a real app, call the WebRTC method to mute audio
        // For this demo, we're just updating the UI state
      }
    } catch (error) {
      console.error("Failed to toggle member mute status:", error);
      toast({
        title: "COMMUNICATION ERROR",
        description: "Failed to update operator's transmission status.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <GroupCallContext.Provider
      value={{
        activeGroupCall,
        availableGroups,
        isCreatingCall,
        createGroupCall,
        joinGroupCall,
        leaveGroupCall,
        endGroupCallForAll,
        addMemberToCall,
        removeMemberFromCall,
        toggleMemberMute,
      }}
    >
      {children}
    </GroupCallContext.Provider>
  );
};

export const useGroupCall = () => {
  const context = useContext(GroupCallContext);
  
  if (!context) {
    throw new Error("useGroupCall must be used within a GroupCallProvider");
  }
  
  return context;
};