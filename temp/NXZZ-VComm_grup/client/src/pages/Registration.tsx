import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, AlertCircle, Lock, User } from "lucide-react";
import { simpleRegister } from "../lib/simpleAuth";

export default function Registration() {
  // Registration form states
  const [regUsername, setRegUsername] = useState("");
  const [regNrp, setRegNrp] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRank, setRegRank] = useState("");
  const [regBranch, setRegBranch] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regUsername.trim() || !regPassword.trim()) {
      toast({
        title: "Validasi Error",
        description: "Username dan password diperlukan",
        variant: "destructive"
      });
      return;
    }
    
    if (regPassword !== regConfirmPassword) {
      toast({
        title: "Validasi Error",
        description: "Password harus sama dengan konfirmasi password",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Coba mendaftarkan pengguna baru melalui API server
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          nrp: regNrp,
          fullName: regFullName,
          rank: regRank,
          branch: regBranch
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Registrasi gagal");
      }
      
      // Sebagai cadangan, juga daftarkan di localStorage untuk kompatibilitas
      simpleRegister(regUsername, regPassword, {
        nrp: regNrp,
        fullName: regFullName,
        rank: regRank,
        branch: regBranch
      });
      
      toast({
        title: "Registrasi Berhasil",
        description: "Silakan login dengan akun yang baru dibuat",
      });
      
      // Redirect ke login
      navigate("/");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registrasi Gagal",
        description: error.message || "Terjadi kesalahan saat mendaftar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[450px] shadow-lg border-2 border-accent">
        <CardHeader className="text-center space-y-1">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center border-2 border-accent">
              <ShieldAlert className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-wider uppercase text-primary">SECURE COMMS</CardTitle>
          <CardDescription className="text-muted-foreground">
            MILITARY PERSONNEL REGISTRATION
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleRegister}>
            <div className="grid gap-4">
              <div className="py-2 px-3 bg-primary/10 border border-accent/50">
                <p className="text-xs text-accent font-medium flex items-center">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  REGISTRATION FORM - COMPLETE ALL REQUIRED FIELDS
                </p>
              </div>
              
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="reg-username" className="text-sm font-bold uppercase">
                  CALL SIGN / USERNAME <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-username"
                  placeholder="ENTER CALLSIGN"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                />
              </div>
              
              {/* NRP */}
              <div className="space-y-2">
                <Label htmlFor="reg-nrp" className="text-sm font-bold uppercase">
                  NRP (SERVICE NUMBER) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-nrp"
                  placeholder="ENTER SERVICE NUMBER"
                  value={regNrp}
                  onChange={(e) => setRegNrp(e.target.value)}
                  required
                  className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                />
              </div>
              
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="reg-fullname" className="text-sm font-bold uppercase">
                  FULL NAME <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-fullname"
                  placeholder="ENTER FULL NAME"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                  className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                />
              </div>
              
              {/* Rank */}
              <div className="space-y-2">
                <Label htmlFor="reg-rank" className="text-sm font-bold uppercase">
                  RANK <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={regRank}
                  onValueChange={setRegRank}
                >
                  <SelectTrigger id="reg-rank" className="bg-muted border-accent">
                    <SelectValue placeholder="SELECT RANK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Private">PRIVATE</SelectItem>
                    <SelectItem value="Sergeant">SERGEANT</SelectItem>
                    <SelectItem value="Lieutenant">LIEUTENANT</SelectItem>
                    <SelectItem value="Captain">CAPTAIN</SelectItem>
                    <SelectItem value="Major">MAJOR</SelectItem>
                    <SelectItem value="Colonel">COLONEL</SelectItem>
                    <SelectItem value="General">GENERAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Branch */}
              <div className="space-y-2">
                <Label htmlFor="reg-branch" className="text-sm font-bold uppercase">
                  BRANCH / SERVICE <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={regBranch}
                  onValueChange={setRegBranch}
                >
                  <SelectTrigger id="reg-branch" className="bg-muted border-accent">
                    <SelectValue placeholder="SELECT BRANCH" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Army">ARMY</SelectItem>
                    <SelectItem value="Navy">NAVY</SelectItem>
                    <SelectItem value="Air Force">AIR FORCE</SelectItem>
                    <SelectItem value="Marines">MARINES</SelectItem>
                    <SelectItem value="Special Forces">SPECIAL FORCES</SelectItem>
                    <SelectItem value="Intelligence">INTELLIGENCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-sm font-bold uppercase flex items-center">
                  <span>PASSWORD <span className="text-destructive">*</span></span>
                  <span className="ml-2 inline-flex items-center px-1 py-0.5 text-xs military-badge">
                    <Lock className="h-3 w-3 mr-1" /> ENCRYPTED
                  </span>
                </Label>
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="ENTER PASSWORD"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                />
              </div>
              
              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password" className="text-sm font-bold uppercase">
                  CONFIRM PASSWORD <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="reg-confirm-password"
                  type="password"
                  placeholder="RE-ENTER PASSWORD"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                  className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                />
              </div>
              
              <Button 
                type="submit"
                className="w-full military-button text-lg uppercase font-bold tracking-wider h-12 mt-2"
                disabled={loading}
              >
                {loading ? "REGISTERING..." : "REGISTER PERSONNEL"}
              </Button>
            </div>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2 items-center text-xs text-muted-foreground">
          <div className="w-full text-center">
            SUDAH MEMILIKI AKUN? <Button 
              variant="link" 
              className="px-0 h-auto text-xs text-accent underline"
              onClick={() => navigate("/")}
            >
              LOGIN DISINI
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