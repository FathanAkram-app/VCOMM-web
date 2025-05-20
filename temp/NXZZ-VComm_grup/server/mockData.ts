import { storage } from "./storage";
import { InsertUser, InsertRoom, InsertRoomMember, InsertDirectChat } from "@shared/schema";

// Military-themed personnel for testing
const mockUsers: InsertUser[] = [
  {
    username: "ALPHA1",
    password: "password",
    deviceInfo: "NRP: A123456 | Field Communications Unit"
  },
  {
    username: "BRAVO2",
    password: "password",
    deviceInfo: "NRP: B234567 | Command Center Terminal"
  },
  {
    username: "CHARLIE3",
    password: "password",
    deviceInfo: "NRP: C345678 | Mobile Tactical Device"
  },
  {
    username: "DELTA4",
    password: "password",
    deviceInfo: "NRP: D456789 | Intelligence Unit Terminal"
  },
  {
    username: "ECHO5",
    password: "password",
    deviceInfo: "NRP: E567890 | Operations Room Station"
  },
  {
    username: "FOXTROT6",
    password: "password",
    deviceInfo: "NRP: F678901 | Strategic Command Link"
  }
];

// Military-themed rooms for testing
const mockRooms: InsertRoom[] = [
  {
    name: "COMMAND_CENTER"
  },
  {
    name: "FIELD_OPS"
  },
  {
    name: "INTEL_BRIEFING"
  },
  {
    name: "LOGISTICS_CHANNEL"
  }
];

/**
 * Seeds the database with mock users and chat rooms for testing purposes.
 * This function should only be called in development/testing environments.
 */
export async function seedMockData() {
  console.log("Seeding mock data for testing...");
  
  // Deteksi platform untuk menangani seeding berbeda
  const isWindows = process.platform === 'win32';
  
  // Skip seeding di Windows karena sering menimbulkan masalah
  if (isWindows) {
    console.log("Platform Windows terdeteksi - mock data seeding akan diabaikan untuk menghindari error.");
    console.log("Mock data seeding complete.");
    return { users: [], rooms: [] };
  }
  
  try {
    // Create mock users if they don't exist
    const createdUsers = await Promise.all(
      mockUsers.map(async (userData) => {
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser) {
          return existingUser;
        }
        return await storage.createUser(userData);
      })
    );
    
    console.log(`Created ${createdUsers.length} test users`);
    
    // Create mock rooms if they don't exist
    const createdRooms = await Promise.all(
      mockRooms.map(async (roomData) => {
        // Check for existing room by name
        const existingRooms = await Promise.all(
          createdUsers.map(user => storage.getRoomsByUserId(user.id))
        );
        const flattenedRooms = existingRooms.flat();
        const existingRoom = flattenedRooms.find(room => room.name === roomData.name);
        
        if (existingRoom) {
          return existingRoom;
        }
        
        const newRoom = await storage.createRoom(roomData);
        
        // Add all users to the room
        await Promise.all(
          createdUsers.map(user => 
            storage.addUserToRoom({
              roomId: newRoom.id,
              userId: user.id
            })
          )
        );
        
        return newRoom;
      })
    );
    
    console.log(`Created ${createdRooms.length} test rooms`);
    
    // Create direct chats between users
    for (let i = 0; i < createdUsers.length; i++) {
      for (let j = i + 1; j < createdUsers.length; j++) {
        const user1 = createdUsers[i];
        const user2 = createdUsers[j];
        
        // Check if direct chat already exists
        const existingChat = await storage.getDirectChatByUsers(user1.id, user2.id);
        
        if (!existingChat) {
          await storage.createDirectChat({
            user1Id: user1.id,
            user2Id: user2.id
          });
        }
      }
    }
    
    console.log("Mock data seeding complete.");
    
    return {
      users: createdUsers,
      rooms: createdRooms
    };
  } catch (error) {
    console.error("Error seeding mock data:", error);
    console.log("Mock data seeding failed, but application will continue.");
    return { users: [], rooms: [] };
  }
}

// Function to remove all mock data (for cleanup)
export async function removeMockData() {
  console.log("Removing mock data...");
  
  // This would require additional storage methods to be implemented
  // For demonstration purposes, this function is a placeholder
  
  console.log("Mock data removal not implemented. Please reset the database manually.");
  
  return true;
}