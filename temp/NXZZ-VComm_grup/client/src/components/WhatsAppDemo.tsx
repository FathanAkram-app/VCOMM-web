import React, { useState } from 'react';
import { Button } from './ui/button';
import { Users, Info } from 'lucide-react';

interface WhatsAppDemoProps {
  onClose: () => void;
}

const WhatsAppDemo: React.FC<WhatsAppDemoProps> = ({ onClose }) => {
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  
  const handleShowGroupMembers = () => {
    const memberInfo = `
Grup: Beta
Total Anggota: 3
Status Anda: Anggota Biasa

Admin:
eko (Admin)

Anggota:
aji
agus (Anda)
    `;
    
    alert(memberInfo);
  };
  
  return (
    <div className="bg-slate-900 min-h-screen flex flex-col">
      <div className="bg-gray-800 p-3 text-white text-center">
        <h1 className="text-xl font-bold">WhatsApp-like UI Demo</h1>
        <p className="text-sm text-gray-300">Demonstrasi klik nama grup/profil</p>
      </div>
      
      {/* Chat List */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <h2 className="text-white font-medium mb-2">Grup-grup Anda:</h2>
        
        <div className="bg-gray-800 rounded p-3 mb-3 cursor-pointer hover:bg-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white font-medium">Beta</h3>
              <p className="text-sm text-gray-400">3 anggota</p>
            </div>
            <div className="flex">
              <Button 
                variant="outline"
                size="sm"
                className="bg-green-700 text-white hover:bg-green-800 border-none mr-2"
                onClick={handleShowGroupMembers}
              >
                <Users size={16} className="mr-1" />
                ANGGOTA GRUP
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
                onClick={() => setShowGroupInfo(!showGroupInfo)}
              >
                <Info size={20} />
              </Button>
            </div>
          </div>
          {showGroupInfo && (
            <div className="mt-3 p-3 bg-gray-700 rounded text-white">
              <h4 className="font-medium">Info Grup Beta</h4>
              <p className="text-sm mt-1">Grup operasi khusus untuk tim Beta</p>
              <p className="text-sm mt-1">Dibuat: 19 Mei 2025</p>
              <div className="mt-2">
                <h5 className="text-sm font-medium">Anggota:</h5>
                <ul className="text-sm mt-1">
                  <li>eko (Admin)</li>
                  <li>aji</li>
                  <li>agus (Anda)</li>
                </ul>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3 w-full"
                onClick={() => setShowGroupInfo(false)}
              >
                Tutup
              </Button>
            </div>
          )}
        </div>
        
        <div className="bg-gray-800 rounded p-3 cursor-pointer hover:bg-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white font-medium">Alpha</h3>
              <p className="text-sm text-gray-400">3 anggota</p>
            </div>
            <div>
              <Button 
                variant="outline"
                size="sm"
                className="bg-green-700 text-white hover:bg-green-800 border-none mr-2"
                onClick={() => {
                  alert(`
Grup: Alpha
Total Anggota: 3
Status Anda: Anggota Biasa

Admin:
eko (Admin)

Anggota:
david
agus (Anda)
                  `);
                }}
              >
                <Users size={16} className="mr-1" />
                ANGGOTA GRUP
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white"
              >
                <Info size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="p-4 text-white">
        <h2 className="font-medium">Bagaimana WhatsApp-like UI bekerja:</h2>
        <ul className="list-disc pl-5 mt-2 text-sm">
          <li className="mb-1">Tombol <strong>ANGGOTA GRUP</strong> (hijau) menampilkan daftar anggota grup dalam popup</li>
          <li className="mb-1">Tombol <strong>Info</strong> (i) menampilkan informasi lengkap grup</li>
          <li className="mb-1">Nama grup dapat diklik untuk melihat detailnya</li>
        </ul>
        
        <Button 
          className="mt-4 w-full"
          onClick={onClose}
        >
          Kembali ke Aplikasi Utama
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppDemo;