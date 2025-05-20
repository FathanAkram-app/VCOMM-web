import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Phone, Video, MessageSquare, Shield } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface UserProfileDialogProps {
  userId: number;
  onClose: () => void;
}

interface UserProfile {
  id: number;
  username: string;
  nrp?: string;
  fullName?: string;
  rank?: string;
  branch?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const response = await fetch(`/api/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${currentUser.id}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Could not load user profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error || 'Failed to load user profile'}</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  return (
    <div className="text-[#e4e6e3]">
      <DialogHeader>
        <DialogTitle className="text-[#8d9c6b]">User Profile</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col items-center mt-4 mb-6">
        <Avatar className="h-24 w-24 mb-4 bg-[#2c2d28] border-2 border-[#8d9c6b]">
          <AvatarImage src={`/api/avatar/${user.id}`} />
          <AvatarFallback className="bg-[#3d3f35] text-[#e4e6e3] text-xl">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <h3 className="text-xl font-bold">{user.username}</h3>
        
        {user.isOnline ? (
          <div className="flex items-center mt-1 text-green-500">
            <Check className="h-4 w-4 mr-1" />
            <span className="text-sm">Online Now</span>
          </div>
        ) : (
          <div className="flex items-center mt-1 text-gray-400">
            <span className="text-sm">
              {user.lastSeen ? `Last seen ${new Date(user.lastSeen).toLocaleString()}` : 'Offline'}
            </span>
          </div>
        )}
        
        {user.rank && (
          <Badge className="mt-2 bg-[#3a3c33] text-[#8d9c6b]">
            {user.rank}
          </Badge>
        )}
      </div>

      <Separator className="my-4 bg-[#3d3f35]" />

      <div className="space-y-4 px-2">
        {user.nrp && (
          <div className="flex justify-between">
            <span className="text-[#8d9c6b]">Personnel ID:</span>
            <span>{user.nrp}</span>
          </div>
        )}
        
        {user.fullName && (
          <div className="flex justify-between">
            <span className="text-[#8d9c6b]">Full Name:</span>
            <span>{user.fullName}</span>
          </div>
        )}
        
        {user.branch && (
          <div className="flex justify-between">
            <span className="text-[#8d9c6b]">Branch:</span>
            <span>{user.branch}</span>
          </div>
        )}
      </div>

      <Separator className="my-4 bg-[#3d3f35]" />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button variant="ghost" className="flex flex-col items-center py-3 text-[#8d9c6b]">
          <MessageSquare className="h-6 w-6 mb-1" />
          <span className="text-xs">Message</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center py-3 text-[#8d9c6b]">
          <Phone className="h-6 w-6 mb-1" />
          <span className="text-xs">Voice Call</span>
        </Button>
        <Button variant="ghost" className="flex flex-col items-center py-3 text-[#8d9c6b]">
          <Video className="h-6 w-6 mb-1" />
          <span className="text-xs">Video Call</span>
        </Button>
      </div>

      <DialogFooter>
        <Button 
          onClick={onClose}
          className="w-full bg-[#566c57] hover:bg-[#4a5c4b] text-white"
        >
          Close
        </Button>
      </DialogFooter>
    </div>
  );
};

export default UserProfileDialog;