import React from 'react';
import { Link, useLocation } from 'wouter';
import { MessageSquare, Phone, Users, Settings } from 'lucide-react';

interface MainMenuProps {
  activeTab?: 'comms' | 'call' | 'personnel' | 'config';
}

const MainMenu: React.FC<MainMenuProps> = ({ activeTab }) => {
  const [location] = useLocation();

  // Tentukan tab aktif dari path jika tidak ditentukan oleh props
  const active = activeTab || (() => {
    if (location.includes('/comms') || location.includes('/chat')) {
      return 'comms';
    } else if (location.includes('/call')) {
      return 'call';
    } else if (location.includes('/personnel')) {
      return 'personnel';
    } else if (location.includes('/config')) {
      return 'config';
    }
    return undefined;
  })();

  return (
    <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center px-1">
      <Link href="/comms">
        <a className={`flex flex-col items-center p-2 rounded-md transition-colors ${active === 'comms' ? 'text-white bg-[#354c36]' : 'text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white'}`}>
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs mt-1">COMMS</span>
        </a>
      </Link>

      <Link href="/call">
        <a className={`flex flex-col items-center p-2 rounded-md transition-colors ${active === 'call' ? 'text-white bg-[#354c36]' : 'text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white'}`}>
          <Phone className="h-6 w-6" />
          <span className="text-xs mt-1">CALL</span>
        </a>
      </Link>

      <Link href="/personnel">
        <a className={`flex flex-col items-center p-2 rounded-md transition-colors ${active === 'personnel' ? 'text-white bg-[#354c36]' : 'text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white'}`}>
          <Users className="h-6 w-6" />
          <span className="text-xs mt-1">PERSONNEL</span>
        </a>
      </Link>

      <Link href="/config">
        <a className={`flex flex-col items-center p-2 rounded-md transition-colors ${active === 'config' ? 'text-white bg-[#354c36]' : 'text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white'}`}>
          <Settings className="h-6 w-6" />
          <span className="text-xs mt-1">CONFIG</span>
        </a>
      </Link>
    </div>
  );
};

export default MainMenu;