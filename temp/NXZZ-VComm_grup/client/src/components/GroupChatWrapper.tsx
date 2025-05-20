import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import GroupInfoPanel from './GroupInfoPanel';
import { MessageList } from './MessageList';
import ChatRoomHeaderButtons from './ChatRoomHeaderButtons';

interface GroupChatWrapperProps {
  activeChat: any;
  user: any;
  isLoadingMessages: boolean;
  databaseMessages: any[];
  onBackClick: () => void;
  getChatName: () => string;
  onUserScroll: () => void;
  bottomRef: React.RefObject<HTMLDivElement>;
  onSendMessage: (message: string) => void;
}

const GroupChatWrapper = ({
  activeChat,
  user,
  isLoadingMessages,
  databaseMessages,
  onBackClick,
  getChatName,
  onUserScroll,
  bottomRef,
  onSendMessage,
}: GroupChatWrapperProps) => {
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const handleToggleGroupInfo = () => {
    setShowGroupInfo(!showGroupInfo);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Room Header */}
      <div className="bg-[#1e1e1e] px-4 py-3 shadow-md flex items-center">
        <Button
          onClick={onBackClick}
          variant="ghost"
          className="text-[#8d9c6b] mr-2 p-1 h-auto"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[#e4e6e3]">{getChatName()}</h2>
          <p className="text-xs text-[#8d9c6b]">Secure Group Channel</p>
        </div>
        
        <ChatRoomHeaderButtons 
          isGroupChat={activeChat.isRoom} 
          onToggleGroupInfo={handleToggleGroupInfo} 
        />
      </div>

      {/* Messages Container with Group Info Panel */}
      <div className="flex-1 overflow-hidden bg-[#121212] relative">
        {/* Group Members Panel */}
        {activeChat.isRoom && showGroupInfo && (
          <GroupInfoPanel
            roomId={activeChat.id}
            currentUserId={user?.id}
            onClose={() => setShowGroupInfo(false)}
          />
        )}

        {/* Regular Messages View */}
        <div className={`h-full overflow-y-auto ${showGroupInfo ? 'hidden' : 'block'}`}>
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-[#8d9c6b]">Loading messages...</div>
            </div>
          ) : databaseMessages.length > 0 ? (
            <MessageList
              messages={databaseMessages}
              currentUserId={user?.id}
              onUserScroll={onUserScroll}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8d9c6b] p-4">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-center">No messages yet. Start your secure communication!</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Message Input - Hidden when viewing group info */}
      {!showGroupInfo && (
        <div className="p-3 bg-[#1e1e1e] border-t border-[#2c2c2c]">
          <form className="flex" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a secure message..."
              className="flex-1 bg-[#2c2c2c] text-white rounded-l-md px-3 py-2 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#8d9c6b] text-black rounded-r-md px-4 py-2 font-medium"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default GroupChatWrapper;