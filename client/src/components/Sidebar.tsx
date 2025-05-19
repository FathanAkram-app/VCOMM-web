import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User } from '@shared/schema';
import { useChat } from '@/contexts/ChatContext';
import { Search, Plus, Users, MessageSquare, X, Settings } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: () => void;
  user: User | null;
}

export default function Sidebar({ isOpen, onClose, onCreateGroup, user }: SidebarProps) {
  const { conversations, setCurrentConversation, currentConversation, users, userPresence } = useChat();
  const [filter, setFilter] = useState('');
  
  // Filter conversations based on search input
  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(filter.toLowerCase()) || 
    !filter
  );

  // Group conversations by type
  const directMessages = filteredConversations.filter(conv => !conv.isGroup);
  const groupChats = filteredConversations.filter(conv => conv.isGroup);

  // Handle conversation click
  const handleConversationClick = (conversation: typeof conversations[0]) => {
    setCurrentConversation(conversation);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  // Get user status
  const getUserStatus = (userId: string) => {
    return userPresence.get(userId) || 'offline';
  };

  // Render status indicator based on status
  const renderStatusIndicator = (status: string) => {
    let bgColor = 'bg-gray-300';
    if (status === 'online') bgColor = 'bg-green-500';
    if (status === 'away') bgColor = 'bg-yellow-400';
    if (status === 'busy') bgColor = 'bg-red-500';
    
    return (
      <div className={`absolute bottom-0 right-0 w-3 h-3 ${bgColor} rounded-full border-2 border-white`}></div>
    );
  };

  return (
    <>
      <div 
        className={`${isOpen ? 'fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden' : 'hidden'}`} 
        onClick={onClose}
      ></div>
      
      <div 
        className={`
          ${isOpen ? 'fixed inset-y-0 left-0 z-20' : 'hidden'} 
          md:block md:relative md:w-64 lg:w-72 h-full bg-white border-r border-gray-200 flex-shrink-0 overflow-hidden
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-white font-bold">
                V
              </div>
              <span className="font-semibold text-gray-800">VComm</span>
            </div>
            <div className="flex">
              <Button variant="ghost" size="icon" className="text-gray-500 md:hidden" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full py-4 space-y-6">
              {/* Search Bar */}
              <div className="px-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search"
                    className="w-full bg-gray-100 rounded-md pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:bg-white"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Direct Messages */}
              <div className="space-y-1 px-3">
                <div className="flex items-center justify-between px-1 text-sm font-medium text-gray-500">
                  <span>DIRECT MESSAGES</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCreateGroup}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {directMessages.length === 0 && (
                  <div className="text-sm text-gray-500 px-2 py-2">
                    No direct messages yet
                  </div>
                )}
                
                {directMessages.map((conversation) => {
                  // Find other user in direct message
                  const otherUser = users.find(u => u.id !== user?.id);
                  const isActive = currentConversation?.id === conversation.id;
                  
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => handleConversationClick(conversation)}
                      className={`w-full flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-gray-100 text-left ${
                        isActive ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div className="relative">
                        {otherUser?.profileImageUrl ? (
                          <img
                            src={otherUser.profileImageUrl}
                            alt={otherUser.username}
                            className="rounded-full w-9 h-9 object-cover"
                          />
                        ) : (
                          <div className="rounded-full w-9 h-9 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 font-medium">{otherUser?.username?.charAt(0) || '?'}</span>
                          </div>
                        )}
                        {otherUser && renderStatusIndicator(getUserStatus(otherUser.id))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'} truncate`}>
                          {conversation.name || otherUser?.username || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{conversation.description || 'Start a conversation'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Group Chats */}
              <div className="space-y-1 px-3">
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
                
                {groupChats.map((group) => {
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
                        <p className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'} truncate`}>
                          {group.name || 'Unnamed Group'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{group.description || 'Group chat'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* User Profile Section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Your profile" 
                  className="rounded-full w-10 h-10 object-cover"
                />
              ) : (
                <div className="rounded-full w-10 h-10 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 font-medium">{user?.username?.charAt(0) || '?'}</span>
                </div>
              )}
              
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-800">{user?.username || 'User'}</p>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
                  <p className="text-xs text-gray-500">Online</p>
                </div>
              </div>
              
              <div className="ml-auto">
                <a 
                  href="/api/logout" 
                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100"
                >
                  <Settings className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
