import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import GroupMembersList from './GroupMembersList';

interface GroupInfoPanelProps {
  roomId: number;
  currentUserId: number;
  onClose: () => void;
}

const GroupInfoPanel = ({ roomId, currentUserId, onClose }: GroupInfoPanelProps) => {
  return (
    <div className="absolute inset-0 z-10 bg-[#1f201c] overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#e4e6e3]">Group Information</h3>
        <Button 
          variant="ghost" 
          className="text-[#8d9c6b] p-1 h-auto"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="mb-6">
        <GroupMembersList 
          roomId={roomId} 
          currentUserId={currentUserId} 
        />
      </div>
    </div>
  );
};

export default GroupInfoPanel;