import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Login validation schema
const loginSchema = z.object({
  callsign: z.string().min(1, "Callsign diperlukan"),
  password: z.string().min(1, "Password diperlukan"),
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
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      
      // Redirect to chat on successful login
      setLocation("/chat");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login gagal",
        description: error.message || "Callsign atau password tidak valid",
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel className="auth-label">PASSWORD</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Masukkan password Anda" 
                      className="auth-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="auth-btn mt-6 w-full">
              {isLoading ? "MENGAUTENTIKASI..." : "LOGIN"}
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