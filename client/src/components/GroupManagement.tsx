import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, Settings, UserPlus, UserMinus, Crown, Shield, 
  Edit3, Save, X, Search, MoreVertical, Check
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface GroupMember {
  id: number;
  callsign: string;
  fullName: string | null;
  role: 'admin' | 'member';
  joinedAt: string;
  isOnline: boolean;
}

interface GroupInfo {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  memberCount: number;
  isAdmin: boolean;
  classification: string | null;
}

interface GroupManagementProps {
  groupId: number;
  groupName: string;
  onClose: () => void;
  currentUserId: number;
}

export default function GroupManagement({ groupId, groupName, onClose, currentUserId }: GroupManagementProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [newDescription, setNewDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch group info
  const { data: groupInfo, isLoading: isLoadingInfo } = useQuery<GroupInfo>({
    queryKey: [`/api/group-info/${groupId}`],
    enabled: !!groupId
  });

  // Fetch group members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<GroupMember[]>({
    queryKey: [`/api/group-members/${groupId}`],
    enabled: !!groupId
  });

  // Fetch all users for adding members
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/all-users']
  });

  // Update group name mutation
  const updateGroupNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/groups/${groupId}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name })
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Nama grup berhasil diubah",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/group-info', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setIsEditingName(false);
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal mengubah nama grup",
        variant: "destructive"
      });
    }
  });

  // Update group description mutation
  const updateGroupDescriptionMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await fetch(`/api/groups/${groupId}/description`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ description })
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Deskripsi grup berhasil diubah",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/group-info', groupId] });
      setIsEditingDescription(false);
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal mengubah deskripsi grup",
        variant: "destructive"
      });
    }
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userIds })
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Anggota berhasil ditambahkan",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-info', groupId] });
      setSelectedUsers([]);
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal menambahkan anggota",
        variant: "destructive"
      });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Anggota berhasil dikeluarkan",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-info', groupId] });
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal mengeluarkan anggota",
        variant: "destructive"
      });
    }
  });

  // Promote/demote member mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: 'admin' | 'member' }) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role })
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Role anggota berhasil diubah",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/group-members', groupId] });
    },
    onError: () => {
      toast({
        title: "Gagal",
        description: "Gagal mengubah role anggota",
        variant: "destructive"
      });
    }
  });

  const handleSaveGroupName = () => {
    if (newGroupName.trim() && newGroupName !== groupName) {
      updateGroupNameMutation.mutate(newGroupName.trim());
    } else {
      setIsEditingName(false);
    }
  };

  const handleSaveDescription = () => {
    updateGroupDescriptionMutation.mutate(newDescription.trim());
  };

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      addMembersMutation.mutate(selectedUsers);
    }
  };

  const availableUsers = allUsers.filter(user => 
    !members.find(member => member.id === user.id) &&
    user.callsign.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentUserMember = members.find(member => member.id === currentUserId);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin' || groupInfo?.isAdmin;

  useEffect(() => {
    if (groupInfo?.description) {
      setNewDescription(groupInfo.description);
    }
  }, [groupInfo?.description]);

  // Debug information
  console.log('GroupManagement render:', {
    groupId,
    groupName,
    groupInfo,
    members,
    allUsers,
    isLoadingInfo,
    isLoadingMembers,
    currentUserId
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] rounded-lg border border-[#4a7c59] w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2d4a2d] to-[#1e3a1e] p-4 border-b border-[#4a7c59]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-[#4a7c59]/20">
                <Users className="h-5 w-5 text-[#a6c455]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#a6c455]">Kelola Grup</h2>
                <p className="text-sm text-[#7d9f7d]">
                  {isLoadingMembers ? 'Memuat...' : `${members.length} anggota`}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-[#7d9f7d] hover:text-[#a6c455] hover:bg-[#4a7c59]/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Left Panel - Group Info */}
          <div className="w-1/3 border-r border-[#4a7c59]/30 p-4">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                {/* Group Name */}
                <div>
                  <label className="text-sm font-medium text-[#a6c455] mb-2 block">Nama Grup</label>
                  {isEditingName ? (
                    <div className="flex space-x-2">
                      <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="bg-[#2d4a2d]/50 border-[#4a7c59] text-white"
                        placeholder="Nama grup"
                      />
                      <Button
                        onClick={handleSaveGroupName}
                        size="sm"
                        className="bg-[#4a7c59] hover:bg-[#5a8c69] text-white"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setIsEditingName(false);
                          setNewGroupName(groupName);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50">
                      <span className="text-white font-medium">{groupInfo?.name || groupName}</span>
                      {isCurrentUserAdmin && (
                        <Button
                          onClick={() => setIsEditingName(true)}
                          size="sm"
                          variant="ghost"
                          className="text-[#7d9f7d] hover:text-[#a6c455] hover:bg-[#4a7c59]/20"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Group Description */}
                <div>
                  <label className="text-sm font-medium text-[#a6c455] mb-2 block">Deskripsi</label>
                  {isEditingDescription ? (
                    <div className="space-y-2">
                      <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="w-full bg-[#2d4a2d]/50 border border-[#4a7c59] rounded p-3 text-white resize-none h-20"
                        placeholder="Deskripsi grup..."
                      />
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSaveDescription}
                          size="sm"
                          className="bg-[#4a7c59] hover:bg-[#5a8c69] text-white"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditingDescription(false);
                            setNewDescription(groupInfo?.description || '');
                          }}
                          size="sm"
                          variant="outline"
                          className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 min-h-[80px]">
                      <div className="flex items-start justify-between">
                        <p className="text-[#7d9f7d] text-sm">
                          {groupInfo?.description || 'Belum ada deskripsi grup'}
                        </p>
                        {isCurrentUserAdmin && (
                          <Button
                            onClick={() => setIsEditingDescription(true)}
                            size="sm"
                            variant="ghost"
                            className="text-[#7d9f7d] hover:text-[#a6c455] hover:bg-[#4a7c59]/20 ml-2"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Group Stats */}
                <div className="bg-[#2d4a2d]/30 p-4 rounded border border-[#4a7c59]/50">
                  <h3 className="text-sm font-medium text-[#a6c455] mb-3">Statistik Grup</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7d9f7d]">Total Anggota</span>
                      <span className="text-white font-medium">{members.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7d9f7d]">Admin</span>
                      <span className="text-white font-medium">
                        {members.filter(m => m.role === 'admin').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#7d9f7d]">Online</span>
                      <span className="text-green-400 font-medium">
                        {members.filter(m => m.isOnline).length}
                      </span>
                    </div>
                    {groupInfo?.createdAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#7d9f7d]">Dibuat</span>
                        <span className="text-white font-medium">
                          {new Date(groupInfo.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Members & Add Users */}
          <div className="flex-1 flex flex-col">
            {/* Tab Buttons */}
            <div className="flex border-b border-[#4a7c59]/30">
              <div className="flex-1 p-3 bg-[#2d4a2d]/30 text-center">
                <span className="text-[#a6c455] font-medium">Anggota Grup</span>
              </div>
              {isCurrentUserAdmin && (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="flex-1 p-3 hover:bg-[#4a7c59]/20 text-center cursor-pointer transition-colors">
                      <span className="text-[#7d9f7d] font-medium">Tambah Anggota</span>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] border-[#4a7c59] max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-[#a6c455]">Tambah Anggota</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#7d9f7d]" />
                        <Input
                          placeholder="Cari pengguna..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-[#2d4a2d]/50 border-[#4a7c59] text-white"
                        />
                      </div>
                      <ScrollArea className="h-60">
                        <div className="space-y-2">
                          {availableUsers.map(user => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-3 p-2 hover:bg-[#4a7c59]/20 rounded cursor-pointer"
                              onClick={() => {
                                setSelectedUsers(prev => 
                                  prev.includes(user.id)
                                    ? prev.filter(id => id !== user.id)
                                    : [...prev, user.id]
                                );
                              }}
                            >
                              <div className="relative">
                                <Avatar className="h-8 w-8 bg-[#4a7c59]">
                                  <AvatarFallback className="bg-[#4a7c59] text-white text-xs">
                                    {user.callsign.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                {selectedUsers.includes(user.id) && (
                                  <div className="absolute -top-1 -right-1 bg-[#a6c455] rounded-full p-0.5">
                                    <Check className="h-3 w-3 text-black" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">{user.callsign}</p>
                                {user.fullName && (
                                  <p className="text-[#7d9f7d] text-xs">{user.fullName}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      {selectedUsers.length > 0 && (
                        <Button
                          onClick={handleAddMembers}
                          className="w-full bg-[#4a7c59] hover:bg-[#5a8c69] text-white"
                          disabled={addMembersMutation.isPending}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Tambah {selectedUsers.length} Anggota
                        </Button>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 p-4">
              <ScrollArea className="h-full">
                {/* Debug info */}
                {(isLoadingMembers || isLoadingInfo) && (
                  <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 mb-4">
                    <p className="text-[#a6c455] text-sm">Memuat data grup...</p>
                  </div>
                )}

                {members.length === 0 && !isLoadingMembers && (
                  <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 mb-4">
                    <p className="text-[#7d9f7d] text-sm">Tidak ada data anggota ditemukan. Total: {members.length}</p>
                  </div>
                )}

                <div className="space-y-3">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-[#2d4a2d]/30 rounded border border-[#4a7c59]/50 hover:bg-[#2d4a2d]/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 bg-[#4a7c59]">
                            <AvatarFallback className="bg-[#4a7c59] text-white">
                              {member.callsign.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a2f1a]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">{member.callsign}</p>
                            {member.role === 'admin' && (
                              <Badge className="bg-[#a6c455] text-black text-xs">
                                <Crown className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {member.id === currentUserId && (
                              <Badge variant="outline" className="border-[#4a7c59] text-[#a6c455] text-xs">
                                Anda
                              </Badge>
                            )}
                          </div>
                          {member.fullName && (
                            <p className="text-[#7d9f7d] text-sm">{member.fullName}</p>
                          )}
                        </div>
                      </div>

                      {/* Member Actions */}
                      {isCurrentUserAdmin && member.id !== currentUserId && (
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => changeRoleMutation.mutate({
                              userId: member.id,
                              role: member.role === 'admin' ? 'member' : 'admin'
                            })}
                            size="sm"
                            variant="outline"
                            className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20"
                          >
                            {member.role === 'admin' ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <Crown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-900/20"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}