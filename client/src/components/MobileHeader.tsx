import { Menu, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { User as UserType } from '@shared/schema';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onProfileClick: () => void;
  user: UserType | null;
}

export default function MobileHeader({ onMenuClick, onProfileClick, user }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between md:hidden z-10">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="text-gray-500">
        <Menu className="h-5 w-5" />
      </Button>
      
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-primary">VComm</span>
      </div>
      
      <Button variant="ghost" size="icon" onClick={onProfileClick} className="text-gray-500">
        {user?.profileImageUrl ? (
          <img 
            src={user.profileImageUrl} 
            alt="User avatar" 
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500 font-medium">{user?.username?.charAt(0) || <User className="h-5 w-5" />}</span>
          </div>
        )}
      </Button>
    </header>
  );
}
