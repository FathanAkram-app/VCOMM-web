import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, AlertCircle, Lock } from "lucide-react";

export default function LoginPage() {
  // Login form states
  const [callsign, setCallsign] = useState("");
  const [password, setPassword] = useState("");
  
  // Registration form states
  const [regCallsign, setRegCallsign] = useState("");
  const [regNrp, setRegNrp] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRank, setRegRank] = useState("");
  const [regBranch, setRegBranch] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  
  const { loginMutation, registerMutation, authError } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (callsign.trim() && password.trim()) {
      loginMutation.mutate({ 
        callsign, 
        password 
      });
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regCallsign.trim() || !regPassword.trim()) {
      return; // Basic validation
    }
    
    if (regPassword !== regConfirmPassword) {
      alert("Password tidak cocok!");
      return;
    }
    
    // Register the user
    registerMutation.mutate({
      callsign: regCallsign,
      password: regPassword,
      passwordConfirm: regConfirmPassword,
      nrp: regNrp,
      fullName: regFullName,
      rank: regRank,
      branch: regBranch
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      {authError && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600 text-red-600 rounded max-w-md w-full">
          <p className="text-sm font-medium">{authError}</p>
        </div>
      )}
      
      <Card className="w-full max-w-md border-2 border-accent bg-background shadow-md">
        <CardHeader className="space-y-1 text-center military-header">
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 rounded-sm bg-secondary text-secondary-foreground flex items-center justify-center border-2 border-accent">
              <ShieldAlert className="h-10 w-10" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-wider uppercase text-primary-foreground">SECURE COMMS</CardTitle>
          <CardDescription className="text-primary-foreground/80 font-medium">
            MILITARY PERSONNEL AUTHENTICATION REQUIRED
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <div className="border-b border-accent">
            <TabsList className="grid grid-cols-2 w-full bg-background">
              <TabsTrigger 
                value="login"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold rounded-none border-r border-accent"
              >
                LOGIN
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground font-bold rounded-none"
              >
                REGISTER
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Login Tab */}
          <TabsContent value="login" className="m-0">
            <CardContent className="p-6">
              <form onSubmit={handleLogin}>
                <div className="grid gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="callsign" className="text-sm font-bold uppercase">CALLSIGN / USERNAME</Label>
                    <Input
                      id="callsign"
                      placeholder="ENTER CALLSIGN"
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value)}
                      required
                      className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-bold uppercase flex items-center">
                      <span>SECURITY CODE / PASSWORD</span>
                      <span className="ml-2 inline-flex items-center px-1 py-0.5 text-xs military-badge">
                        <Lock className="h-3 w-3 mr-1" /> ENCRYPTED
                      </span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="ENTER SECURITY CODE"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                    />
                    <div className="py-2 px-3 bg-primary/10 border border-accent/50 mt-2">
                      <p className="text-xs text-accent font-medium">
                        UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
            
            <CardFooter className="border-t border-accent p-6">
              <Button 
                className="w-full military-button text-lg uppercase font-bold tracking-wider h-12" 
                onClick={handleLogin}
                disabled={loginMutation.isPending || !callsign.trim() || !password.trim()}
              >
                {loginMutation.isPending ? "AUTHENTICATING..." : "SECURE LOGIN"}
              </Button>
            </CardFooter>
          </TabsContent>
          
          {/* Registration Tab */}
          <TabsContent value="register" className="m-0">
            <CardContent className="p-6">
              <form onSubmit={handleRegister} className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid gap-5">
                  <div className="py-2 px-3 bg-primary/10 border border-accent/50">
                    <p className="text-xs text-accent font-medium flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      LENGKAPI FORM REGISTRASI PERSONEL MILITER
                    </p>
                  </div>
                  
                  {/* Call Sign / Username */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-callsign" className="text-sm font-bold uppercase">
                      CALL SIGN / USERNAME
                    </Label>
                    <Input
                      id="reg-callsign"
                      placeholder="ENTER CALLSIGN"
                      value={regCallsign}
                      onChange={(e) => setRegCallsign(e.target.value)}
                      required
                      className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                    />
                  </div>
                  
                  {/* NRP */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-nrp" className="text-sm font-bold uppercase">
                      NRP / NOMOR REGISTER PUSAT
                    </Label>
                    <Input
                      id="reg-nrp"
                      placeholder="ENTER NRP"
                      value={regNrp}
                      onChange={(e) => setRegNrp(e.target.value)}
                      required
                      className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                    />
                  </div>
                  
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-fullname" className="text-sm font-bold uppercase">
                      NAMA LENGKAP
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
                      PANGKAT
                    </Label>
                    <Select
                      value={regRank}
                      onValueChange={setRegRank}
                    >
                      <SelectTrigger id="reg-rank" className="bg-muted border-accent">
                        <SelectValue placeholder="PILIH PANGKAT" />
                      </SelectTrigger>
                      <SelectContent>
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
                  </div>
                  
                  {/* Branch */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-branch" className="text-sm font-bold uppercase">
                      KESATUAN / MATRA
                    </Label>
                    <Select
                      value={regBranch}
                      onValueChange={setRegBranch}
                    >
                      <SelectTrigger id="reg-branch" className="bg-muted border-accent">
                        <SelectValue placeholder="PILIH KESATUAN" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AD">TNI AD</SelectItem>
                        <SelectItem value="AL">TNI AL</SelectItem>
                        <SelectItem value="AU">TNI AU</SelectItem>
                        <SelectItem value="POLRI">POLRI</SelectItem>
                        <SelectItem value="Marinir">MARINIR</SelectItem>
                        <SelectItem value="Komando">KOMANDO</SelectItem>
                        <SelectItem value="Kopassus">KOPASSUS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-bold uppercase">
                      PASSWORD
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
                      KONFIRMASI PASSWORD
                    </Label>
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      placeholder="CONFIRM PASSWORD"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required
                      className="bg-muted border-accent font-medium placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit"
                  className="w-full military-button text-lg uppercase font-bold tracking-wider h-12 mt-6" 
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "PROCESSING..." : "REGISTER"}
                </Button>
              </form>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}