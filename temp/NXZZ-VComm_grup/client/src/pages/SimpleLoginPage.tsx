import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useSimpleAuth } from "../lib/simpleAuthProvider";

export default function SimpleLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useSimpleAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Validasi Gagal",
        description: "Username dan password diperlukan",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Login dengan SimpleAuthProvider
      const success = login(username, password);
      
      if (success) {
        toast({
          title: "Login Berhasil",
          description: `Selamat datang, ${username}. Saluran komunikasi aman telah dibuka.`,
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
                <p>Gunakan salah satu akun berikut:</p>
                <p>username: aji, password: aji123</p>
                <p>username: eko, password: eko123</p>
                <p>username: david, password: david123</p>
              </div>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center text-xs text-muted-foreground">
          UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
        </CardFooter>
      </Card>
    </div>
  );
}