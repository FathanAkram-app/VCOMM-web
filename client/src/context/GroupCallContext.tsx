import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCall } from '../hooks/useCall';
import { useToast } from '../hooks/use-toast';

interface GroupCallMember {
  id: number;
  username: string;
  isActive: boolean;
  isOnline: boolean;
  isMuted: boolean;
  hasJoined: boolean;
}

interface GroupCall {
  id: number;
  name: string;
  creatorId: number;
  callType: 'audio' | 'video';
  isActive: boolean;
  startTime: Date;
  members: GroupCallMember[];
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

  const createGroupCall = async (name: string, initialMembers: number[], callType: 'audio' | 'video') => {
    setIsCreatingCall(true);
    try {
      // In a real app, this would make an API call
      const newCall: GroupCall = {
        id: Date.now(),
        name,
        creatorId: user?.id || 1,
        callType,
        isActive: true,
        startTime: new Date(),
        members: [
          { id: user?.id || 1, username: user?.username || "USER", isActive: true, isOnline: true, isMuted: false, hasJoined: true },
          ...initialMembers.map(id => ({
            id,
            username: `USER_${id}`,
            isActive: false,
            isOnline: true,
            isMuted: false,
            hasJoined: false
          }))
        ]
      };
      
      setAvailableGroups(prev => [...prev, newCall]);
      setActiveGroupCall(newCall);
      
      // Start the actual call
      await startRoomCall(newCall.id, callType);
      
      toast({
        title: "GROUP CALL CREATED",
        description: `Tactical group "${name}" is now active.`,
      });
    } catch (error) {
      console.error("Failed to create group call:", error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to establish tactical group communication.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCall(false);
    }
  };

  const joinGroupCall = async (groupId: number) => {
    try {
      const group = availableGroups.find(g => g.id === groupId);
      if (!group) return;
      
      setActiveGroupCall(group);
      await startRoomCall(groupId, group.callType);
      
      toast({
        title: "JOINED GROUP",
        description: `Connected to ${group.name}.`,
      });
    } catch (error) {
      console.error("Failed to join group call:", error);
      toast({
        title: "CONNECTION FAILED",
        description: "Failed to join tactical group.",
        variant: "destructive",
      });
    }
  };

  const leaveGroupCall = async () => {
    try {
      setActiveGroupCall(null);
      hangupCall();
      
      toast({
        title: "LEFT GROUP",
        description: "Disconnected from tactical group.",
      });
    } catch (error) {
      console.error("Failed to leave group call:", error);
    }
  };

  const endGroupCallForAll = async () => {
    try {
      if (activeGroupCall) {
        setAvailableGroups(prev => prev.filter(g => g.id !== activeGroupCall.id));
        setActiveGroupCall(null);
        hangupCall();
        
        toast({
          title: "GROUP TERMINATED",
          description: "Tactical group has been disbanded.",
        });
      }
    } catch (error) {
      console.error("Failed to end group call:", error);
    }
  };

  const addMemberToCall = async (userId: number) => {
    try {
      // In a real app, this would make an API call
      setAvailableGroups(prev =>
        prev.map(g =>
          g.id === activeGroupCall?.id
            ? {
                ...g,
                members: [...g.members, {
                  id: userId,
                  username: `USER_${userId}`,
                  isActive: false,
                  isOnline: true,
                  isMuted: false,
                  hasJoined: false
                }]
              }
            : g
        )
      );
      
      setActiveGroupCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: [...prev.members, {
            id: userId,
            username: `USER_${userId}`,
            isActive: false,
            isOnline: true,
            isMuted: false,
            hasJoined: false
          }]
        };
      });
      
      toast({
        title: "MEMBER ADDED",
        description: `Operator USER_${userId} added to group.`,
      });
    } catch (error) {
      console.error("Failed to add member:", error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to add operator to group.",
        variant: "destructive",
      });
    }
  };

  const removeMemberFromCall = async (userId: number) => {
    try {
      setAvailableGroups(prev =>
        prev.map(g =>
          g.id === activeGroupCall?.id
            ? {
                ...g,
                members: g.members.filter(m => m.id !== userId)
              }
            : g
        )
      );
      
      setActiveGroupCall(prev => {
        if (!prev) return null;
        return {
          ...prev,
          members: prev.members.filter(m => m.id !== userId)
        };
      });
      
      toast({
        title: "MEMBER REMOVED",
        description: `Operator removed from group.`,
      });
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to remove operator from group.",
        variant: "destructive",
      });
    }
  };

  const toggleMemberMute = async (userId: number) => {
    try {
      setAvailableGroups(prev =>
        prev.map(g =>
          g.id === activeGroupCall?.id
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