import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "./use-toast";

interface User {
  id: number;
  callsign: string;
  nrp: string;
  fullName: string;
  rank: string;
  branch: string;
}

interface RegisterData {
  callsign: string;
  nrp: string;
  password: string;
  fullName: string;
  rank: string;
  branch: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (callsign: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is already authenticated when app loads
  useEffect(() => {
    checkAuth();
  }, []);

  // Function to validate current authentication status
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/auth/me");
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (callsign: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callsign, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login gagal");
      }

      const userData = await response.json();
      setUser(userData);
      
      return userData;
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login gagal: Kredensial tidak valid");
    }
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registrasi gagal");
      }

      return await response.json();
    } catch (error: any) {
      console.error("Registration error:", error);
      throw new Error(error.message || "Registrasi gagal");
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Error",
        description: "Terjadi kesalahan saat logout. Silakan coba lagi.",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}