import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, VideoIcon, PhoneIcon } from 'lucide-react';

interface ChatRoomHeaderButtonsProps {
  isGroupChat: boolean;
  onToggleGroupInfo: () => void;
}

const ChatRoomHeaderButtons = ({ isGroupChat, onToggleGroupInfo }: ChatRoomHeaderButtonsProps) => {
  return (
    <div className="flex">
      {isGroupChat && (
        <Button 
          variant="ghost" 
          className="text-[#8d9c6b] p-1 h-auto mr-1"
          onClick={onToggleGroupInfo}
          title="Group Members"
        >
          <Users className="h-5 w-5" />
        </Button>
      )}
      <Button 
        variant="ghost" 
        className="text-[#8d9c6b] p-1 h-auto mr-1"
        title="Video Call"
      >
        <VideoIcon className="h-5 w-5" />
      </Button>
      <Button 
        variant="ghost" 
        className="text-[#8d9c6b] p-1 h-auto"
        title="Voice Call"
      >
        <PhoneIcon className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ChatRoomHeaderButtons;