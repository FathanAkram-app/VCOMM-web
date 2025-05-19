import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ChatList from "@/components/ChatList";
import ChatRoom from "@/components/ChatRoom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function Chat() {
  const { user, isLoading } = useAuth();
  const [activeChat, setActiveChat] = useState<{ id: number; isGroup: boolean } | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  
  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      return fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          isGroup: true,
          members: []
        }),
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create group');
        return res.json();
      });
    },
    onSuccess: (data) => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      // Set the newly created group as active
      setActiveChat({ id: data.id, isGroup: true });
      // Close the modal
      setShowCreateGroupModal(false);
      // Reset form
      setGroupName("");
    }
  });
  
  // Handle selecting a chat
  const handleSelectChat = (id: number, isGroup: boolean) => {
    setActiveChat({ id, isGroup });
  };
  
  // Handle deleting a chat
  const handleDeleteChat = (id: number, isGroup: boolean) => {
    // If the deleted chat is the active chat, clear active chat
    if (activeChat && activeChat.id === id && activeChat.isGroup === isGroup) {
      setActiveChat(null);
    }
    
    // Call API to delete the chat
    fetch(`/api/conversations/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(() => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    });
  };
  
  // Handle clearing chat history
  const handleClearChatHistory = (id: number, isGroup: boolean) => {
    // Call API to clear chat history
    fetch(`/api/conversations/${id}/clear`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      // Invalidate and refetch messages for this conversation
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${id}/messages`] });
    });
  };
  
  // Handle creating a new group
  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
  };
  
  // Handle submit create group
  const handleSubmitCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) return;
    
    createGroupMutation.mutate(groupName);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#171717]">
        <div className="animate-pulse text-[#a6c455] flex flex-col items-center">
          <Shield className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">Memuat Data...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#171717] text-center">
        <div className="max-w-md p-6">
          <Shield className="h-16 w-16 text-[#a6c455] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Otentikasi Diperlukan</h2>
          <p className="text-gray-400 mb-4">
            Anda perlu login untuk mengakses komunikasi rahasia ini.
          </p>
          <Button 
            onClick={() => window.location.href = '/login'} 
            className="bg-[#4d5d30] hover:bg-[#5a6b38] text-white"
          >
            Login Sekarang
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex">
      {/* Chat list */}
      <div className={`${activeChat ? 'hidden md:block' : ''} w-full md:w-80 border-r border-[#333333]`}>
        <ChatList 
          activeChat={activeChat}
          onSelectChat={handleSelectChat}
          onChatDeleted={handleDeleteChat}
          onClearChatHistory={handleClearChatHistory}
          onCreateGroup={handleCreateGroup}
        />
      </div>
      
      {/* Chat room or empty state */}
      <div className={`${activeChat ? 'block' : 'hidden md:flex'} flex-1 md:flex flex-col items-center justify-center bg-[#171717] text-center`}>
        {activeChat ? (
          <ChatRoom 
            chatId={activeChat.id}
            isGroup={activeChat.isGroup}
            onBack={() => setActiveChat(null)}
          />
        ) : (
          <div className="max-w-md p-6">
            <Shield className="h-16 w-16 text-[#a6c455] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#a6c455] mb-2">NXZZ SECURE COMMS</h2>
            <p className="text-gray-400 mb-6">
              Pilih percakapan dari daftar atau mulai komunikasi baru untuk memulai.
            </p>
            <p className="text-[#a6c455] text-xs uppercase bg-[#222222] inline-block px-3 py-1 rounded-sm">
              Komunikasi Terenkripsi End-to-End
            </p>
          </div>
        )}
      </div>
      
      {/* Create Group Modal */}
      <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
        <DialogContent className="bg-[#222222] border-[#333333] text-white">
          <DialogHeader>
            <DialogTitle className="text-[#a6c455]">Buat Grup Komunikasi Baru</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmitCreateGroup} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="group-name" className="text-gray-300">Nama Grup</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nama grup"
                className="bg-[#333333] border-[#444444] text-white"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateGroupModal(false)}
                className="border-[#444444] text-gray-300 hover:bg-[#333333] hover:text-white"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={!groupName.trim() || createGroupMutation.isPending}
                className="bg-[#4d5d30] hover:bg-[#5a6b38] text-white"
              >
                {createGroupMutation.isPending ? 'Membuat...' : 'Buat Grup'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}