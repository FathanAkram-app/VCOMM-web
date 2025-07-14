import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Lock, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import iconPath from "@assets/Icon Chat NXXZ.png";
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
  const [showPassword, setShowPassword] = useState(false);
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
                <img 
                  src={iconPath} 
                  alt="NXXZ Chat Icon" 
                  className="w-16 h-16 object-contain"
                />
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