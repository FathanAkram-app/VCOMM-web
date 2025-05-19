import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
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

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callsign: values.callsign,
          password: values.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login gagal");
      }

      toast({
        title: "Login Berhasil",
        description: "Anda dialihkan ke halaman chat.",
      });

      // Redirect to chat on successful login
      setLocation("/chat");
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="auth-container">
        <div className="flex flex-col items-center mb-6">
          <div className="military-logo mb-4">
            <span className="text-xl font-bold text-white">
              VCOMM
            </span>
          </div>
          <h1 className="military-title">NXZZ COMMUNICATION SYSTEM</h1>
          <p className="military-subtitle mt-1">SECURE MILITARY COMMUNICATIONS</p>
        </div>
        
        <div className="auth-tabs">
          <Link href="/login" className="auth-tab active">
            LOGIN
          </Link>
          <Link href="/register" className="auth-tab">
            REGISTER
          </Link>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="callsign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="auth-label">CALLSIGN</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Masukkan callsign Anda" 
                      className="auth-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="auth-label">SECURITY CODE</FormLabel>
                    <div className="flex items-center space-x-1 text-[10px] bg-[#3a3a3a] px-2 py-1 rounded text-gray-400">
                      <Lock className="w-3 h-3" />
                      <span>ENCRYPTED</span>
                    </div>
                  </div>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Masukkan security code" 
                      className="auth-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="auth-btn mt-6 w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>SECURE LOGIN</span>
                </>
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <p className="military-notice">
            HANYA UNTUK PERSONEL RESMI
          </p>
          <p className="military-notice mt-1">
            AKSES TIDAK SAH AKAN DITINDAK SESUAI HUKUM YANG BERLAKU
          </p>
        </div>
      </div>
    </div>
  );
}