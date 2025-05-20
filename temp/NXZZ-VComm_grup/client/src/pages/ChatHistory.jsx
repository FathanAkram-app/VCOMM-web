import React from 'react';

// Komponen untuk menampilkan daftar chat dengan sederhana
class ChatHistory extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chats: [],
      messages: [],
      currentUser: null,
      loading: true
    };
  }

  componentDidMount() {
    this.loadUserData();
    this.loadChats();
  }

  // Load data pengguna
  loadUserData() {
    try {
      const userData = localStorage.getItem('authCredentials');
      if (userData) {
        const user = JSON.parse(userData);
        this.setState({ currentUser: user });
      } else {
        console.log("No user data found in localStorage");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  // Load daftar chat
  loadChats() {
    try {
      // Load daftar chat dari berbagai localStorage keys
      const chatKeys = [
        'webSocketChats',
        'chat_list',
        'milcomm_chats',
        'mil_comm_chats',
        'mcomm_chats',
        'savedChats'
      ];

      let allChats = [];
      let foundData = false;

      // Coba semua kemungkinan key untuk chat
      for (const key of chatKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            console.log(`Found chat data in ${key}`);
            const chats = JSON.parse(data);
            if (Array.isArray(chats) && chats.length > 0) {
              allChats = [...allChats, ...chats];
              foundData = true;
            }
          } catch (e) {
            console.error(`Error parsing ${key}:`, e);
          }
        }
      }

      // Jika tidak menemukan data di localStorage, buat data contoh
      if (!foundData) {
        console.log("No chat data found, using sample data");
        allChats = [
          {
            id: 1001,
            type: 'group',
            name: 'Special Forces Team',
            displayName: 'Special Forces Team',
            lastMessage: 'Mission briefing tomorrow at 0800',
            lastMessageTime: new Date().toISOString(),
            participants: [7, 8, 9]
          },
          {
            id: 1002,
            type: 'direct',
            displayName: 'Eko',
            lastMessage: 'Aji, status laporan?',
            lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
            user1Id: 7,
            user2Id: 9
          },
          {
            id: 1003,
            type: 'direct',
            displayName: 'David',
            lastMessage: 'Persiapan untuk operasi besok sudah selesai?',
            lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
            user1Id: 8,
            user2Id: 9
          }
        ];
      }

      // Load pesan-pesan
      const messageKeys = [
        'webSocketMessages',
        'chat_messages',
        'milcomm_messages',
        'mil_comm_messages',
        'mcomm_messages',
        'savedMessages'
      ];

      let allMessages = [];

      for (const key of messageKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            console.log(`Found message data in ${key}`);
            const messages = JSON.parse(data);
            if (Array.isArray(messages) && messages.length > 0) {
              allMessages = [...allMessages, ...messages];
            }
          } catch (e) {
            console.error(`Error parsing ${key}:`, e);
          }
        }
      }

      console.log("Total chats found:", allChats.length);
      console.log("Total messages found:", allMessages.length);

      this.setState({
        chats: allChats,
        messages: allMessages,
        loading: false
      });
    } catch (error) {
      console.error("Error loading chats:", error);
      this.setState({ loading: false });
    }
  }

  // Format waktu untuk tampilan
  formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      
      // Today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Yesterday, show "Kemarin"
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Kemarin';
      }
      
      // Within a week, show day name
      const dayDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (dayDiff < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Older, show date
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    } catch (error) {
      return 'Tdk dikenal';
    }
  }

  // Buka halaman chat
  openChat(chatId) {
    window.location.href = `/chat/${chatId}`;
  }

  // Membuat chat room baru dengan pengguna lain
  createNewChat() {
    window.location.href = '/personnel';
  }

  render() {
    const { chats, loading } = this.state;

    if (loading) {
      return (
        <div className="flex flex-col h-screen bg-[#1f201c]">
          <div className="bg-[#2a2b25] px-4 py-3">
            <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#e0e0e0]">Loading communications...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-screen bg-[#1f201c]">
        {/* Header */}
        <div className="bg-[#2a2b25] px-4 py-3 flex justify-between items-center">
          <h1 className="text-[#e0e0e0] font-bold">COMMS</h1>
          <button
            className="text-[#bdc1c0] hover:text-white rounded-full p-1"
            onClick={() => this.createNewChat()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
        
        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#566c57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p className="text-[#969692] mt-4 mb-2">No communications available</p>
              <p className="text-[#969692]/70 text-sm">Start a new communication to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-[#3d3f35]/40">
              {chats.map(chat => (
                <div
                  key={chat.id}
                  className="flex items-center p-3 cursor-pointer hover:bg-[#2c2d27]"
                  onClick={() => this.openChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="relative mr-3">
                    <div className={`h-12 w-12 ${chat.type === 'group' ? 'bg-[#566c57]' : 'bg-[#3d5a65]'} rounded-full flex items-center justify-center text-white font-medium`}>
                      {chat.displayName && chat.displayName.substring(0, 2).toUpperCase()}
                    </div>
                    
                    {/* Badge for groups */}
                    {chat.type === 'group' && (
                      <div className="absolute -top-1 -right-1 bg-[#8b9c8c] rounded-full h-5 w-5 flex items-center justify-center text-xs text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Chat info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-[#e0e0e0] truncate pr-2">
                        {chat.displayName || chat.name || 'Chat'}
                      </h3>
                      <span className="text-xs text-[#969692] flex-shrink-0">
                        {this.formatTime(chat.lastMessageTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm truncate pr-2 text-[#969692]">
                        {chat.lastMessage || "No messages"}
                      </p>
                      
                      {chat.unreadCount > 0 && (
                        <div className="bg-[#566c57] text-white text-xs h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center">
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          
          <div className="flex flex-col items-center text-[#bdc1c0] hover:bg-[#3d3f35] hover:text-white px-4 py-2 rounded-md" onClick={() => window.location.href = '/personnel'}>
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
}

export default ChatHistory;