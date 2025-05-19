import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import MobileHeader from '@/components/MobileHeader';
import ProfileModal from '@/components/ProfileModal';
import CreateGroupModal from '@/components/CreateGroupModal';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/contexts/ChatContext';

export default function Chat() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { conversations } = useChat();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleProfileModal = () => setProfileModalOpen(!profileModalOpen);
  const toggleCreateGroupModal = () => setCreateGroupModalOpen(!createGroupModalOpen);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader 
        onMenuClick={toggleSidebar} 
        onProfileClick={toggleProfileModal}
        user={user}
      />
      
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        onCreateGroup={toggleCreateGroupModal}
        user={user}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col md:pt-0 pt-14 h-screen">
        <ChatInterface />
      </div>
      
      {/* Modals */}
      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)}
        user={user}
      />
      
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
      />
    </div>
  );
}
