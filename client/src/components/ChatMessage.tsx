import { useState, useRef } from 'react';

interface Attachment {
  url: string;
  name: string;
  type: string;
}

interface Sender {
  id: number;
  callsign: string;
  rank?: string;
  profileImageUrl?: string;
}

interface Message {
  id: number;
  senderId: number;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  replyToId?: number;
  replyToContent?: string;
  sender: Sender;
}

interface ChatMessageProps {
  message: Message;
  isMine: boolean;
  onDelete?: () => void;
  onReply?: () => void;
  onForward?: () => void;
}

export default function ChatMessage({ message, isMine, onDelete, onReply, onForward }: ChatMessageProps) {
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isAudioAttachment = (type: string) => {
    return type.startsWith('audio/') || type.includes('voice') || type.includes('audio');
  };
  
  const isImageAttachment = (type: string) => {
    return type.startsWith('image/');
  };
  
  const isVideoAttachment = (type: string) => {
    return type.startsWith('video/');
  };
  
  const isPDFAttachment = (type: string) => {
    return type === 'application/pdf';
  };

  const handleMessageClick = () => {
    setShowOptions(!showOptions);
  };
  
  const handleClickOutside = (e: MouseEvent) => {
    if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
      setShowOptions(false);
    }
  };
  
  // Add event listener when options are shown
  if (showOptions) {
    window.addEventListener('click', handleClickOutside);
  } else {
    window.removeEventListener('click', handleClickOutside);
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar for received messages */}
      {!isMine && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#5c6249] flex items-center justify-center text-xs mr-2 self-end">
          {message.sender.callsign.charAt(0).toUpperCase()}
        </div>
      )}
      
      <div className="relative max-w-[80%]">
        {/* Sender name for group chats */}
        {!isMine && (
          <div className="text-xs text-[#9eb36b] ml-2 mb-1 font-medium">
            {message.sender.rank ? `${message.sender.rank} ` : ''}{message.sender.callsign}
          </div>
        )}
        
        {/* Reply reference */}
        {message.replyToContent && (
          <div className={`text-xs p-1 rounded mb-1 max-w-[90%] ${isMine ? 'bg-[#4a4e3a] ml-auto' : 'bg-[#3f4433]'}`}>
            <div className="text-[#9eb36b] font-medium">
              {message.replyToId === message.senderId ? 'Self reply' : 'Reply to'}
            </div>
            <div className="text-white truncate">{message.replyToContent}</div>
          </div>
        )}
        
        {/* Message bubble */}
        <div
          className={`message-bubble ${isMine ? 'sent' : 'received'} relative`}
          onClick={handleMessageClick}
        >
          {/* Text content */}
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="rounded overflow-hidden">
                  {isImageAttachment(attachment.type) && (
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={attachment.url} 
                        alt={attachment.name} 
                        className="max-w-full rounded"
                        style={{ maxHeight: '200px' }}
                      />
                    </a>
                  )}
                  
                  {isAudioAttachment(attachment.type) && (
                    <div className="bg-[#414438] p-2 rounded">
                      <div className="text-xs text-[#9eb36b] mb-1">Voice Message</div>
                      <audio controls src={attachment.url} className="w-full max-w-[200px]">
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}
                  
                  {isVideoAttachment(attachment.type) && (
                    <div className="bg-[#414438] p-2 rounded">
                      <div className="text-xs text-[#9eb36b] mb-1">Video</div>
                      <video 
                        controls 
                        src={attachment.url} 
                        className="w-full max-w-[200px]"
                        style={{ maxHeight: '200px' }}
                      >
                        Your browser does not support video playback.
                      </video>
                    </div>
                  )}
                  
                  {isPDFAttachment(attachment.type) && (
                    <div className="bg-[#414438] p-2 rounded flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#9eb36b] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#9eb36b] hover:underline text-sm"
                      >
                        {attachment.name}
                      </a>
                    </div>
                  )}
                  
                  {!isImageAttachment(attachment.type) && 
                   !isAudioAttachment(attachment.type) && 
                   !isVideoAttachment(attachment.type) && 
                   !isPDFAttachment(attachment.type) && (
                    <div className="bg-[#414438] p-2 rounded flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#9eb36b] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <a 
                        href={attachment.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#9eb36b] hover:underline text-sm"
                      >
                        {attachment.name}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Timestamp */}
          <div className={`message-timestamp ${isMine ? 'text-right' : 'text-left'}`}>
            {formatTimestamp(message.timestamp)}
          </div>
          
          {/* Message options menu */}
          {showOptions && (
            <div 
              ref={optionsRef}
              className="absolute top-0 bg-[#3f4433] shadow-lg rounded z-10 py-1"
              style={{
                right: isMine ? '0' : 'auto',
                left: isMine ? 'auto' : '0',
                transform: 'translateY(-100%)'
              }}
            >
              {onReply && (
                <div 
                  className="px-4 py-2 hover:bg-[#5c6249] cursor-pointer text-sm flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply();
                    setShowOptions(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </div>
              )}
              
              {onForward && (
                <div 
                  className="px-4 py-2 hover:bg-[#5c6249] cursor-pointer text-sm flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onForward();
                    setShowOptions(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Forward
                </div>
              )}
              
              {onDelete && (
                <div 
                  className="px-4 py-2 hover:bg-red-700 text-red-400 hover:text-white cursor-pointer text-sm flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowOptions(false);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}