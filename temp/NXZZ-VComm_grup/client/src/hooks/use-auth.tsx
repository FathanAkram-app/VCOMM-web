import { createContext, ReactNode, useContext, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveAuthData, clearAuthData, getAuthData, addAuthHeaders } from "../lib/authUtils";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: User }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: User }, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
  deviceInfo?: string;
};

type RegisterData = {
  username: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
  rank?: string;
  unit?: string;
  branch?: string;
  station?: string;
  bloodType?: string;
  securityClearance?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  nrp?: string;
  deviceInfo?: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data,
    error,
    isLoading,
  } = useQuery<{ user: User } | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (data: { user: User }) => {
      queryClient.setQueryData(["/api/user"], data);
      
      // Use authUtils untuk menyimpan data user di localStorage
      const { saveAuthData } = await import('../lib/authUtils');
      saveAuthData(data.user);
      
      toast({
        title: "Authentication Successful",
        description: `Welcome, ${data.user.username}. Secure communication channel established.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication Failed",
        description: error.message || "Invalid credentials. Access denied.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: User }) => {
      queryClient.setQueryData(["/api/user"], data);
      toast({
        title: "Registration Successful",
        description: "New personnel registered. Welcome to the secure communications network.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Could not register new personnel.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: async () => {
      // Use authUtils untuk menghapus data user dari localStorage
      const { clearAuthData } = await import('../lib/authUtils');
      clearAuthData();
      
      // Clear other authentication related storage
      localStorage.removeItem('authCredentials');
      
      // Clear react-query cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Secure Logout",
        description: "Communication channel terminated. You have been logged out.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Could not terminate session properly.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: data?.user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}