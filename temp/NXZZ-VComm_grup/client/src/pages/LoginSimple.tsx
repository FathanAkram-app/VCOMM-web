import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Import utility
import { saveAuthData, getAuthData } from "../lib/authUtils";
import { doStaticLogin } from "../lib/bypassAuth";

export default function LoginSimple() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nrp, setNrp] = useState("");
  const [loading, setLoading] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Cek apakah user sudah login saat komponen dimuat
  useEffect(() => {
    const authData = getAuthData();
    if (authData) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Validasi Error",
        description: "Username dan password diperlukan",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Gunakan static login yang tidak memerlukan koneksi server
      const userData = doStaticLogin(username, password);
      
      if (userData) {
        toast({
          title: "Login Berhasil",
          description: `Selamat datang, ${userData.username}. Saluran komunikasi aman telah dibuat.`,
        });
        
        // Redirect ke dashboard
        navigate("/dashboard");
      } else {
        throw new Error("Kredensial tidak valid");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Gagal",
        description: error.message || "Kredensial tidak valid. Akses ditolak.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px] shadow-lg border-2 border-accent">
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold tracking-wider uppercase text-primary">SECURE COMMS</CardTitle>
          <CardDescription className="text-muted-foreground">
            MILITARY PERSONNEL AUTHENTICATION REQUIRED
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">CALLSIGN / USERNAME</Label>
                <Input 
                  id="username" 
                  placeholder="Enter your call sign" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nrp">NRP / PERSONNEL ID</Label>
                <Input 
                  id="nrp" 
                  placeholder="Enter your personnel ID"
                  value={nrp}
                  onChange={(e) => setNrp(e.target.value)}
                  autoComplete="off"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">SECURITY CODE / PASSWORD <span className="text-xs opacity-70">• ENCRYPTED</span></Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your security code"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full font-bold tracking-wider"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : "LOGIN"}
              </Button>
              
              <div className="text-xs text-center text-muted-foreground mt-2">
                Gunakan username: aji, password: aji123 <br />
                atau username: eko, password: eko123
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2 items-center text-xs text-muted-foreground">
          <div className="w-full text-center mb-2">
            <div className="mb-2">BELUM TERDAFTAR?</div>
            <Button 
              variant="outline" 
              className="w-full text-sm font-bold text-accent border-accent hover:bg-accent/10"
              onClick={() => navigate("/register")}
            >
              DAFTAR DISINI
            </Button>
          </div>
          <div>
            UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}