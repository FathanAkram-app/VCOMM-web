import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Paperclip, X, File, Image, FileText, Music, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AttachmentUploaderProps {
  onFileUploaded: (fileData: {
    url: string;
    name: string;
    type: string;
    size: number;
    mimetype: string;
  }) => void;
}

export default function AttachmentUploader({ onFileUploaded }: AttachmentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validasi ukuran file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File terlalu besar",
          description: "Ukuran file maksimum 10MB"
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal mengupload file");
      }
      
      const data = await response.json();
      if (data.success) {
        onFileUploaded(data.file);
        setSelectedFile(null);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        variant: "destructive",
        title: "Upload gagal",
        description: error.message || "Terjadi kesalahan saat mengupload file"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getAttachmentIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-5 w-5 text-green-500" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-5 w-5 text-blue-500" />;
    } else if (file.type.startsWith('audio/')) {
      return <Music className="h-5 w-5 text-purple-500" />;
    } else if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('excel') || file.type.includes('text')) {
      return <FileText className="h-5 w-5 text-orange-500" />;
    } else {
      return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-gray-400 hover:text-white"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-[#2a2a2a] p-2 rounded-md">
          <div className="flex items-center space-x-2">
            {getAttachmentIcon(selectedFile)}
            <div className="flex flex-col">
              <span className="text-sm text-white font-medium truncate max-w-[150px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-gray-400">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              type="button" 
              size="sm" 
              disabled={isUploading}
              onClick={handleUpload}
              className="bg-green-700 hover:bg-green-800 text-white text-xs"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={cancelUpload}
              disabled={isUploading}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}