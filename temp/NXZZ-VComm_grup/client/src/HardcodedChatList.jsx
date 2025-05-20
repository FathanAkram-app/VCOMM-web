import React from 'react';
import { ArrowLeft, MessageSquare, User, Users, Phone, Plus, Send, Search } from 'lucide-react';

// Komponen tanpa hooks untuk tampilan daftar chat
function HardcodedChatList() {
  // Fungsi navigasi sederhana
  const goToChat = (id) => {
    window.location.href = `/chat/${id}`;
  };
  
  const goToPersonnel = () => {
    window.location.href = '/personnel';
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
        <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
        <button
          className="text-[#bdc1c0] hover:text-white p-2 rounded-full hover:bg-[#3d3f35]"
          onClick={goToPersonnel}
        >
          <Plus size={20} />
        </button>
      </div>
      
      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[#3d3f35]/40">
          {/* Special Forces Team Chat */}
          <div
            className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
            onClick={() => goToChat(1001)}
          >
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#566c57] rounded-full flex items-center justify-center text-white font-medium">
                SF
              </div>
              <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                <Users size={12} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                  Special Forces Team
                </h3>
                <span className="text-xs text-[#969692] flex-shrink-0">
                  12:45
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm truncate pr-2 text-[#969692]">
                  Mission briefing tomorrow at 0800
                </p>
              </div>
            </div>
          </div>
          
          {/* Chat with Eko */}
          <div
            className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
            onClick={() => goToChat(1002)}
          >
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#3d5a65] rounded-full flex items-center justify-center text-white font-medium">
                EK
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                  Eko
                </h3>
                <span className="text-xs text-[#969692] flex-shrink-0">
                  10:30
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm truncate pr-2 text-[#969692]">
                  Aji, status laporan?
                </p>
                <div className="bg-[#566c57] text-white text-xs h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center">
                  1
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat with David */}
          <div
            className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
            onClick={() => goToChat(1003)}
          >
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#3d5a65] rounded-full flex items-center justify-center text-white font-medium">
                DA
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                  David
                </h3>
                <span className="text-xs text-[#969692] flex-shrink-0">
                  Kemarin
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm truncate pr-2 text-[#969692]">
                  Persiapan untuk operasi besok sudah selesai?
                </p>
              </div>
            </div>
          </div>
          
          {/* Recent Chat */}
          <div
            className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
            onClick={() => goToChat(1747549792121)}
          >
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#3d5a65] rounded-full flex items-center justify-center text-white font-medium">
                DA
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                  David (New)
                </h3>
                <span className="text-xs text-[#969692] flex-shrink-0">
                  Baru saja
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <p className="text-sm truncate pr-2 text-[#969692]">
                  chat dari eko untuk david
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
          <MessageSquare className="h-5 w-5" />
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Phone className="h-5 w-5" />
          <span className="text-xs mt-1">CALL</span>
        </div>
        
        <div 
          className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md"
          onClick={goToPersonnel}
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">PERSONNEL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <Users className="h-5 w-5" />
          <span className="text-xs mt-1">CONFIG</span>
        </div>
      </div>
    </div>
  );
}

export default HardcodedChatList;