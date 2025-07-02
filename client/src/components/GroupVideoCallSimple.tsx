import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Users, ArrowLeft } from 'lucide-react';

export default function GroupVideoCallSimple() {
  const handleEndCall = () => {
    window.location.href = '/chat';
  };

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#333]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-[#8d9c6b] hover:bg-[#262626]"
          >
            <ArrowLeft size={16} />
          </Button>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#8d9c6b]" />
            <h1 className="text-lg font-semibold text-[#8d9c6b]">Video Call Grup</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="bg-[#333] rounded-lg p-8 mb-4">
            <Users size={48} className="text-[#8d9c6b] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-[#8d9c6b] mb-2">Video Call Grup</h2>
            <p className="text-gray-400">Sedang menyiapkan video call...</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4 p-6 bg-[#222]">
        <Button
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full"
        >
          <PhoneOff size={20} className="mr-2" />
          End Call
        </Button>
      </div>
    </div>
  );
}