import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, VideoIcon, PhoneIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import GroupMembersList from './GroupMembersList';

interface GroupChatHeaderProps {
  roomId: number;
  currentUserId: number;
  chatName: string;
  onBackClick: () => void;
}

const GroupChatHeader = ({ roomId, currentUserId, chatName, onBackClick }: GroupChatHeaderProps) => {
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  
  return (
    <div className="bg-[#1e1e1e] px-4 py-3 shadow-md flex items-center">
      <Button 
        onClick={onBackClick} 
        variant="ghost" 
        className="text-[#8d9c6b] mr-2 p-1 h-auto"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      
      <div 
        className="flex-1 cursor-pointer" 
        onClick={() => setShowGroupMembers(true)}
      >
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-2 bg-[#566c57]">
            <AvatarFallback className="text-white">
              {(chatName.substring(0, 2) || 'GP').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h2 className="text-lg font-bold text-[#e4e6e3]">{chatName}</h2>
            <p className="text-xs text-[#8d9c6b] flex items-center">
              <span>Secure Channel</span>
              <span className="mx-1">•</span>
              <span className="text-[#8d9c6b] flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>Click to view members</span>
              </span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex">
        <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1">
          <VideoIcon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto">
          <PhoneIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Group Members Dialog */}
      <Dialog open={showGroupMembers} onOpenChange={setShowGroupMembers}>
        <DialogContent className="bg-[#1f201c] border-[#3d3f35] text-[#e0e0e0] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#e0e0e0] text-xl flex items-center">
              <Avatar className="h-6 w-6 mr-2 bg-[#566c57]">
                <AvatarFallback className="text-white text-xs">
                  {(chatName.substring(0, 2) || 'GP').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {chatName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-2">
            <GroupMembersList 
              roomId={roomId} 
              currentUserId={currentUserId} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupChatHeader;