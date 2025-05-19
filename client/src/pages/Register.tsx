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
      
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerData),
      });
      
      toast({
        title: "Registrasi berhasil",
        description: "Anda akan dialihkan ke halaman chat",
      });
      
      // Redirect to chat on successful registration
      setLocation("/chat");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        variant: "destructive",
        title: "Registrasi gagal",
        description: error.message || "Terjadi kesalahan saat registrasi",
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
          <Link href="/login" className="auth-tab">
            LOGIN
          </Link>
          <Link href="/register" className="auth-tab active">
            REGISTER
          </Link>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
              name="nrp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="auth-label">NRP/ID</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Masukkan NRP/ID Anda" 
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
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="auth-label">NAMA LENGKAP</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="Masukkan nama lengkap Anda" 
                      className="auth-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="auth-label">PANGKAT</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="auth-input">
                          <SelectValue placeholder="Pilih pangkat" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RANKS.map((rank) => (
                          <SelectItem key={rank} value={rank}>
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="auth-label">SATUAN</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="auth-input">
                          <SelectValue placeholder="Pilih satuan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BRANCHES.map((branch) => (
                          <SelectItem key={branch} value={branch}>
                            {branch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="auth-label">PASSWORD</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Masukkan password" 
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="auth-label">KONFIRMASI PASSWORD</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Konfirmasi password" 
                      className="auth-input" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" disabled={isLoading} className="auth-btn mt-6 w-full">
              {isLoading ? "MENDAFTARKAN..." : "REGISTER"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-4 text-center">
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