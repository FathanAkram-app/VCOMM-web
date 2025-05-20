import React from 'react';

// Komponen chat statis sederhana
export default function SimpleChatStatic() {
  return (
    <div className="flex flex-col h-screen bg-[#1f201c]">
      {/* Header */}
      <div className="bg-[#2a2b25] px-4 py-3">
        <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
      </div>
      
      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-[#3d3f35]/40">
          {/* Chat 1 */}
          <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]">
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#566c57] rounded-full flex items-center justify-center text-white">
                SF
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
          
          {/* Chat 2 */}
          <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]">
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#3d5a65] rounded-full flex items-center justify-center text-white">
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
              </div>
            </div>
          </div>
          
          {/* Chat 3 */}
          <div className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]">
            <div className="relative mr-3">
              <div className="h-12 w-12 bg-[#3d5a65] rounded-full flex items-center justify-center text-white">
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
        </div>
      </div>
      
      {/* Bottom navigation */}
      <div className="h-16 bg-[#2a2b25] border-t border-[#3d3f35] flex justify-around items-center">
        <div className="flex flex-col items-center text-white bg-[#354c36] px-4 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="text-xs mt-1">COMMS</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span className="text-xs mt-1">CALL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="text-xs mt-1">PERSONNEL</span>
        </div>
        
        <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span className="text-xs mt-1">CONFIG</span>
        </div>
      </div>
    </div>
  );
}