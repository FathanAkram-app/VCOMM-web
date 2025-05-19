import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { User } from '@shared/schema';
import { Camera } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [status, setStatus] = useState(user?.status || 'online');
  
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex flex-col items-center mb-6">
            <div className="relative mb-4">
              {user?.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl} 
                  alt="Your profile" 
                  className="rounded-full w-28 h-28 object-cover border-4 border-white shadow"
                />
              ) : (
                <div className="rounded-full w-28 h-28 bg-gray-200 flex items-center justify-center border-4 border-white shadow">
                  <span className="text-gray-500 text-3xl font-medium">{user?.username?.charAt(0) || '?'}</span>
                </div>
              )}
              
              <Button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow hover:bg-primary-700" size="icon">
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <h4 className="text-xl font-semibold">{user?.username || `${user?.firstName} ${user?.lastName}` || 'User'}</h4>
            <p className="text-gray-500">{user?.email || 'No email available'}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input 
                id="display-name" 
                defaultValue={user?.username || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || ''}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue={user?.email || ''}
                className="mt-1"
                readOnly
              />
            </div>
            
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell others about yourself"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue placeholder="Select your status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="away">Away</SelectItem>
                  <SelectItem value="busy">Do Not Disturb</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="block text-sm font-medium mb-2">Notification Settings</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications" className="cursor-pointer">
                    Email notifications
                  </Label>
                  <Switch id="email-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="desktop-notifications" className="cursor-pointer">
                    Desktop notifications
                  </Label>
                  <Switch id="desktop-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-alerts" className="cursor-pointer">
                    Sound alerts
                  </Label>
                  <Switch id="sound-alerts" defaultChecked />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex sm:justify-between">
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={onClose}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
