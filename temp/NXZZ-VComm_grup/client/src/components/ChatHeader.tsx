import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Video, UserPlus, MoreVertical } from 'lucide-react';
import UserProfileDialog from './UserProfileDialog';
import GroupMembersList from './GroupMembersList';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent,
  DialogTitle,
  DialogHeader
} from '@/components/ui/dialog';

interface ChatHeaderProps {
  chatId: number;
  isGroupChat: boolean;
  chatName: string;
  onBackClick: () => void;
  currentUserId: number;
  otherUserId?: number;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chatId,
  isGroupChat,
  chatName,
  onBackClick,
  currentUserId,
  otherUserId
}) => {
  const [showUserProfile, setShowUserProfile] = useState(false);
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
      
      {isGroupChat ? (
        <>
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setShowGroupMembers(true)}
          >
            <h2 className="text-lg font-bold text-[#e4e6e3]">{chatName}</h2>
            <p className="text-xs text-[#8d9c6b]">Secure Group Channel</p>
          </div>
          
          <Dialog open={showGroupMembers} onOpenChange={setShowGroupMembers}>
            <DialogContent className="bg-[#1a1b17] text-white border-[#3a3c33]">
              <DialogHeader>
                <DialogTitle className="text-[#8d9c6b]">{chatName} - Members</DialogTitle>
              </DialogHeader>
              <GroupMembersList 
                roomId={chatId}
                currentUserId={currentUserId}
                onClose={() => setShowGroupMembers(false)}
              />
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => setShowUserProfile(true)}
          >
            <h2 className="text-lg font-bold text-[#e4e6e3]">{chatName}</h2>
            <p className="text-xs text-[#8d9c6b]">Secure Direct Channel</p>
          </div>
          
          {otherUserId && (
            <Dialog open={showUserProfile} onOpenChange={setShowUserProfile}>
              <DialogContent className="bg-[#1a1b17] text-white border-[#3a3c33]">
                <UserProfileDialog 
                  userId={otherUserId}
                  onClose={() => setShowUserProfile(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
      
      <div className="flex">
        <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1">
          <Video className="h-5 w-5" />
        </Button>
        {isGroupChat && (
          <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto mr-1" title="Add Member">
            <UserPlus className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" className="text-[#8d9c6b] p-1 h-auto">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;