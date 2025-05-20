import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import GroupMembersList from '../components/GroupMembersList';
import { useToast } from '@/hooks/use-toast';

const GroupManagementDemo = () => {
  const [user, setUser] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [groupRooms, setGroupRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Load group chats for this user
        fetchUserGroups(parsedUser.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
        toast({
          title: "Authentication Error",
          description: "Please log in again.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Not logged in",
        description: "Please log in to access this page.",
        variant: "destructive"
      });
    }
  }, []);

  const fetchUserGroups = async (userId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rooms/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched group rooms:', data);
      
      // Only keep room type chats
      const rooms = data.filter((chat: any) => chat.isRoom);
      setGroupRooms(rooms);
    } catch (error) {
      console.error('Error fetching group rooms:', error);
      toast({
        title: "Error",
        description: "Failed to load group chats",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1b17] min-h-screen text-[#e0e0e0]">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#e0e0e0]">Group Management</h1>
          <Link href="/">
            <Button variant="outline" className="border-[#566c57] text-[#8d9c6b]">
              Back to Main App
            </Button>
          </Link>
        </div>

        {!user ? (
          <div className="text-center p-8">
            <p>Please log in to access this page</p>
            <Link href="/login">
              <Button className="mt-4 bg-[#566c57] hover:bg-[#4a5c4b]">Log In</Button>
            </Link>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-[#8d9c6b]">Loading groups...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-[#2a2b25] rounded-md p-4 shadow-md md:col-span-1">
              <h2 className="text-lg font-bold mb-4 text-[#8d9c6b]">Your Groups</h2>
              
              {groupRooms.length === 0 ? (
                <p className="text-[#969692]">You're not a member of any groups.</p>
              ) : (
                <ul className="space-y-2">
                  {groupRooms.map(room => (
                    <li 
                      key={room.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedRoom === room.id 
                          ? 'bg-[#566c57] text-white' 
                          : 'hover:bg-[#3d3f35] text-[#e0e0e0]'
                      }`}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      <div className="font-medium">{room.name}</div>
                      <div className="text-xs mt-1">
                        {room.memberCount} members {room.isAdmin && '(Admin)'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="bg-[#2a2b25] rounded-md p-4 shadow-md md:col-span-3">
              {selectedRoom ? (
                <GroupMembersList roomId={selectedRoom} currentUserId={user.id} />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-[#969692]">
                  <p>Select a group to manage members</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupManagementDemo;