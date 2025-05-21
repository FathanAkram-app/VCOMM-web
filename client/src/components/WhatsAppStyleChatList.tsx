import { useState } from 'react';
import { ChatListItem } from '../../shared/schema';

interface ChatItem {
  id: number;
  name: string;
  isRoom: boolean;
  isOnline?: boolean;
  members?: number;
  unread?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  otherUserId?: number;
}

interface ChatListProps {
  chats?: ChatListItem[];
  activeChat?: { id: number; isRoom: boolean } | null;
  onSelectChat?: (id: number, isRoom: boolean) => void;
  onChatDeleted?: (id: number, isRoom: boolean) => void;
  onClearChatHistory?: (id: number, isRoom: boolean) => void;
  onStartDirectChat?: (userId: number) => void;
}

export default function WhatsAppStyleChatList({
  chats = [],
  activeChat,
  onSelectChat,
  onChatDeleted,
  onClearChatHistory,
  onStartDirectChat
}: ChatListProps) {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    chatId: number;
    isRoom: boolean;
  } | null>(null);
  
  const handleContextMenu = (e: React.MouseEvent, chatId: number, isRoom: boolean) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId,
      isRoom
    });
  };
  
  const closeContextMenu = () => {
    setContextMenu(null);
  };
  
  const handleChatClick = (id: number, isRoom: boolean) => {
    if (onSelectChat) {
      onSelectChat(id, isRoom);
    }
    closeContextMenu();
  };
  
  const handleDeleteChat = (id: number, isRoom: boolean) => {
    if (onChatDeleted) {
      onChatDeleted(id, isRoom);
    }
    closeContextMenu();
  };
  
  const handleClearHistory = (id: number, isRoom: boolean) => {
    if (onClearChatHistory) {
      onClearChatHistory(id, isRoom);
    }
    closeContextMenu();
  };

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 h-full">
        <div className="w-16 h-16 bg-[#3f4433] rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#9eb36b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-[#9eb36b] font-bold uppercase mb-2">NO CONVERSATIONS</h3>
        <p className="text-gray-400 text-sm mb-4">Start a conversation with another user or create a tactical group.</p>
      </div>
    );
  }

  return (
    <div className="relative" onClick={closeContextMenu}>
      <div className="divide-y divide-[#414438]">
        {chats.map((chat) => (
          <div 
            key={`${chat.id}-${chat.isRoom}`}
            className={`
              chat-list-item flex items-center
              ${activeChat?.id === chat.id && activeChat?.isRoom === chat.isRoom ? 'bg-[#3f4433]' : ''}
            `}
            onClick={() => handleChatClick(chat.id, chat.isRoom)}
            onContextMenu={(e) => handleContextMenu(e, chat.id, chat.isRoom)}
          >
            <div className="relative flex-shrink-0 mr-3">
              {/* Avatar/Icon */}
              <div className="w-12 h-12 bg-[#5c6249] rounded-full flex items-center justify-center">
                {chat.isRoom ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ) : (
                  <span className="text-white uppercase font-bold">{chat.name.charAt(0)}</span>
                )}
              </div>
              
              {/* Online indicator */}
              {chat.isOnline && !chat.isRoom && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f1f1e]"></div>
              )}
            </div>
            
            <div className="flex-grow min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-white truncate">{chat.name}</h4>
                <span className="text-xs text-gray-400">{chat.lastMessageTime || 'Now'}</span>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm text-gray-400 truncate">
                  {chat.lastMessage || (chat.isRoom ? 'Tactical group' : 'Direct message')}
                </p>
                
                {chat.unreadCount > 0 && (
                  <div className="military-badge ml-2">{chat.unreadCount}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Context menu */}
      {contextMenu?.visible && (
        <div 
          className="absolute bg-[#2a2b23] border border-[#414438] shadow-lg rounded-md py-1 z-50"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x,
            transform: 'translate(-80%, -25%)',
            maxWidth: '200px'
          }}
        >
          <div 
            className="px-4 py-2 text-white hover:bg-[#3f4433] cursor-pointer"
            onClick={() => handleChatClick(contextMenu.chatId, contextMenu.isRoom)}
          >
            Open
          </div>
          <div 
            className="px-4 py-2 text-white hover:bg-[#3f4433] cursor-pointer"
            onClick={() => handleClearHistory(contextMenu.chatId, contextMenu.isRoom)}
          >
            Clear messages
          </div>
          {!contextMenu.isRoom && (
            <div 
              className="px-4 py-2 text-red-400 hover:bg-[#3f4433] cursor-pointer"
              onClick={() => handleDeleteChat(contextMenu.chatId, contextMenu.isRoom)}
            >
              Delete chat
            </div>
          )}
        </div>
      )}
    </div>
  );
}