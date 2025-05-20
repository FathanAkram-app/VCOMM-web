import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { fetchChats, fetchMessages, fetchOnlineUsers } from '../lib/polling';
import { useToast } from '../hooks/use-toast';

interface PollingContextType {
  startPolling: (userId: number, intervalMs?: number) => void;
  stopPolling: () => void;
  isPolling: boolean;
  lastPollTime: Date | null;
  pollingErrors: number;
}

export const PollingContext = createContext<PollingContextType | null>(null);

// Custom hook to use the polling context
export const usePolling = () => {
  const context = React.useContext(PollingContext);
  if (context === null) {
    throw new Error('usePolling must be used within a PollingProvider');
  }
  return context;
};

interface PollingProviderProps {
  children: ReactNode;
}

export const PollingProvider = ({ children }: PollingProviderProps) => {
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number>(3000); // Default 3 seconds
  const [userId, setUserId] = useState<number | null>(null);
  const [pollingTimer, setPollingTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [pollingErrors, setPollingErrors] = useState<number>(0);
  const { toast } = useToast();

  // Function to perform polling operations
  const poll = async () => {
    if (!userId) return;
    
    try {
      // Set last poll time
      setLastPollTime(new Date());
      
      // Fetch critical real-time data
      const [chats, onlineUsers] = await Promise.all([
        fetchChats(userId),
        fetchOnlineUsers()
      ]);
      
      // If we have an active chat, also fetch its messages
      const currentChatString = localStorage.getItem('activeChat');
      if (currentChatString) {
        const activeChat = JSON.parse(currentChatString);
        if (activeChat?.id && activeChat?.isRoom !== undefined) {
          await fetchMessages(activeChat.id, activeChat.isRoom);
        }
      }
      
      // Reset error count if successful
      if (pollingErrors > 0) {
        setPollingErrors(0);
      }
    } catch (error) {
      console.error('Polling error:', error);
      setPollingErrors(prev => prev + 1);
      
      // If we have too many consecutive errors, increase the polling interval
      if (pollingErrors >= 5) {
        // Status koneksi sekarang ditampilkan di NavBar
        // Tidak perlu menampilkan toast lagi
        
        // Increase polling interval when experiencing errors
        // to avoid overwhelming the server
        setPollingInterval(prev => Math.min(prev * 1.5, 10000)); // Max 10 seconds
      }
    }
  };

  // Start polling function
  const startPolling = (newUserId: number, intervalMs: number = 3000) => {
    // Stop any existing polling
    stopPolling();
    
    // Set new polling parameters
    setUserId(newUserId);
    setPollingInterval(intervalMs);
    setIsPolling(true);
    
    // Start the polling
    const timer = setInterval(poll, intervalMs);
    setPollingTimer(timer);
    
    console.log(`Started polling for user ${newUserId} every ${intervalMs}ms`);
    
    // Status koneksi sekarang ditampilkan di NavBar
    // Tidak perlu menampilkan toast lagi
    
    // Initial poll
    poll();
  };

  // Stop polling function
  const stopPolling = () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      setPollingTimer(null);
    }
    setIsPolling(false);
    setUserId(null);
    console.log('Stopped polling');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [pollingTimer]);

  return (
    <PollingContext.Provider value={{
      startPolling,
      stopPolling,
      isPolling,
      lastPollTime,
      pollingErrors
    }}>
      {children}
    </PollingContext.Provider>
  );
};