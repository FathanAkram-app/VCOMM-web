import React, { useState } from "react";
import { MessageSquare, MoreVertical, Trash, X, AlertTriangle, Plus as PlusIcon } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";

// Mock data for demo purposes
const mockChats = [
  {
    id: 1,
    name: "OPERATION ALPHA",
    lastMessage: "UAV surveillance confirms area is clear.",
    time: "10:55",
    unread: 0,
    isRoom: true,
    members: 6,
    onlineMembers: 4
  },
  {
    id: 2,
    name: "BRAVO2",
    lastMessage: "Coordinates confirmed for extraction point.",
    time: "09:30",
    unread: 2,
    isRoom: false,
    isOnline: true
  },
  {
    id: 3,
    name: "CHARLIE3",
    lastMessage: "Supply drop scheduled for 1600 hours.",
    time: "Yesterday",
    unread: 0,
    isRoom: false,
    isOnline: true
  },
  {
    id: 4,
    name: "TACTICAL SUPPORT",
    lastMessage: "New satellite imagery available.",
    time: "Yesterday",
    unread: 5,
    isRoom: true,
    members: 8,
    onlineMembers: 3
  },
  {
    id: 5,
    name: "DELTA4",
    lastMessage: "Awaiting further instructions.",
    time: "8/22",
    unread: 0,
    isRoom: false,
    isOnline: false
  }
];

interface ChatListProps {
  chats?: { id: number; name: string; isRoom: boolean }[];
  activeChat?: { id: number; isRoom: boolean } | null;
  onSelectChat?: (id: number, isRoom: boolean) => void;
  onChatDeleted?: (id: number, isRoom: boolean) => void;
}

export default function ChatList({ chats = mockChats, activeChat, onSelectChat, onChatDeleted }: ChatListProps) {
  const [chatToDelete, setChatToDelete] = useState<{id: number; name: string; isRoom: boolean} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDeleteChat = () => {
    if (chatToDelete && onChatDeleted) {
      onChatDeleted(chatToDelete.id, chatToDelete.isRoom);
      setShowDeleteDialog(false);
      setChatToDelete(null);
    }
  };
  
  return (
    <div className="flex-1 overflow-y-auto bg-[#2a2b25]">
      {/* Header section */}
      <div className="p-3 py-4 border-b border-accent/50 bg-[#566c57] flex justify-between items-center">
        <h2 className="font-bold uppercase text-white">TACTICAL COMMS</h2>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="font-medium text-xs border-[#3d3f35]/70 text-white bg-[#3d3f35] hover:bg-[#3d3f35]/80"
          >
            <span className="mr-2">◉</span>
            VIDEO GROUP CALL
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white"
          >
            <span className="text-lg">+</span>
          </Button>
        </div>
      </div>
      
      <div className="p-0">
        <div className="grid grid-cols-1">
          {chats.map(chat => (
            <div 
              key={chat.id}
              className={`flex items-center py-4 px-3 cursor-pointer hover:bg-[#3d3f35] border-b border-[#3d3f35] 
                ${activeChat && activeChat.id === chat.id && activeChat.isRoom === chat.isRoom ? 'bg-[#3d3f35] border-l-4 border-l-[#8b9c8c]' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectChat) {
                  console.log(`Selecting chat: ${chat.id}, isRoom: ${chat.isRoom}`);
                  onSelectChat(chat.id, chat.isRoom);
                }
              }}
            >
              {/* Avatar with two-letter code */}
              <div className="mr-3">
                {chat.isRoom ? (
                  <div className="w-10 h-10 flex flex-col items-center justify-center">
                    <div className="uppercase font-bold text-base">{chat.name.substring(0, 2)}</div>
                    <div className="text-xs text-gray-400 font-mono mt-1">{chat.isRoom ? "4/6" : ""}</div>
                  </div>
                ) : (
                  <div className="w-10 h-10 flex flex-col items-center justify-center">
                    <div className="uppercase font-bold text-base text-center">
                      {chat.name.substring(0, 2)}
                    </div>
                    <div className={`h-2 w-2 mt-1 ${chat.id % 2 === 0 ? 'bg-green-500' : 'bg-gray-500'} rounded-full`}></div>
                  </div>
                )}
              </div>
              
              {/* Chat details */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-white uppercase">{chat.name}</h3>
                  <span className="text-xs text-gray-400">
                    06:23 PM
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {chat.isRoom ? "Tactical communications channel" : "Secure direct message line"}
                </p>
              </div>
              
              {/* Unread count badge */}
              {chat.name === "CHARLIE3" && (
                <div className="ml-2 min-w-6 h-6 rounded-sm bg-muted text-white text-xs flex items-center justify-center font-mono">
                  1
                </div>
              )}
              
              {/* More options icon */}
              <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-accent/10 relative">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#2a2b25] border border-[#566c57] text-white min-w-[150px]">
                    <DropdownMenuItem 
                      className="cursor-pointer hover:bg-[#3d3f35] text-sm font-mono uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`Mute ${chat.name}`);
                        alert(`Mute functionality will be implemented soon.`);
                      }}
                    >
                      Mute Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer hover:bg-[#3d3f35] text-sm font-mono uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`Audio call with ${chat.name}`);
                        alert(`Audio call functionality will be implemented soon.`);
                      }}
                    >
                      Audio Call
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer hover:bg-[#3d3f35] text-sm font-mono uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(`Video call with ${chat.name}`);
                        alert(`Video call functionality will be implemented soon.`);
                      }}
                    >
                      Video Call
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-500 hover:bg-[#3d3f35] text-sm font-mono uppercase"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatToDelete(chat);
                        setShowDeleteDialog(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add New Chat Button - Fixed at bottom right corner */}
      <div className="absolute bottom-16 right-0 z-10">
        <Button 
          variant="default" 
          size="icon" 
          className="w-12 h-12 bg-[#566c57] hover:bg-[#668568] shadow-md border-none rounded-none"
          onClick={() => setShowDeleteDialog(true)} 
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg uppercase font-bold text-destructive flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              CONFIRM DELETION
            </DialogTitle>
            <DialogDescription className="text-center pt-2 pb-1">
              Are you sure you want to delete this {chatToDelete?.isRoom ? "tactical channel" : "conversation"}?
            </DialogDescription>
            <div className="mt-2 p-3 bg-muted/50 border border-accent rounded-sm">
              <p className="text-center font-bold">{chatToDelete?.name}</p>
              <p className="text-center text-xs text-muted-foreground mt-1">
                This action cannot be undone. All messages will be permanently erased.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-2 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              className="military-button bg-muted text-foreground"
            >
              CANCEL
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleDeleteChat}
              className="military-button uppercase"
            >
              DELETE {chatToDelete?.isRoom ? "CHANNEL" : "CONVERSATION"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}