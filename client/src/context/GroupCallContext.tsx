import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useToast } from '@/hooks/use-toast';

interface GroupCallMember {
  id: number;
  username: string;
  fullName: string;
  hasJoined: boolean;
  isActive: boolean;
  isMuted: boolean;
}

interface GroupCall {
  id: number;
  name: string;
  callType: 'audio' | 'video';
  creatorId: number;
  members: GroupCallMember[];
  isActive: boolean;
  createdAt: Date;
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

export function GroupCallProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { addMessageListener } = useWebSocket();
  const { toast } = useToast();

  const [activeGroupCall, setActiveGroupCall] = useState<GroupCall | null>(null);
  const [availableGroups, setAvailableGroups] = useState<GroupCall[]>([]);
  const [isCreatingCall, setIsCreatingCall] = useState(false);

  // Listen for group call events from WebSocket
  useEffect(() => {
    if (!addMessageListener) return;

    const handleMessage = (data: any) => {
      switch (data.type) {
        case 'group_call_created':
          console.log('[GroupCallContext] Group call created:', data);
          const newGroup: GroupCall = {
            ...data.payload.groupCall,
            createdAt: new Date(data.payload.groupCall.createdAt)
          };
          setAvailableGroups(prev => [...prev, newGroup]);
          
          // If this user is the creator or a member, set as active
          if (data.payload.groupCall.creatorId === user?.id || 
              data.payload.groupCall.members.some((m: any) => m.id === user?.id)) {
            setActiveGroupCall(newGroup);
          }
          break;

        case 'group_call_joined':
          console.log('[GroupCallContext] User joined group call:', data);
          if (activeGroupCall && activeGroupCall.id === data.payload.groupCallId) {
            setActiveGroupCall(prev => prev ? {
              ...prev,
              members: prev.members.map(m => 
                m.id === data.payload.userId ? { ...m, hasJoined: true, isActive: true } : m
              )
            } : null);
          }
          break;

        case 'group_call_left':
          console.log('[GroupCallContext] User left group call:', data);
          if (activeGroupCall && activeGroupCall.id === data.payload.groupCallId) {
            if (data.payload.userId === user?.id) {
              // Current user left
              setActiveGroupCall(null);
            } else {
              // Another user left
              setActiveGroupCall(prev => prev ? {
                ...prev,
                members: prev.members.map(m => 
                  m.id === data.payload.userId ? { ...m, hasJoined: false, isActive: false } : m
                )
              } : null);
            }
          }
          break;

        case 'group_call_ended':
          console.log('[GroupCallContext] Group call ended:', data);
          if (activeGroupCall && activeGroupCall.id === data.payload.groupCallId) {
            setActiveGroupCall(null);
            toast({
              title: "GROUP CALL ENDED",
              description: "The tactical group call has been terminated.",
            });
          }
          setAvailableGroups(prev => prev.filter(g => g.id !== data.payload.groupCallId));
          break;
      }
    };

    const unsubscribe = addMessageListener(handleMessage);
    return unsubscribe;
  }, [addMessageListener, activeGroupCall, user?.id, toast]);

  // Fetch available group calls on mount
  useEffect(() => {
    const fetchAvailableGroups = async () => {
      try {
        const response = await fetch('/api/group-calls/available');
        if (response.ok) {
          const groups = await response.json();
          setAvailableGroups(groups.map((g: any) => ({
            ...g,
            createdAt: new Date(g.createdAt)
          })));
        }
      } catch (error) {
        console.error('Failed to fetch available groups:', error);
      }
    };

    if (user) {
      fetchAvailableGroups();
    }
  }, [user]);

  const createGroupCall = async (name: string, initialMembers: number[], callType: 'audio' | 'video') => {
    if (!user || !socket) {
      throw new Error('User not authenticated or WebSocket not connected');
    }

    setIsCreatingCall(true);
    try {
      const response = await fetch('/api/group-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          callType,
          memberIds: initialMembers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create group call');
      }

      const groupCall = await response.json();
      console.log('[GroupCallContext] Created group call:', groupCall);

      toast({
        title: "TACTICAL GROUP ESTABLISHED",
        description: `Group "${name}" created successfully.`,
      });
    } catch (error) {
      console.error('Failed to create group call:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to establish tactical group.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsCreatingCall(false);
    }
  };

  const joinGroupCall = async (groupId: number) => {
    if (!user || !socket) {
      throw new Error('User not authenticated or WebSocket not connected');
    }

    try {
      const response = await fetch(`/api/group-calls/${groupId}/join`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to join group call');
      }

      toast({
        title: "JOINED TACTICAL GROUP",
        description: "Successfully joined the tactical group.",
      });
    } catch (error) {
      console.error('Failed to join group call:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to join tactical group.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const leaveGroupCall = async () => {
    if (!activeGroupCall || !user || !socket) {
      return;
    }

    try {
      const response = await fetch(`/api/group-calls/${activeGroupCall.id}/leave`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to leave group call');
      }

      setActiveGroupCall(null);
      
      toast({
        title: "LEFT TACTICAL GROUP",
        description: "You have left the tactical group.",
      });
    } catch (error) {
      console.error('Failed to leave group call:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to leave tactical group.",
        variant: "destructive",
      });
    }
  };

  const endGroupCallForAll = async () => {
    if (!activeGroupCall || !user || !socket) {
      return;
    }

    try {
      const response = await fetch(`/api/group-calls/${activeGroupCall.id}/end`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to end group call');
      }

      setActiveGroupCall(null);
      
      toast({
        title: "TACTICAL GROUP TERMINATED",
        description: "The tactical group has been ended for all participants.",
      });
    } catch (error) {
      console.error('Failed to end group call:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to terminate tactical group.",
        variant: "destructive",
      });
    }
  };

  const addMemberToCall = async (userId: number) => {
    if (!activeGroupCall || !socket) {
      throw new Error('No active group call or WebSocket not connected');
    }

    try {
      const response = await fetch(`/api/group-calls/${activeGroupCall.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add member to group call');
      }

      toast({
        title: "OPERATOR ADDED",
        description: "Operator added to tactical group.",
      });
    } catch (error) {
      console.error('Failed to add member:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to add operator to group.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeMemberFromCall = async (userId: number) => {
    if (!activeGroupCall || !socket) {
      throw new Error('No active group call or WebSocket not connected');
    }

    try {
      const response = await fetch(`/api/group-calls/${activeGroupCall.id}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove member from group call');
      }

      toast({
        title: "OPERATOR REMOVED",
        description: "Operator removed from tactical group.",
      });
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast({
        title: "OPERATION FAILED",
        description: "Failed to remove operator from group.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleMemberMute = async (userId: number) => {
    if (!activeGroupCall || !socket) {
      return;
    }

    // Update local state immediately for responsive UI
    setActiveGroupCall(prev => prev ? {
      ...prev,
      members: prev.members.map(m => 
        m.id === userId ? { ...m, isMuted: !m.isMuted } : m
      )
    } : null);

    try {
      const response = await fetch(`/api/group-calls/${activeGroupCall.id}/members/${userId}/mute`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert the change if API call failed
        setActiveGroupCall(prev => prev ? {
          ...prev,
          members: prev.members.map(m => 
            m.id === userId ? { ...m, isMuted: !m.isMuted } : m
          )
        } : null);
        throw new Error('Failed to toggle member mute');
      }
    } catch (error) {
      console.error('Failed to toggle member mute:', error);
    }
  };

  const value: GroupCallContextProps = {
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
  };

  return (
    <GroupCallContext.Provider value={value}>
      {children}
    </GroupCallContext.Provider>
  );
}

export function useGroupCall() {
  const context = useContext(GroupCallContext);
  if (!context) {
    throw new Error('useGroupCall must be used within a GroupCallProvider');
  }
  return context;
}