import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Login validation schema
const loginSchema = z.object({
  callsign: z.string().min(3, "Callsign minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      callsign: "",
      password: "",
    },
  });

  const { login } = useAuth();
  
  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      // Gunakan fungsi login dari useAuth
      await login(values.callsign, values.password);

      // Tampilkan notifikasi berhasil
      toast({
        title: "Login Berhasil",
        description: "Anda dialihkan ke halaman chat.",
      });

      // Redirect to chat on successful login dengan refresh halaman penuh
      console.log("Login berhasil, mengarahkan ke halaman chat...");
      window.location.href = "/chat";
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: error.message || "Kredensial tidak valid. Akses ditolak.",
      });
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
          <Link href="/login" className="bg-[#4d5d30] py-3 font-bold text-center text-white uppercase">
            LOGIN
          </Link>
          <Link href="/register" className="bg-[#33342f] py-3 font-bold text-center text-gray-400 uppercase">
            REGISTER
          </Link>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-gray-400 uppercase text-sm font-medium">SECURITY CODE / PASSWORD</FormLabel>
                    <div className="flex items-center space-x-1 text-[10px] bg-[#333333] px-2 py-1 rounded text-gray-400">
                      <Lock className="w-3 h-3" />
                      <span>ENCRYPTED</span>
                    </div>
                  </div>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="ENTER SECURITY CODE" 
                      className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <p className="uppercase text-center text-xs text-gray-500 mb-4">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.</p>
              
              <Button type="submit" disabled={isLoading} className="w-full bg-[#4d5d30] hover:bg-[#5a6b38] text-white py-3 font-bold uppercase tracking-wider">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    <span>SECURE LOGIN</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
        
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center mb-1">
            <AlertTriangle className="h-3 w-3 text-[#a6c455] mr-1" />
            <p className="text-[#a6c455] text-[10px] uppercase font-medium">INTRANET COMMUNICATIONS ONLY - CLASSIFIED</p>
          </div>
        </div>
      </div>
    </div>
  );
}