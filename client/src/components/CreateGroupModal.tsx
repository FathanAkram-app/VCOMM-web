import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Search } from 'lucide-react';
import { User } from '@shared/schema';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { users, createConversation, setCurrentConversation } = useChat();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out current user and filter by search query
  const filteredUsers = users
    .filter(u => u.id !== user?.id)
    .filter(u => 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      !searchQuery
    );

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const getUserById = (userId: string): User | undefined => {
    return users.find(u => u.id === userId);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Group name required',
        description: 'Please enter a name for your group.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: 'Select members',
        description: 'Please select at least one person to add to the group.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const newConversation = await createConversation({
        name: groupName,
        description: description || undefined,
        isGroup: true,
        members: selectedUsers
      });
      
      setCurrentConversation(newConversation);
      
      toast({
        title: 'Group created',
        description: `"${groupName}" group has been created successfully.`,
      });
      
      // Reset form
      setGroupName('');
      setDescription('');
      setSearchQuery('');
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to create group',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group Chat</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="group-name">Group Name</Label>
            <Input 
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your group"
              className="mt-1"
              rows={2}
            />
          </div>
          
          <div>
            <Label>Add Members</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="mt-3 max-h-40">
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-3">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={user.username}
                          className="rounded-full w-8 h-8 object-cover"
                        />
                      ) : (
                        <div className="rounded-full w-8 h-8 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-medium">{user.username?.charAt(0) || '?'}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium">{user.username || `${user.firstName} ${user.lastName}`}</span>
                    </div>
                    <Checkbox 
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleToggleUser(user.id)}
                    />
                  </div>
                ))}
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-2 text-gray-500">
                    No users found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          {selectedUsers.length > 0 && (
            <div>
              <Label>Selected ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map((userId) => {
                  const selectedUser = getUserById(userId);
                  if (!selectedUser) return null;
                  
                  return (
                    <div key={userId} className="bg-primary-100 text-primary-800 text-sm rounded-full py-1 px-3 flex items-center">
                      {selectedUser.username || `${selectedUser.firstName} ${selectedUser.lastName}`}
                      <button 
                        className="ml-1 text-primary-600"
                        onClick={() => handleRemoveUser(userId)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateGroup} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
