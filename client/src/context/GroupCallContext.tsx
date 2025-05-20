import { createContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { useLocation } from "wouter";

// Definisi tipe anggota grup panggilan
interface GroupCallMember {
  id: number;
  callsign: string;
  isActive: boolean;
  isOnline: boolean;
  isMuted: boolean;
  hasJoined: boolean;
}

// Definisi tipe grup panggilan
interface GroupCall {
  id: number;
  name: string;
  creatorId: number;
  callType: 'audio' | 'video';
  isActive: boolean;
  startTime: Date;
  members: GroupCallMember[];
}

// Definisi tipe context grup panggilan
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

interface GroupCallProviderProps {
  children: ReactNode;
}

export const GroupCallProvider = ({ children }: GroupCallProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State untuk grup panggilan
  const [activeGroupCall, setActiveGroupCall] = useState<GroupCall | null>(null);
  const [availableGroups, setAvailableGroups] = useState<GroupCall[]>([]);
  const [isCreatingCall, setIsCreatingCall] = useState(false);
  
  // Membuat panggilan grup baru
  const createGroupCall = async (name: string, initialMembers: number[], callType: 'audio' | 'video') => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create group calls.",
        variant: "destructive",
      });
      return;
    }
    
    if (activeGroupCall) {
      toast({
        title: "Call in Progress",
        description: "Please end your current call before starting a new one.",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingCall(true);
    
    try {
      // Simulasi membuat grup panggilan
      // Untuk implementasi sebenarnya, kirim permintaan ke server untuk membuat grup
      
      // Dapatkan informasi anggota
      const response = await fetch('/api/all-users');
      if (!response.ok) throw new Error("Failed to get user information");
      const allUsers = await response.json();
      
      // Buat data anggota grup
      const members: GroupCallMember[] = initialMembers
        .map(userId => {
          const memberUser = allUsers.find((u: any) => u.id === userId);
          return memberUser ? {
            id: userId,
            callsign: memberUser.callsign || "UNKNOWN",
            isActive: false,
            isOnline: memberUser.status === 'online',
            isMuted: false,
            hasJoined: false
          } : null;
        })
        .filter((m): m is GroupCallMember => m !== null);
      
      // Tambahkan pembuat panggilan sebagai anggota
      if (!members.some(m => m.id === user.id)) {
        const userInfo = allUsers.find((u: any) => u.id === user.id);
        if (userInfo) {
          members.push({
            id: user.id,
            callsign: userInfo.callsign || "YOU",
            isActive: true,
            isOnline: true,
            isMuted: false,
            hasJoined: true
          });
        }
      } else {
        // Update user sendiri sebagai sudah bergabung
        const userIndex = members.findIndex(m => m.id === user.id);
        if (userIndex >= 0) {
          members[userIndex].isActive = true;
          members[userIndex].hasJoined = true;
        }
      }
      
      // Buat objek grup panggilan
      const newGroupCall: GroupCall = {
        id: Date.now(),
        name,
        creatorId: user.id,
        callType,
        isActive: true,
        startTime: new Date(),
        members
      };
      
      // Update state
      setActiveGroupCall(newGroupCall);
      setAvailableGroups(prev => [...prev, newGroupCall]);
      
      // Navigasi ke halaman grup panggilan yang sesuai
      navigate(`/group-${callType}-call`);
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error creating group call:", error);
      toast({
        title: "Call Creation Failed",
        description: "Failed to create group call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCall(false);
    }
  };
  
  // Bergabung ke grup panggilan yang ada
  const joinGroupCall = async (groupId: number) => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to join group calls.",
        variant: "destructive",
      });
      return;
    }
    
    if (activeGroupCall) {
      toast({
        title: "Call in Progress",
        description: "Please end your current call before joining another.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Cari grup yang ingin diikuti
      const group = availableGroups.find(g => g.id === groupId);
      if (!group) {
        throw new Error("Group call not found");
      }
      
      // Update status anggota
      const updatedMembers = group.members.map(member => 
        member.id === user.id
          ? { ...member, isActive: true, hasJoined: true }
          : member
      );
      
      // Update grup panggilan
      const updatedGroup: GroupCall = {
        ...group,
        members: updatedMembers
      };
      
      // Update state
      setActiveGroupCall(updatedGroup);
      setAvailableGroups(prev => 
        prev.map(g => g.id === groupId ? updatedGroup : g)
      );
      
      // Navigasi ke halaman grup panggilan yang sesuai
      navigate(`/group-${group.callType}-call`);
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error joining group call:", error);
      toast({
        title: "Join Failed",
        description: "Failed to join group call. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Meninggalkan grup panggilan
  const leaveGroupCall = async () => {
    if (!activeGroupCall || !user) return;
    
    try {
      // Update status anggota
      const updatedMembers = activeGroupCall.members.map(member => 
        member.id === user.id
          ? { ...member, isActive: false, hasJoined: false }
          : member
      );
      
      // Update grup panggilan
      const updatedGroup: GroupCall = {
        ...activeGroupCall,
        members: updatedMembers
      };
      
      // Update state
      setActiveGroupCall(null);
      setAvailableGroups(prev => 
        prev.map(g => g.id === activeGroupCall.id ? updatedGroup : g)
      );
      
      // Navigasi kembali
      navigate("/chat");
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error leaving group call:", error);
      toast({
        title: "Error",
        description: "Failed to leave group call. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Mengakhiri grup panggilan untuk semua anggota
  const endGroupCallForAll = async () => {
    if (!activeGroupCall || !user) return;
    
    // Pastikan hanya pembuat grup yang bisa mengakhiri panggilan
    if (activeGroupCall.creatorId !== user.id) {
      toast({
        title: "Permission Denied",
        description: "Only the group creator can end the call for all members.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update grup panggilan menjadi tidak aktif
      const updatedGroup: GroupCall = {
        ...activeGroupCall,
        isActive: false
      };
      
      // Update state
      setActiveGroupCall(null);
      setAvailableGroups(prev => 
        prev.filter(g => g.id !== activeGroupCall.id)
      );
      
      // Navigasi kembali
      navigate("/chat");
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error ending group call:", error);
      toast({
        title: "Error",
        description: "Failed to end group call. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Menambahkan anggota ke grup panggilan
  const addMemberToCall = async (userId: number) => {
    if (!activeGroupCall || !user) return;
    
    try {
      // Dapatkan informasi pengguna yang akan ditambahkan
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error("Failed to get user information");
      const userInfo = await response.json();
      
      // Buat data anggota baru
      const newMember: GroupCallMember = {
        id: userId,
        callsign: userInfo.callsign || "UNKNOWN",
        isActive: false,
        isOnline: userInfo.status === 'online',
        isMuted: false,
        hasJoined: false
      };
      
      // Update anggota grup
      const updatedMembers = [...activeGroupCall.members, newMember];
      
      // Update grup panggilan
      const updatedGroup: GroupCall = {
        ...activeGroupCall,
        members: updatedMembers
      };
      
      // Update state
      setActiveGroupCall(updatedGroup);
      setAvailableGroups(prev => 
        prev.map(g => g.id === activeGroupCall.id ? updatedGroup : g)
      );
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error adding member to group call:", error);
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Mengeluarkan anggota dari grup panggilan
  const removeMemberFromCall = async (userId: number) => {
    if (!activeGroupCall || !user) return;
    
    // Pastikan hanya pembuat grup yang bisa mengeluarkan anggota
    if (activeGroupCall.creatorId !== user.id && userId !== user.id) {
      toast({
        title: "Permission Denied",
        description: "Only the group creator can remove other members.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update anggota grup
      const updatedMembers = activeGroupCall.members.filter(member => member.id !== userId);
      
      // Update grup panggilan
      const updatedGroup: GroupCall = {
        ...activeGroupCall,
        members: updatedMembers
      };
      
      // Update state
      setActiveGroupCall(updatedGroup);
      setAvailableGroups(prev => 
        prev.map(g => g.id === activeGroupCall.id ? updatedGroup : g)
      );
      
      // Jika pengguna yang dihapus adalah diri sendiri, keluar dari panggilan
      if (userId === user.id) {
        setActiveGroupCall(null);
        navigate("/chat");
      }
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error removing member from group call:", error);
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Toggle mute untuk anggota grup
  const toggleMemberMute = async (userId: number) => {
    if (!activeGroupCall) return;
    
    try {
      // Update status mute
      const updatedMembers = activeGroupCall.members.map(member => 
        member.id === userId
          ? { ...member, isMuted: !member.isMuted }
          : member
      );
      
      // Update grup panggilan
      const updatedGroup: GroupCall = {
        ...activeGroupCall,
        members: updatedMembers
      };
      
      // Update state
      setActiveGroupCall(updatedGroup);
      setAvailableGroups(prev => 
        prev.map(g => g.id === activeGroupCall.id ? updatedGroup : g)
      );
      
      // Untuk implementasi sebenarnya, kirim informasi ke server melalui WebSocket
      
    } catch (error) {
      console.error("Error toggling member mute:", error);
      toast({
        title: "Error",
        description: "Failed to update mute status. Please try again.",
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