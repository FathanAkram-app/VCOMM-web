import { useState, useRef, KeyboardEvent } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  PaperclipIcon, 
  SendIcon, 
  Mic, 
  Square, 
  FileIcon, 
  FileTextIcon, 
  FileImageIcon, 
  FileAudioIcon, 
  FileVideoIcon, 
  FileArchiveIcon 
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "./ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

// Type for file attachments
type FileAttachment = {
  file: File;
  preview: string;
  type: 'document' | 'image' | 'audio' | 'video' | 'archive';
};

type AudioRecording = {
  blob: Blob;
  url: string;
  duration: number;
};

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: FileAttachment[], audioRecording?: AudioRecording) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioRecording, setAudioRecording] = useState<AudioRecording | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Send message with attachments or audio recording
  const handleSend = () => {
    const hasContent = message.trim() !== "" || attachments.length > 0 || audioRecording !== null;
    
    if (hasContent) {
      onSendMessage(message, attachments.length > 0 ? attachments : undefined, audioRecording || undefined);
      
      // Reset states
      setMessage("");
      setAttachments([]);
      setAudioRecording(null);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      // Create a preview URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      // Determine file type
      let type: FileAttachment['type'] = 'document';
      
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.includes('zip') || file.type.includes('archive') || file.name.endsWith('.zip')) {
        type = 'archive';
      }
      
      setAttachments(prev => [...prev, { file, preview: fileUrl, type }]);
    });
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].preview);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };
  
  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setAudioRecording({
          blob: audioBlob,
          url: audioUrl,
          duration: recordingTime
        });
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setIsRecording(true);
      
      // Set up timer
      const interval = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      setRecordingInterval(interval);
      
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };
  
  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };
  
  // Discard current recording
  const discardRecording = () => {
    if (audioRecording) {
      URL.revokeObjectURL(audioRecording.url);
      setAudioRecording(null);
    }
  };

  return (
    <div className="bg-background p-2">
      {/* Attachment preview */}
      {attachments.length > 0 && (
        <div className="p-2 mb-2 border border-accent rounded-sm bg-muted/30">
          <div className="text-xs uppercase font-bold mb-1 text-accent">
            ATTACHMENTS ({attachments.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="relative group">
                <div className="border border-accent bg-muted p-2 rounded-sm flex items-center space-x-2">
                  {attachment.type === 'document' && <FileTextIcon className="h-4 w-4 text-primary" />}
                  {attachment.type === 'image' && (
                    <div className="w-10 h-10 relative">
                      <img 
                        src={attachment.preview} 
                        alt="Attachment preview" 
                        className="w-full h-full object-cover rounded-sm"
                      />
                    </div>
                  )}
                  {attachment.type === 'audio' && <FileAudioIcon className="h-4 w-4 text-primary" />}
                  {attachment.type === 'video' && <FileVideoIcon className="h-4 w-4 text-primary" />}
                  {attachment.type === 'archive' && <FileArchiveIcon className="h-4 w-4 text-primary" />}
                  
                  <div className="max-w-[100px] overflow-hidden">
                    <div className="text-xs truncate">{attachment.file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(attachment.file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10 absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeAttachment(index)}
                  >
                    <div className="absolute inset-0 bg-muted rounded-full"></div>
                    <span className="relative text-sm">×</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Audio recording preview */}
      {audioRecording && (
        <div className="p-2 mb-2 border border-accent rounded-sm bg-muted/30">
          <div className="text-xs uppercase font-bold mb-1 text-accent flex items-center justify-between">
            <span>VOICE NOTE - {formatTime(audioRecording.duration)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              onClick={discardRecording}
            >
              <span>×</span>
            </Button>
          </div>
          <audio src={audioRecording.url} controls className="w-full h-8" />
        </div>
      )}
      
      {/* Recording in progress indicator */}
      {isRecording && (
        <div className="p-2 mb-2 border border-accent/90 rounded-sm bg-accent/10 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse mr-2"></div>
            <span className="text-sm font-bold text-accent">RECORDING {formatTime(recordingTime)}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 text-accent hover:bg-accent/20"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex items-center">
        {/* File attachment button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-accent hover:bg-muted"
                aria-label="Attach files"
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon className="h-5 w-5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp3,.mp4,.mpeg,.zip"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach Files</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Voice Recording Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={isRecording ? "text-destructive animate-pulse" : "text-accent hover:bg-muted"}
                aria-label="Record voice note"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={audioRecording !== null}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isRecording ? "Stop Recording" : "Record Voice Note"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex-1 bg-muted rounded-sm border border-accent px-3 py-2 mx-2">
          <Input
            type="text"
            placeholder="ENTER MESSAGE"
            className="w-full bg-transparent border-none outline-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 placeholder:font-medium placeholder:text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isRecording}
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className={(message.trim() === "" && attachments.length === 0 && !audioRecording) ? "text-muted-foreground/50" : "text-accent"}
          onClick={handleSend}
          disabled={message.trim() === "" && attachments.length === 0 && !audioRecording}
          aria-label="Send message"
        >
          <SendIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
