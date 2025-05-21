import React from 'react';

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
  chats?: ChatItem[];
  activeChat?: { id: number; isRoom: boolean } | null;
  onSelectChat?: (id: number, isRoom: boolean) => void;
  onChatDeleted?: (id: number, isRoom: boolean) => void;
  onClearChatHistory?: (id: number, isRoom: boolean) => void;
  onStartDirectChat?: (userId: number) => void;
}

export default function WhatsAppStyleChatList({
  chats = [],
  activeChat = null,
  onSelectChat = () => {},
  onChatDeleted = () => {},
  onClearChatHistory = () => {},
  onStartDirectChat = () => {}
}: ChatListProps) {
  return (
    <div className="bg-[#0c0c0c] text-white">
      {chats.length > 0 ? (
        <ul className="divide-y divide-[#2c2c2c]">
          {chats.map((chat) => (
            <li
              key={`${chat.isRoom ? 'room' : 'chat'}-${chat.id}`}
              className={`p-3 hover:bg-[#1a1a1a] cursor-pointer transition-colors duration-150 ${
                activeChat?.id === chat.id && activeChat?.isRoom === chat.isRoom
                  ? 'bg-[#1a1a1a]'
                  : ''
              }`}
              onClick={() => onSelectChat(chat.id, chat.isRoom)}
            >
              <div className="flex items-center">
                {/* Avatar */}
                <div className="relative flex-shrink-0 w-12 h-12 bg-[#353535] rounded-full flex items-center justify-center">
                  <span className="text-[#a2bd62] font-bold">
                    {chat.name.substring(0, 2).toUpperCase()}
                  </span>
                  
                  {/* Online indicator for direct chats */}
                  {!chat.isRoom && chat.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0c0c0c] rounded-full"></span>
                  )}
                  
                  {/* Member count for rooms */}
                  {chat.isRoom && chat.members && (
                    <span className="absolute bottom-0 right-0 bg-[#a2bd62] text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.members}
                    </span>
                  )}
                </div>
                
                {/* Chat details */}
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-400">{chat.lastMessageTime}</span>
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-400 truncate">{chat.lastMessage || 'No messages yet'}</p>
                    
                    {/* Unread count */}
                    {chat.unread && chat.unread > 0 ? (
                      <span className="bg-[#a2bd62] text-black text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ml-2">
                        {chat.unread}
                      </span>
                    ) : null}
                  </div>
                </div>
                
                {/* Context menu - hidden by default, shown on hover/click */}
                <div className="relative group">
                  <button className="p-1 text-gray-400 hover:text-white outline-none opacity-0 group-hover:opacity-100 focus:opacity-100">
                    ⋮
                  </button>
                  
                  {/* Dropdown menu - can be implemented later with more advanced functionality */}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="p-4 text-center text-gray-500">
          <p>No conversations yet</p>
          <p className="text-xs mt-1">Start a new conversation by adding contacts</p>
        </div>
      )}
    </div>
  );
}