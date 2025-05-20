import React, { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import WhatsAppStyleChatRoom from "../components/WhatsAppStyleChatRoom";
import { useAuth } from "../hooks/use-auth";

export default function ChatRoomPage() {
  // Match any of the route patterns for chat rooms
  const [chatMatch, chatParams] = useRoute<{ id: string; type: string }>("/chat/:type/:id");
  const [roomMatch, roomParams] = useRoute<{ id: string }>("/room/:id");
  const [directMatch, directParams] = useRoute<{ id: string }>("/direct/:id");
  
  // Use the first matching route
  const match = chatMatch || roomMatch || directMatch;
  
  // Merge parameters based on which route matched
  const params = chatMatch 
    ? chatParams 
    : roomMatch 
      ? { ...roomParams, type: "room" } 
      : directMatch
        ? { ...directParams, type: "direct" }
        : null;
        
  console.log("ChatRoomPage route match:", { chatMatch, roomMatch, directMatch, params });
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [chatName, setChatName] = useState("");
  
  // Get chat details
  useEffect(() => {
    if (!params || !user) return;
    
    const chatId = parseInt(params.id);
    const isRoom = params.type === "room";
    
    // Mengambil nama dari API jika memungkinkan
    const fetchChatDetails = async () => {
      try {
        if (isRoom) {
          // Untuk room
          const roomName = localStorage.getItem(`room_${chatId}_name`);
          if (roomName) {
            setChatName(roomName);
          } else if (chatId === 1) {
            setChatName("OPERATION ALPHA");
          } else if (chatId === 2) {
            setChatName("TACTICAL TEAM BRAVO");
          } else if (chatId === 3) {
            setChatName("JOINT COMMAND CENTER");
          } else {
            setChatName(`OPERATION ${chatId}`);
          }
        } else {
          // Untuk direct chat dengan user
          // PENTING: Buat direct chat terlebih dahulu untuk memastikan ada entri di database
          console.log(`Membuat/memastikan direct chat untuk user ${user.id} dengan user ${chatId}`);
          
          try {
            const directChatResponse = await fetch("/api/chat/direct-chats", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${user.id}`
              },
              body: JSON.stringify({ userId: chatId })
            });
            
            if (directChatResponse.ok) {
              const result = await directChatResponse.json();
              console.log("Direct chat dibuat/ditemukan dengan ID:", result.id);
              
              // Buat pesan sistem awal jika ini chat baru
              if (result.isNewChat) {
                try {
                  const systemMsg = {
                    content: "Secure direct communication established.",
                    senderId: user.id,
                    directChatId: result.id,
                    classificationType: "routine"
                  };
                  
                  await fetch("/api/chat/messages", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${user.id}`
                    },
                    body: JSON.stringify(systemMsg)
                  });
                  
                  console.log("Pesan sistem awal dibuat untuk chat baru");
                } catch (e) {
                  console.error("Gagal membuat pesan sistem:", e);
                }
              }
            } else {
              console.error("Gagal membuat direct chat:", await directChatResponse.text());
            }
          } catch (e) {
            console.error("Error saat membuat direct chat:", e);
          }
          
          // Ambil informasi nama user dari API
          try {
            const userResponse = await fetch(`/api/users/${chatId}`, {
              headers: {
                "Authorization": `Bearer ${user.id}`
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              if (userData && userData.username) {
                setChatName(userData.username.toUpperCase());
                return;
              }
            }
          } catch (e) {
            console.error("Error mengambil detail user dari API:", e);
          }
          
          // Fallback ke hardcoded names jika API gagal
          if (chatId === 7) {
            setChatName("EKO");
          } else if (chatId === 8) {
            setChatName("DAVID");
          } else if (chatId === 9) {
            setChatName("AJI");
          } else if (chatId === 16) {
            setChatName("EKO"); // ID 16 adalah chat dengan Eko
          } else if (chatId === 17) {
            // Direct chat ID 17 adalah chat Eko-Aji
            if (user.id === 7) {
              setChatName("AJI"); // Jika user adalah Eko, tampilkan AJI sebagai lawan bicara
            } else if (user.id === 9) {
              setChatName("EKO"); // Jika user adalah Aji, tampilkan EKO sebagai lawan bicara
            } else {
              setChatName("SECURE CHAT"); // Untuk pengguna lain
            }
          } else if (chatId === 101) {
            setChatName("BRAVO2");
          } else if (chatId === 102) {
            setChatName("CHARLIE3");
          } else if (chatId === 103) {
            setChatName("DELTA4");
          } else {
            setChatName(`USER ${chatId}`);
          }
        }
      } catch (error) {
        console.error("Error fetching chat details:", error);
        setChatName(isRoom ? `OPERATION ${chatId}` : `USER ${chatId}`);
      }
    };
    
    fetchChatDetails();
  }, [params, user]);
  
  const handleBack = () => {
    console.log("Back button clicked - fixed direct navigation");
    
    // Set tab COMMS sebagai tab aktif
    localStorage.setItem('activeTab', 'chats');
    
    // Solusi langsung dan sederhana untuk mencegah layar putih:
    // Tetap tampilkan halaman saat ini sambil menjalankan navigasi
    
    // 1. Siapkan URL tujuan dengan timestamp untuk menghindari cache
    const timestamp = new Date().getTime();
    const destinationUrl = '/dashboard?t=' + timestamp;
    
    // 2. Buat iframe tersembunyi untuk memuat halaman tujuan di background
    const preloadFrame = document.createElement('iframe');
    preloadFrame.style.width = '0';
    preloadFrame.style.height = '0';
    preloadFrame.style.border = 'none';
    preloadFrame.style.position = 'absolute';
    preloadFrame.style.left = '-9999px';
    preloadFrame.src = destinationUrl;
    document.body.appendChild(preloadFrame);
    
    // 3. Pindahkan ke halaman tujuan setelah iframe mulai memuat
    // Ini akan langsung mengarahkan tanpa layar putih
    setTimeout(() => {
      window.location.replace(destinationUrl);
    }, 100);
  };
  
  if (!match || !params) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1f201c]">
        <div className="text-center">
          <p className="text-[#bdc1c0] mb-4">Invalid chat room</p>
          <button 
            onClick={() => navigate("/")}
            className="bg-[#566c57] hover:bg-[#668568] px-4 py-2 text-white rounded"
          >
            Return to Main Screen
          </button>
        </div>
      </div>
    );
  }
  
  const chatId = parseInt(params.id);
  const isRoom = params.type === "room";
  
  return (
    <div className="h-screen bg-[#1f201c] flex flex-col chat-room-page">
      <WhatsAppStyleChatRoom 
        chatId={chatId}
        isRoom={isRoom}
        chatName={chatName}
        onBack={handleBack}
      />
    </div>
  );
}