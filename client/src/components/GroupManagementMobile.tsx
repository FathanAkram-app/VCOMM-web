import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Users, X, Edit3, Save, Crown, Shield, UserMinus, UserPlus, 
  Search, Check
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useCall } from '@/hooks/useCall';

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

interface GroupManagementMobileProps {
  groupId: number;
  groupName: string;
  onClose: () => void;
  currentUserId: number;
}

export default function GroupManagementMobile({ groupId, groupName, onClose, currentUserId }: GroupManagementMobileProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(groupName);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { ws } = useCall();

  // Listen for real-time group updates
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'group_update' && message.payload?.groupId === groupId) {
          const { updateType, data } = message.payload;
          
          if (updateType === 'name_updated') {
            // Update local state for immediate UI response
            setNewGroupName(data.name);
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: [`/api/group-info/${groupId}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
            queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
          } else if (updateType === 'member_removed' || updateType === 'members_added') {
            // Refresh member list when members change
            queryClient.invalidateQueries({ queryKey: [`/api/group-members/${groupId}`] });
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, groupId, queryClient]);

  // Fetch group info
  const { data: groupInfo, isLoading: isLoadingInfo } = useQuery<GroupInfo>({
    queryKey: [`/api/group-info/${groupId}`],
  });

  // Fetch group members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery<GroupMember[]>({
    queryKey: [`/api/group-members/${groupId}`],
  });

  // Fetch all users for adding
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['/api/all-users'],
  });

  const currentUserMember = members.find(m => m.id === currentUserId);
  const isCurrentUserAdmin = currentUserMember?.role === 'admin' || groupInfo?.isAdmin;

  // Available users (not already in group)
  const availableUsers = allUsers.filter(user => 
    !members.some(member => member.id === user.id) &&
    user.callsign.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update group name mutation
  const updateGroupNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/groups/${groupId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error('Failed to update group name');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/group-info/${groupId}`] });
      setIsEditingName(false);
      toast({ title: "Nama grup berhasil diubah" });
    },
    onError: () => {
      toast({ title: "Gagal mengubah nama grup", variant: "destructive" });
    }
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (userIds: number[]) => {
      return await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/group-members/${groupId}`] });
      setSelectedUsers([]);
      toast({ title: "Anggota berhasil ditambahkan" });
    },
    onError: () => {
      toast({ title: "Gagal menambahkan anggota", variant: "destructive" });
    }
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/group-members/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/group-info/${groupId}`] });
      toast({
        title: "Berhasil",
        description: "Anggota berhasil dihapus dari grup"
      });
      setMemberToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menghapus anggota",
        description: error.message || "Terjadi kesalahan saat menghapus anggota",
        variant: "destructive"
      });
      setMemberToRemove(null);
    }
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error('Failed to change role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/group-members/${groupId}`] });
      toast({ title: "Role anggota berhasil diubah" });
    },
    onError: () => {
      toast({ title: "Gagal mengubah role anggota", variant: "destructive" });
    }
  });

  const handleSaveGroupName = () => {
    if (newGroupName.trim()) {
      updateGroupNameMutation.mutate(newGroupName.trim());
    }
  };

  const handleAddMembers = () => {
    if (selectedUsers.length > 0) {
      addMembersMutation.mutate(selectedUsers);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] w-full max-w-md rounded-t-3xl shadow-2xl border-t border-[#4a7c59]/50 max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-6 duration-500">
        
        {/* Header */}
        <div className="p-4 border-b border-[#4a7c59]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-[#4a7c59]/20 animate-pulse">
                <Users className="h-5 w-5 text-[#a6c455]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#a6c455] animate-in slide-in-from-left-4 duration-700">Kelola Grup</h2>
                <p className="text-sm text-[#7d9f7d] animate-in slide-in-from-left-4 duration-700 delay-150">
                  {isLoadingMembers ? 'Memuat...' : `${members.length} anggota`}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-[#7d9f7d] hover:text-[#a6c455] hover:bg-[#4a7c59]/20 transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-100px)]">
          <div className="p-4 space-y-6">
            
            {/* Group Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#a6c455]">Info Grup</h3>
              
              {/* Group Name */}
              <div>
                <label className="text-sm font-medium text-[#a6c455] mb-2 block">Nama Grup</label>
                {isEditingName ? (
                  <div className="flex space-x-2">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="bg-[#2d4a2d]/50 border-[#4a7c59] text-white transition-all duration-300 focus:border-[#a6c455] focus:ring-2 focus:ring-[#a6c455]/20"
                      placeholder="Nama grup"
                    />
                    <Button
                      onClick={handleSaveGroupName}
                      size="sm"
                      disabled={updateGroupNameMutation.isPending}
                      className="bg-[#4a7c59] hover:bg-[#5a8c69] text-white transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      {updateGroupNameMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingName(false);
                        setNewGroupName(groupName);
                      }}
                      size="sm"
                      variant="outline"
                      className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20 transition-all duration-300 hover:scale-105 active:scale-95"
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
                        className="text-[#7d9f7d] hover:text-[#a6c455] hover:bg-[#4a7c59]/20 transition-all duration-300 hover:scale-110 active:scale-95"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 transition-all duration-300 hover:scale-105">
                  <div className="text-xl font-bold text-white">{members.length}</div>
                  <div className="text-xs text-[#7d9f7d]">Anggota</div>
                </div>
                <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 transition-all duration-300 hover:scale-105">
                  <div className="text-xl font-bold text-yellow-400">{members.filter(m => m.role === 'admin').length}</div>
                  <div className="text-xs text-[#7d9f7d]">Admin</div>
                </div>
                <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 transition-all duration-300 hover:scale-105">
                  <div className="text-xl font-bold text-green-400">{members.filter(m => m.isOnline).length}</div>
                  <div className="text-xs text-[#7d9f7d]">Online</div>
                </div>
                <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 transition-all duration-300 hover:scale-105">
                  <div className="text-xl font-bold text-[#a6c455]">{Math.ceil((Date.now() - new Date(groupInfo?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24))}</div>
                  <div className="text-xs text-[#7d9f7d]">Hari</div>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#a6c455]">Anggota Grup</h3>
                {isCurrentUserAdmin && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-[#4a7c59] text-[#a6c455] hover:bg-[#4a7c59]/20 transition-all duration-300 hover:scale-105 active:scale-95"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Tambah
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] border-[#4a7c59] max-w-sm animate-in slide-in-from-bottom-4 duration-500">
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
                            className="pl-10 bg-[#2d4a2d]/50 border-[#4a7c59] text-white transition-all duration-300 focus:border-[#a6c455] focus:ring-2 focus:ring-[#a6c455]/20"
                          />
                        </div>
                        <ScrollArea className="h-60">
                          <div className="space-y-2">
                            {availableUsers.map((user, index) => (
                              <div
                                key={user.id}
                                className="flex items-center space-x-3 p-2 hover:bg-[#4a7c59]/20 rounded cursor-pointer transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-left-2 duration-500"
                                style={{ animationDelay: `${index * 100}ms` }}
                                onClick={() => {
                                  setSelectedUsers(prev => 
                                    prev.includes(user.id)
                                      ? prev.filter(id => id !== user.id)
                                      : [...prev, user.id]
                                  );
                                }}
                              >
                                <div className="relative">
                                  <Avatar className="h-8 w-8 bg-[#4a7c59] transition-all duration-300 hover:scale-110">
                                    <AvatarFallback className="bg-[#4a7c59] text-white text-xs">
                                      {user.callsign.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {selectedUsers.includes(user.id) && (
                                    <div className="absolute -top-1 -right-1 bg-[#a6c455] rounded-full p-0.5 animate-in zoom-in-50 duration-300">
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
                            className="w-full bg-[#4a7c59] hover:bg-[#5a8c69] text-white transition-all duration-300 hover:scale-105 active:scale-95"
                            disabled={addMembersMutation.isPending}
                          >
                            {addMembersMutation.isPending ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            Tambah {selectedUsers.length} Anggota
                          </Button>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {/* Loading state */}
              {(isLoadingMembers || isLoadingInfo) && (
                <div className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a6c455] border-t-transparent" />
                    <p className="text-[#a6c455] text-sm">Memuat data grup...</p>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {members.map((member, index) => (
                  <div
                    key={member.id}
                    className="bg-[#2d4a2d]/30 p-3 rounded border border-[#4a7c59]/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg animate-in slide-in-from-right-4 duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 bg-[#4a7c59] transition-all duration-300 hover:scale-110">
                            <AvatarFallback className="bg-[#4a7c59] text-white">
                              {member.callsign.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {member.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1a2f1a] animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">{member.callsign}</p>
                            {member.role === 'admin' && (
                              <Badge className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white text-xs font-bold border border-yellow-400 animate-in slide-in-from-left-2 duration-700 hover:scale-105 transition-transform">
                                <Crown className="h-3 w-3 mr-1 animate-bounce" />
                                ADMIN
                              </Badge>
                            )}
                            {member.id === currentUserId && (
                              <Badge variant="outline" className="border-[#4a7c59] text-[#a6c455] text-xs animate-pulse">
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
                            className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20 transition-all duration-300 hover:scale-110 active:scale-95"
                          >
                            {member.role === 'admin' ? (
                              <Shield className="h-4 w-4" />
                            ) : (
                              <Crown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            onClick={() => setMemberToRemove(member)}
                            size="sm"
                            variant="outline"
                            disabled={removeMemberMutation.isPending || changeRoleMutation.isPending}
                            className="border-red-600 text-red-400 hover:bg-red-900/20 transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50"
                          >
                            {removeMemberMutation.isPending ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Confirmation Dialog for Removing Member */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent className="bg-gradient-to-br from-[#1a2f1a] to-[#0f1f0f] border-[#4a7c59]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#a6c455]">Keluarkan Anggota?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#7d9f7d]">
              Apakah Anda yakin ingin mengeluarkan {memberToRemove?.callsign} dari grup?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#4a7c59] text-[#7d9f7d] hover:bg-[#4a7c59]/20">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToRemove) {
                  removeMemberMutation.mutate(memberToRemove.id);
                  setMemberToRemove(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}