import { useState } from "react";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../hooks/useAuth";
import { Shield, Lock, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Registration validation schema
const registerSchema = z.object({
  callsign: z.string().min(3, "Callsign minimal 3 karakter"),
  nrp: z.string().min(1, "NRP harus diisi"),
  fullName: z.string().min(1, "Nama lengkap harus diisi"),
  rank: z.string().min(1, "Pangkat harus dipilih"),
  branch: z.string().min(1, "Kesatuan/matra harus dipilih"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  passwordConfirm: z.string().min(6, "Konfirmasi password minimal 6 karakter"),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Password dan konfirmasi password tidak cocok",
  path: ["passwordConfirm"]
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { registerMutation } = useAuth();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      callsign: "",
      nrp: "",
      fullName: "",
      rank: "",
      branch: "",
      password: "",
      passwordConfirm: "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      // Gunakan fungsi register dari useAuth
      await registerMutation.mutateAsync(values);

      // Tampilkan notifikasi berhasil
      toast({
        title: "Registrasi Berhasil",
        description: "Akun Anda telah dibuat. Anda telah login otomatis.",
      });

      // Redirect ke halaman chat
      console.log("Registrasi berhasil, mengarahkan ke halaman chat...");
      window.location.href = "/chat";
    } catch (error: any) {
      console.error("Registrasi error:", error);
      toast({
        variant: "destructive",
        title: "Registrasi Gagal",
        description: error.message || "Terjadi kesalahan saat registrasi. Silakan coba lagi.",
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
          <p className="text-gray-400 text-xs uppercase tracking-wide mt-1">MILITARY PERSONNEL REGISTRATION</p>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="py-2 px-3 bg-[#333333] border border-[#444444] mb-5">
              <p className="text-xs text-gray-300 font-medium flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1 text-[#a6c455]" />
                <span>LENGKAPI FORMULIR REGISTRASI PERSONEL MILITER</span>
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="callsign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">CALL SIGN / USERNAME</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="MASUKKAN CALLSIGN" 
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
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">NRP / NOMOR REGISTER PUSAT</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="MASUKKAN NRP" 
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
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">NAMA LENGKAP</FormLabel>
                  <FormControl>
                    <Input 
                      type="text" 
                      placeholder="MASUKKAN NAMA LENGKAP" 
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
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">PANGKAT</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]">
                        <SelectValue placeholder="PILIH PANGKAT" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#222222] border border-[#444444] text-white">
                      <SelectItem value="Letnan Dua">LETNAN DUA</SelectItem>
                      <SelectItem value="Letnan Satu">LETNAN SATU</SelectItem>
                      <SelectItem value="Kapten">KAPTEN</SelectItem>
                      <SelectItem value="Mayor">MAYOR</SelectItem>
                      <SelectItem value="Letnan Kolonel">LETNAN KOLONEL</SelectItem>
                      <SelectItem value="Kolonel">KOLONEL</SelectItem>
                      <SelectItem value="Brigadir Jenderal">BRIGADIR JENDERAL</SelectItem>
                      <SelectItem value="Mayor Jenderal">MAYOR JENDERAL</SelectItem>
                      <SelectItem value="Letnan Jenderal">LETNAN JENDERAL</SelectItem>
                      <SelectItem value="Jenderal">JENDERAL</SelectItem>
                      <SelectItem value="Sersan">SERSAN</SelectItem>
                      <SelectItem value="Sersan Mayor">SERSAN MAYOR</SelectItem>
                      <SelectItem value="Sersan Kepala">SERSAN KEPALA</SelectItem>
                      <SelectItem value="Prajurit">PRAJURIT</SelectItem>
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
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">KESATUAN / MATRA</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]">
                        <SelectValue placeholder="PILIH KESATUAN" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[#222222] border border-[#444444] text-white">
                      <SelectItem value="AD">TNI AD</SelectItem>
                      <SelectItem value="AL">TNI AL</SelectItem>
                      <SelectItem value="AU">TNI AU</SelectItem>
                      <SelectItem value="POLRI">POLRI</SelectItem>
                      <SelectItem value="Marinir">MARINIR</SelectItem>
                      <SelectItem value="Komando">KOMANDO</SelectItem>
                      <SelectItem value="Kopassus">KOPASSUS</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">PASSWORD</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="MASUKKAN PASSWORD" 
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
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-400 uppercase text-sm font-medium">KONFIRMASI PASSWORD</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="KONFIRMASI PASSWORD" 
                      className="w-full bg-[#222222] border border-[#444444] p-3 text-white placeholder:text-[#555555]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 text-xs" />
                </FormItem>
              )}
            />
            
            <div className="pt-2">
              <Button type="submit" disabled={isLoading || registerMutation.isPending} className="w-full bg-[#4d5d30] hover:bg-[#5a6b38] text-white py-3 font-bold uppercase tracking-wider">
                {isLoading || registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <span>REGISTER</span>
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