import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import iconPath from "@assets/Icon Chat NXXZ.png";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RANKS, BRANCHES } from "@shared/schema";

// Registration validation schema
const registerSchema = z.object({
  callsign: z.string().min(3, "Callsign minimal 3 karakter").max(30, "Callsign maksimal 30 karakter"),
  nrp: z.string().min(5, "NRP minimal 5 karakter").max(20, "NRP maksimal 20 karakter"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter").max(100, "Nama lengkap maksimal 100 karakter"),
  rank: z.string().min(1, "Pangkat diperlukan"),
  branch: z.string().min(1, "Satuan diperlukan"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi password diperlukan"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password dan konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      callsign: "",
      nrp: "",
      fullName: "",
      rank: "",
      branch: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      // Remove confirmPassword as it's not in the API schema
      const { confirmPassword, ...registerData } = values;
      
      // Tambahkan penanganan error untuk mencegah error WebSocket
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registerData),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Registrasi gagal");
        }
        
        toast({
          title: "Registrasi berhasil",
          description: "Anda akan dialihkan ke halaman login",
        });
        
        // Redirect to login after successful registration
        setLocation("/login");
      } catch (fetchError: any) {
        if (fetchError.name === "TypeError" && fetchError.message.includes("NetworkError")) {
          console.error("Network error during registration:", fetchError);
          throw new Error("Koneksi jaringan gagal. Pastikan server berjalan.");
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      // Tangani error WebSocket secara khusus
      if (error.name === "AggregateError" || error.code === "ECONNREFUSED") {
        toast({
          variant: "destructive",
          title: "Registrasi gagal",
          description: "Koneksi WebSocket gagal. Aplikasi masih berfungsi, silakan coba lagi."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Registrasi gagal",
          description: error.message || "Terjadi kesalahan saat registrasi",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#171717]">
      <div className="w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 relative mb-4">
            <div className="absolute inset-0 rounded-md bg-[#4d5d30] p-1">
              <div className="w-full h-full flex items-center justify-center bg-[#5a6b38] rounded-sm">
                <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#e0e0b0]">
                  <path fill="currentColor" d="M50,20 C60,20 70,25 75,35 C80,45 80,55 75,65 L90,80 L80,90 L65,75 C55,80 45,80 35,75 C25,70 20,60 20,50 C20,33 33,20 50,20 Z M45,45 C45,45 45,45 35,55 C35,55 35,55 45,65 C45,65 45,65 55,55 C55,55 55,55 45,45 Z" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-[#a6c455] text-xl font-bold tracking-wide">SECURE COMMS</h1>
          <p className="text-gray-400 text-xs uppercase tracking-wide mt-1">MILITARY PERSONNEL AUTHENTICATION REQUIRED</p>
        </div>
        
        <div className="grid grid-cols-2 mb-6">
          <Link href="/login" className="bg-[#33342f] py-3 font-bold text-center text-gray-400 uppercase">
            LOGIN
          </Link>
          <Link href="/register" className="bg-[#4d5d30] py-3 font-bold text-center text-white uppercase">
            REGISTER
          </Link>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="callsign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">CALLSIGN / USERNAME</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="ENTER CALLSIGN" 
                      className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nrp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">NRP / PERSONNEL ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="ENTER NRP" 
                      className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">FULL NAME</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="ENTER FULL NAME" 
                      className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 uppercase text-sm font-medium">RANK</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555] h-12">
                          <SelectValue placeholder="SELECT RANK" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#222222] border border-[#444444] text-white">
                        {RANKS.map((rank) => (
                          <SelectItem key={rank} value={rank} className="focus:bg-[#4d5d30] focus:text-white">
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-400 uppercase text-sm font-medium">BRANCH</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555] h-12">
                          <SelectValue placeholder="SELECT BRANCH" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#222222] border border-[#444444] text-white">
                        {BRANCHES.map((branch) => (
                          <SelectItem key={branch} value={branch} className="focus:bg-[#4d5d30] focus:text-white">
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">SECURITY CODE / PASSWORD</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="ENTER SECURITY CODE" 
                        className="w-full bg-[#222222] border border-[#444444] p-3 pr-14 text-white placeholder:text-[#555555]" 
                        {...field} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {showPassword ? (
                          <EyeOff className="w-6 h-6" />
                        ) : (
                          <Eye className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">CONFIRM SECURITY CODE</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        placeholder="CONFIRM SECURITY CODE" 
                        className="w-full bg-[#222222] border border-[#444444] p-3 pr-14 text-white placeholder:text-[#555555]" 
                        {...field} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-6 h-6" />
                        ) : (
                          <Eye className="w-6 h-6" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <p className="text-[#7a7a7a] text-xs uppercase text-center mt-4">
              BY REGISTERING, YOU ACCEPT ALL MILITARY COMMUNICATION PROTOCOLS.
            </p>
            
            <Button type="submit" disabled={isLoading} className="w-full bg-[#4d5d30] hover:bg-[#5a6b38] text-white py-3 font-bold uppercase tracking-wider mt-2">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>REGISTER PERSONNEL</span>
                </>
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-3 w-3 text-[#a6c455] mr-1" />
            <p className="text-[#a6c455] text-[10px] uppercase font-medium">INTRANET COMMUNICATIONS ONLY - CLASSIFIED</p>
          </div>
        </div>
      </div>
    </div>
  );
}