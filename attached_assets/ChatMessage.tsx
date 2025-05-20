import { MessageWithSender } from "@shared/schema";
import { useChat } from "../hooks/useChat";
import { format } from "date-fns";
import { CheckCheck, File, FileText, FileImage, FileAudio, FileVideo, FileArchive, Mic } from "lucide-react";

interface ChatMessageProps {
  message: MessageWithSender;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { user } = useChat();
  const isSent = user?.id === message.senderId;
  
  // Check if message has file attachments
  const hasAttachments = message.content.includes("[ATTACHED:");
  
  // Check if message has voice note
  const hasVoiceNote = message.content.includes("[VOICE NOTE:");
  
  // Extract attachment info
  const extractAttachmentInfo = () => {
    // If there are attachments, split the content by the attachment marker
    if (hasAttachments) {
      const parts = message.content.split("[ATTACHED:");
      const regularContent = parts[0].trim();
      const attachmentInfo = parts[1].replace("]", "").trim();
      
      return { regularContent, attachmentInfo };
    }
    
    return { regularContent: message.content, attachmentInfo: "" };
  };
  
  // Extract voice note info
  const extractVoiceNoteInfo = () => {
    // If there is a voice note, split the content by the voice note marker
    if (hasVoiceNote) {
      const parts = message.content.split("[VOICE NOTE:");
      const regularContent = parts[0].trim();
      const voiceNoteInfo = parts[1].replace("]", "").trim();
      
      return { regularContent, voiceNoteInfo };
    }
    
    return { regularContent: message.content, voiceNoteInfo: "" };
  };
  
  // Get file icon based on filename extension
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension) return <File className="h-4 w-4" />;
    
    if (extension === 'pdf' || extension === 'doc' || extension === 'docx') {
      return <FileText className="h-4 w-4" />;
    } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
      return <FileImage className="h-4 w-4" />;
    } else if (extension === 'mp3' || extension === 'wav') {
      return <FileAudio className="h-4 w-4" />;
    } else if (extension === 'mp4' || extension === 'mpeg') {
      return <FileVideo className="h-4 w-4" />;
    } else if (extension === 'zip') {
      return <FileArchive className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };
  
  // Determine what content to show
  let messageContent = message.content;
  let attachmentsList: string[] = [];
  let voiceNoteDuration = "";
  
  if (hasAttachments) {
    const { regularContent, attachmentInfo } = extractAttachmentInfo();
    messageContent = regularContent;
    attachmentsList = attachmentInfo.split(',').map(name => name.trim());
  }
  
  if (hasVoiceNote) {
    const { regularContent, voiceNoteInfo } = extractVoiceNoteInfo();
    messageContent = regularContent;
    voiceNoteDuration = voiceNoteInfo;
  }

  return (
    <div className={`flex mb-3 ${isSent ? "justify-end" : ""}`}>
      {!isSent && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-sm bg-secondary border border-accent flex items-center justify-center overflow-hidden">
            <span className="text-secondary-foreground font-bold">
              {message.sender.username.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      
      <div className={`max-w-[75%]`}>
        <div
          className={`p-3 border ${
            isSent
              ? "chat-bubble-sent" // Styles defined in index.css for military theme
              : "chat-bubble-received" // Styles defined in index.css for military theme
          }`}
        >
          {/* Regular message content */}
          {messageContent && <p className="font-medium mb-2">{messageContent}</p>}
          
          {/* File attachments */}
          {attachmentsList.length > 0 && (
            <div className="mt-2 border-t border-accent/20 pt-2">
              <div className="text-xs font-bold uppercase mb-1">Attachments</div>
              <div className="flex flex-col gap-1">
                {attachmentsList.map((filename, index) => (
                  <div key={index} className="flex items-center p-1 border border-accent/40 rounded-sm bg-background/20">
                    <span className="mr-2">{getFileIcon(filename)}</span>
                    <span className="text-xs truncate">{filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Voice note */}
          {voiceNoteDuration && (
            <div className="mt-2 border-t border-accent/20 pt-2">
              <div className="flex items-center p-1 border border-accent/40 rounded-sm bg-background/20">
                <Mic className="h-4 w-4 mr-2" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase">Voice Note</span>
                  <span className="text-xs">{voiceNoteDuration}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div
          className={`flex text-xs mt-1 ${
            isSent ? "justify-end text-accent/70" : "text-muted-foreground"
          }`}
        >
          <span className="font-medium">
            {message.createdAt ? format(new Date(message.createdAt), "HH:mm") : "--:--"}
          </span>
          {isSent && (
            <CheckCheck 
              className={`ml-1 h-3 w-3 ${message.read ? "text-success" : "text-muted-foreground/50"}`} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
