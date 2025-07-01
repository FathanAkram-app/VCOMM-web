import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users, MessageSquare, X, Settings } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  user: User | null;
}

export default function Sidebar({ isOpen, onClose, onCreateGroup, user }: SidebarProps) {
  const [filter, setFilter] = useState('');
  const [currentConversation, setCurrentConversation] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch conversations with unread counts
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['/api/conversations'],
    enabled: !!user,
  });

  // Fetch all users
  const { data: users = [] } = useQuery({
    queryKey: ['/api/all-users'],
    enabled: !!user,
  });
  
  // Filter conversations based on search input
  const filteredConversations = conversations.filter((conv: any) => 
    conv.name?.toLowerCase().includes(filter.toLowerCase()) || 
    !filter
  );

  // Group conversations by type
  const directMessages = filteredConversations.filter((conv: any) => !conv.isGroup);
  const groupChats = filteredConversations.filter((conv: any) => conv.isGroup);

  // Debug logging for unread counts
  useEffect(() => {
    console.log('[Sidebar] All conversations:', conversations);
    console.log('[Sidebar] Direct messages with unread counts:', directMessages.map((conv: any) => ({
      id: conv.id,
      name: conv.name,
      unreadCount: conv.unreadCount
    })));
  }, [conversations, directMessages]);

  // Handle conversation click
  const handleConversationClick = (conversation: any) => {
    setCurrentConversation(conversation);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Get display name for conversations
  const getConversationDisplayName = (conversation: any) => {
    if (conversation.isGroup) {
      return conversation.name || 'Unnamed Group';
    }

    // For direct messages, show the other user's name
    if (users && Array.isArray(users) && user) {
      // Find the other participant in the conversation
      const otherUserId = conversation.participants?.find((p: any) => p.userId !== user.id)?.userId;
      if (otherUserId) {
        const otherUser = users.find((u: any) => u.id === otherUserId);
        if (otherUser) {
          return otherUser.fullName || otherUser.callsign || 'Unknown User';
        }
      }
    }

    return conversation.name || 'Direct Message';
  };

  if (!isOpen) return null;

  return (
    <div className="flex h-full w-80 bg-white border-r border-gray-200 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onCreateGroup}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Direct Messages */}
          <div className="space-y-1 px-3">
            <div className="flex items-center justify-between px-1 text-sm font-medium text-gray-500">
              <span>DIRECT MESSAGES</span>
            </div>
            
            {directMessages.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-2">
                No direct messages yet
              </div>
            )}
            
            {directMessages.map((conversation: any) => {
              const isActive = currentConversation?.id === conversation.id;
              const displayName = getConversationDisplayName(conversation);
              
              return (
                <button
                  key={conversation.id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-gray-100 text-left ${
                    isActive ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <div className="text-xs text-gray-500 truncate">
                        {conversation.lastMessage}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Group Chats */}
          <div className="space-y-1 px-3 mt-6">
            <div className="flex items-center justify-between px-1 text-sm font-medium text-gray-500">
              <span>GROUP CHATS</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateGroup}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            
            {groupChats.length === 0 && (
              <div className="text-sm text-gray-500 px-2 py-2">
                No group chats yet
              </div>
            )}
            
            {groupChats.map((group: any) => {
              const isActive = currentConversation?.id === group.id;
              
              return (
                <button
                  key={group.id}
                  onClick={() => handleConversationClick(group)}
                  className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-gray-100 text-left ${
                    isActive ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-md bg-primary-100 flex items-center justify-center text-primary-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {group.name || 'Unnamed Group'}
                      </div>
                      {group.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {group.unreadCount}
                        </span>
                      )}
                    </div>
                    {group.lastMessage && (
                      <div className="text-xs text-gray-500 truncate">
                        {group.lastMessage}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <User className="h-4 w-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user?.fullName || user?.callsign || 'Unknown User'}
            </div>
            <div className="text-xs text-gray-500">
              Online
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}