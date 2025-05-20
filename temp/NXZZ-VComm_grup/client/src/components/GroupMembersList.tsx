import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Shield, MoreVertical, UserMinus, UserPlus, Crown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';

interface GroupMembersListProps {
  roomId: number;
  currentUserId: number;
}

interface Member {
  id: number;
  username: string;
  nrp?: string;
  rank?: string;
  isOnline?: boolean;
  isAdmin: boolean;
  joinedAt: string;
}

const GroupMembersList: React.FC<GroupMembersListProps> = ({ 
  roomId, 
  currentUserId 
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [roomId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rooms/${roomId}/members`, {
        headers: {
          'Authorization': `Bearer ${currentUserId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch group members');
      }

      const data = await response.json();
      setMembers(data.members);
      setIsAdmin(data.isAdmin);
    } catch (err) {
      console.error('Error fetching group members:', err);
      setError('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteMember = async (memberId: number) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserId}`
        },
        body: JSON.stringify({ isAdmin: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to promote member');
      }
      
      // Update local state
      setMembers(members.map(member => 
        member.id === memberId 
          ? { ...member, isAdmin: true } 
          : member
      ));
    } catch (err) {
      console.error('Error promoting member:', err);
    }
  };
  
  const handleDemoteMember = async (memberId: number) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserId}`
        },
        body: JSON.stringify({ isAdmin: false })
      });
      
      if (!response.ok) {
        throw new Error('Failed to demote member');
      }
      
      // Update local state
      setMembers(members.map(member => 
        member.id === memberId 
          ? { ...member, isAdmin: false } 
          : member
      ));
    } catch (err) {
      console.error('Error demoting member:', err);
    }
  };
  
  const handleRemoveMember = async (memberId: number) => {
    if (!isAdmin) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentUserId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      // Update local state
      setMembers(members.filter(member => member.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleOpenAddMemberDialog = async () => {
    try {
      // First fetch all users
      const usersResponse = await fetch('/api/all-users', {
        headers: {
          'Authorization': `Bearer ${currentUserId}`,
          'Accept': 'application/json'
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const allUsers = await usersResponse.json();
      
      // Filter out users who are already members
      const memberIds = members.map(member => member.id);
      const availableUsers = allUsers.filter((user: any) => !memberIds.includes(user.id));
      
      setAvailableUsers(availableUsers);
      setShowAddMemberDialog(true);
    } catch (err) {
      console.error('Error fetching available users:', err);
    }
  };
  
  const handleAddMember = async () => {
    if (!selectedUserId) return;
    
    try {
      const response = await fetch(`/api/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserId}`
        },
        body: JSON.stringify({ 
          userId: selectedUserId,
          isAdmin: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add member');
      }
      
      // Refresh the member list
      await fetchMembers();
      
      // Close the dialog
      setShowAddMemberDialog(false);
      setSelectedUserId(null);
    } catch (err) {
      console.error('Error adding member:', err);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading members...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">{error}</div>;
  }

  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[#8d9c6b]">{members.length} members</div>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenAddMemberDialog}
            className="text-[#8d9c6b] border-[#8d9c6b]"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {members.map((member) => (
          <div 
            key={member.id} 
            className="flex items-center justify-between p-2 rounded-md hover:bg-[#2a2b25]"
          >
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3 bg-[#2c2d28] border border-[#8d9c6b]">
                <AvatarImage src={`/api/avatar/${member.id}`} />
                <AvatarFallback className="bg-[#3d3f35] text-[#e4e6e3]">
                  {member.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center">
                  <span className="font-medium">{member.username}</span>
                  {member.isAdmin && (
                    <Badge className="ml-2 bg-[#8d9c6b] text-[#1a1b17]">
                      <Crown className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                  {member.id === currentUserId && (
                    <Badge className="ml-2 bg-[#566c57] text-white">You</Badge>
                  )}
                </div>
                
                {member.rank && (
                  <div className="text-xs text-[#8d9c6b]">{member.rank}</div>
                )}
                
                <div className="flex items-center text-xs">
                  {member.isOnline ? (
                    <span className="text-green-500 flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-400">Offline</span>
                  )}
                </div>
              </div>
            </div>
            
            {isAdmin && member.id !== currentUserId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-[#8d9c6b] h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#2c2d28] border-[#3d3f35] text-[#e4e6e3]">
                  {member.isAdmin ? (
                    <DropdownMenuItem 
                      className="cursor-pointer hover:bg-[#3d3f35]"
                      onClick={() => handleDemoteMember(member.id)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Remove Admin
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem 
                      className="cursor-pointer hover:bg-[#3d3f35]"
                      onClick={() => handlePromoteMember(member.id)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Make Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-500 hover:bg-[#3d3f35]"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove from Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>
      
      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="bg-[#1a1b17] text-white border-[#3a3c33]">
          <DialogHeader>
            <DialogTitle className="text-[#8d9c6b]">Add New Member</DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[50vh] overflow-y-auto space-y-2 my-4">
            {availableUsers.length === 0 ? (
              <div className="text-center py-4 text-[#8d9c6b]">
                No available users to add
              </div>
            ) : (
              availableUsers.map((user) => (
                <div 
                  key={user.id}
                  className={`flex items-center p-2 rounded-md cursor-pointer ${
                    selectedUserId === user.id 
                      ? 'bg-[#566c57] text-white' 
                      : 'hover:bg-[#2a2b25]'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <Avatar className="h-8 w-8 mr-3 bg-[#2c2d28] border border-[#8d9c6b]">
                    <AvatarImage src={`/api/avatar/${user.id}`} />
                    <AvatarFallback className="bg-[#3d3f35] text-[#e4e6e3]">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    {user.rank && (
                      <div className="text-xs text-[#8d9c6b]">{user.rank}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddMemberDialog(false)}
              className="border-[#8d9c6b] text-[#8d9c6b]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddMember}
              disabled={!selectedUserId}
              className="bg-[#566c57] hover:bg-[#4a5c4b] text-white"
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupMembersList;