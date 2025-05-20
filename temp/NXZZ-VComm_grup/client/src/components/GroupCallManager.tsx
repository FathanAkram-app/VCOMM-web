import { useState, useEffect } from "react";
import { useAuth } from "../hooks/use-auth";
import useGroupCall from "../hooks/useGroupCall";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { UserPlus, UserMinus, Mic, MicOff, Phone, Users, Radio } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "../hooks/use-toast";

/**
 * GroupCallManager Component
 * 
 * This component manages the group call UI, including:
 * - Creating new tactical groups
 * - Managing members in tactical groups
 * - Viewing active tactical group status
 * - Joining existing tactical groups
 */
export default function GroupCallManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    activeGroupCall,
    availableGroups,
    isCreatingCall,
    createGroupCall,
    joinGroupCall,
    leaveGroupCall,
    endGroupCallForAll,
    addMemberToCall,
    removeMemberFromCall,
    toggleMemberMute,
  } = useGroupCall();
  
  // State for creating a new group
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showJoinGroupDialog, setShowJoinGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  
  // State for adding members
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberId, setNewMemberId] = useState<number | null>(null);
  
  // Handle external triggers for opening dialogs
  useEffect(() => {
    const handleOpenGroupCallDialog = (event: CustomEvent<{mode: string, callType?: 'audio' | 'video'}>) => {
      console.log("[GroupCallManager] Received event to open group call dialog:", event.detail);
      
      // Set call type if provided
      if (event.detail.callType) {
        setCallType(event.detail.callType);
      }
      
      if (event.detail.mode === 'create') {
        setShowCreateGroupDialog(true);
        setShowJoinGroupDialog(false);
      } else if (event.detail.mode === 'join') {
        setShowJoinGroupDialog(true);
        setShowCreateGroupDialog(false);
      }
    };
    
    // Add event listener with type assertion
    window.addEventListener('open-group-call-dialog', handleOpenGroupCallDialog as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('open-group-call-dialog', handleOpenGroupCallDialog as EventListener);
    };
  }, []);
  
  // Mock users for demo - in a real app, fetch from API
  const mockUsers = [
    { id: 1, username: "ALPHA1", isOnline: true },
    { id: 2, username: "BRAVO2", isOnline: true },
    { id: 3, username: "CHARLIE3", isOnline: false },
    { id: 4, username: "DELTA4", isOnline: true },
    { id: 5, username: "ECHO5", isOnline: true },
    { id: 6, username: "FOXTROT6", isOnline: false },
  ];
  
  // Handle creating a new group
  const handleCreateGroup = async () => {
    if (groupName.trim() === "") {
      toast({
        title: "FIELD REQUIRED",
        description: "Tactical group designation is required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await createGroupCall(groupName, selectedMembers, callType);
      setShowCreateGroupDialog(false);
      setGroupName("");
      setSelectedMembers([]);
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };
  
  // Handle adding a member to the active group
  const handleAddMember = async () => {
    if (!newMemberId) {
      toast({
        title: "SELECTION REQUIRED",
        description: "Please select an operator to add.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await addMemberToCall(newMemberId);
      setShowAddMemberDialog(false);
      setNewMemberId(null);
    } catch (error) {
      console.error("Failed to add member:", error);
    }
  };
  
  // Toggle member selection when creating a group
  const toggleMemberSelection = (userId: number) => {
    setSelectedMembers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Group creation dialog
  const renderCreateGroupDialog = () => (
    <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-bold uppercase">CREATE TACTICAL GROUP</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="groupName" className="font-bold">GROUP DESIGNATION</Label>
            <Input
              id="groupName"
              placeholder="ALPHA TEAM"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="border-accent"
            />
          </div>
          
          <div className="grid gap-2">
            <Label className="font-bold">COMM TYPE</Label>
            <div className="flex space-x-4">
              <Button
                type="button"
                variant={callType === 'audio' ? 'default' : 'outline'}
                onClick={() => setCallType('audio')}
                className="flex-1"
              >
                <Radio className="mr-2 h-4 w-4" />
                VOICE ONLY
              </Button>
              <Button
                type="button"
                variant={callType === 'video' ? 'default' : 'outline'}
                onClick={() => setCallType('video')}
                className="flex-1"
              >
                <Users className="mr-2 h-4 w-4" />
                VIDEO CONF
              </Button>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label className="font-bold">SELECT OPERATORS</Label>
            <div className="border border-accent rounded-sm max-h-48 overflow-y-auto p-2">
              {mockUsers
                .filter(u => u.id !== user?.id) // Exclude current user
                .map(u => (
                  <div
                    key={u.id}
                    className="flex items-center space-x-2 py-2 border-b border-accent/30 last:border-0"
                  >
                    <Checkbox
                      id={`user-${u.id}`}
                      checked={selectedMembers.includes(u.id)}
                      onCheckedChange={() => toggleMemberSelection(u.id)}
                    />
                    <Label
                      htmlFor={`user-${u.id}`}
                      className="flex items-center justify-between flex-1 cursor-pointer"
                    >
                      <span>{u.username}</span>
                      <span className={`text-xs px-2 py-1 rounded-sm ${u.isOnline ? 'bg-green-700/20 text-green-500' : 'bg-destructive/20 text-destructive'}`}>
                        {u.isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </Label>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreateGroup}
            className="military-button"
            disabled={isCreatingCall || groupName.trim() === ""}
          >
            {isCreatingCall ? "ESTABLISHING..." : "ESTABLISH GROUP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // Add member dialog
  const renderAddMemberDialog = () => (
    <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-bold uppercase">ADD OPERATOR TO GROUP</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="font-bold">SELECT OPERATOR</Label>
            <div className="border border-accent rounded-sm max-h-48 overflow-y-auto p-2">
              {mockUsers
                .filter(u => u.id !== user?.id) // Exclude current user
                .filter(u => !activeGroupCall?.members.some((m: { id: number }) => m.id === u.id)) // Exclude existing members
                .map(u => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-2 border-b border-accent/30 last:border-0 ${newMemberId === u.id ? 'bg-accent/20' : ''}`}
                    onClick={() => setNewMemberId(u.id)}
                  >
                    <span>{u.username}</span>
                    <span className={`text-xs px-2 py-1 rounded-sm ${u.isOnline ? 'bg-green-700/20 text-green-500' : 'bg-destructive/20 text-destructive'}`}>
                      {u.isOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleAddMember}
            className="military-button"
            disabled={!newMemberId}
          >
            ADD TO GROUP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // Render group call UI
  const renderActiveGroupCall = () => {
    if (!activeGroupCall) return null;
    
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <header className="military-header p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold uppercase">{activeGroupCall.name}</h1>
            <p className="text-xs text-muted-foreground">
              {activeGroupCall.callType.toUpperCase()} TACTICAL GROUP • {activeGroupCall.members.length} OPERATORS
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddMemberDialog(true)}
              className="border-accent"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              ADD
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={leaveGroupCall}
            >
              <Phone className="mr-2 h-4 w-4 rotate-135" />
              LEAVE
            </Button>
            
            {/* Only show the End Call for All button if user is the creator or has admin rights */}
            {activeGroupCall && user && (activeGroupCall.creatorId === user.id) && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-2"
                onClick={() => {
                  // Confirm before ending call for everyone
                  if (window.confirm("Are you sure you want to end this call for ALL participants?")) {
                    endGroupCallForAll();
                  }
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                END FOR ALL
              </Button>
            )}
          </div>
        </header>
        
        {/* Members list */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-lg font-bold uppercase mb-4">OPERATORS</h2>
          <div className="space-y-2">
            {activeGroupCall.members.map((member: any) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-muted p-3 border border-accent rounded-sm"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-sm bg-accent/30 flex items-center justify-center border border-accent">
                    <span className="font-bold text-sm">{member.username.substring(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-bold">{member.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.hasJoined ? "JOINED" : "PENDING"} • 
                      {member.isActive ? " ACTIVE" : " INACTIVE"}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {member.id === user?.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleMemberMute(member.id)}
                      className={member.isMuted ? "text-destructive" : ""}
                    >
                      {member.isMuted ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  ) : (
                    member.id !== activeGroupCall.creatorId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMemberFromCall(member.id)}
                        className="text-destructive"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Join Group Dialog
  const renderJoinGroupDialog = () => (
    <Dialog open={showJoinGroupDialog} onOpenChange={setShowJoinGroupDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-bold uppercase">JOIN TACTICAL GROUP</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="font-bold">AVAILABLE TACTICAL GROUPS</Label>
            <div className="border border-accent rounded-sm max-h-64 overflow-y-auto p-2">
              {availableGroups.length > 0 ? (
                availableGroups
                  .filter((group: any) => !group.members.some((m: any) => m.id === user?.id && m.hasJoined))
                  .filter((group: any) => group.callType === callType) // Only show groups matching the selected call type
                  .map((group: any) => (
                    <div
                      key={group.id}
                      className="bg-muted p-3 mb-2 border border-accent rounded-sm cursor-pointer hover:bg-accent/20"
                      onClick={() => joinGroupCall(group.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold uppercase">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.callType.toUpperCase()} • {group.members.filter((m: any) => m.hasJoined).length} ACTIVE
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="military-button"
                        >
                          JOIN
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">No tactical groups available</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => setShowJoinGroupDialog(false)}
            variant="outline"
            className="military-button bg-muted text-foreground"
          >
            CANCEL
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {/* Active group call UI */}
      {activeGroupCall && renderActiveGroupCall()}
      
      {/* Create group dialog */}
      {renderCreateGroupDialog()}
      
      {/* Join group dialog */}
      {renderJoinGroupDialog()}
      
      {/* Add member dialog */}
      {renderAddMemberDialog()}
    </>
  );
}