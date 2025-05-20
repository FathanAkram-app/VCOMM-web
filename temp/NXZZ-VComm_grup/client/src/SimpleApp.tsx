import { useState, useEffect } from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import MainLayout from "./pages/MainLayoutNew";

// Sangat sederhana - pengguna statis tanpa database
const USERS: Record<string, any> = {
  "aji": {
    id: 9, 
    username: "aji",
    password: "aji123",
    nrp: "1003",
    name: "Aji S",
    role: "user",
    rank: "Sergeant",
    unit: "Special Forces",
  },
  "eko": {
    id: 7,
    username: "eko",
    password: "eko123",
    nrp: "1001",
    name: "Eko P",
    role: "admin",
    rank: "Colonel",
    unit: "Special Forces",
  },
  "david": {
    id: 8,
    username: "david",
    password: "david123",
    nrp: "1002",
    name: "David R",
    role: "user",
    rank: "Colonel",
    unit: "Special Forces",
  }
};

// Context untuk menyimpan state auth
export interface User {
  id: number;
  username: string;
  nrp?: string;
  name?: string;
  role?: string;
  rank?: string;
  unit?: string;
}

// Komponen untuk halaman login sederhana
function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    // Cek apakah username ada di daftar pengguna
    const user = USERS[username.toLowerCase()];
    
    if (!user) {
      setError("Pengguna tidak ditemukan");
      setIsLoading(false);
      return;
    }
    
    // Cek apakah password sesuai
    if (user.password !== password) {
      setError("Password tidak valid");
      setIsLoading(false);
      return;
    }
    
    // Simpan data pengguna ke localStorage
    localStorage.setItem("currentUser", JSON.stringify({
      ...user,
      isAuthenticated: true
    }));
    
    // Redirect ke dashboard setelah 500ms untuk efek loading
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 500);
  };
  
  // Cek apakah pengguna sudah login
  useEffect(() => {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.isAuthenticated) {
          window.location.href = "/dashboard";
        }
      } catch (error) {
        localStorage.removeItem("currentUser");
      }
    }
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-[350px] p-6 rounded-lg shadow-lg border-2 border-accent bg-card">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-wider uppercase text-primary">SECURE COMMS</h1>
          <p className="text-muted-foreground text-sm">
            MILITARY PERSONNEL AUTHENTICATION REQUIRED
          </p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">CALLSIGN / USERNAME</label>
              <input 
                id="username" 
                className="w-full px-3 py-2 border rounded-md bg-background" 
                placeholder="Enter your call sign" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                SECURITY CODE / PASSWORD <span className="text-xs opacity-70">• ENCRYPTED</span>
              </label>
              <input 
                id="password" 
                className="w-full px-3 py-2 border rounded-md bg-background"
                type="password" 
                placeholder="Enter your security code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm py-1">
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full py-2 rounded-md font-bold tracking-wider bg-primary text-primary-foreground"
              disabled={isLoading}
            >
              {isLoading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
            
            <div className="text-xs text-center text-muted-foreground mt-2">
              <p>Gunakan salah satu akun berikut:</p>
              <p>username: aji, password: aji123</p>
              <p>username: eko, password: eko123</p>
              <p>username: david, password: david123</p>
            </div>
          </div>
        </form>
        
        <div className="flex justify-center text-xs text-muted-foreground mt-6">
          UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED.
        </div>
      </div>
    </div>
  );
}

// Komponen untuk protected routes
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType, path: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const userData = localStorage.getItem("currentUser");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsAuthenticated(!!user.isAuthenticated);
      } catch (error) {
        setIsAuthenticated(false);
        localStorage.removeItem("currentUser");
      }
    } else {
      setIsAuthenticated(false);
    }
  }, []);
  
  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-accent font-bold">
          AUTHENTICATING...
        </div>
      </div>
    );
  }
  
  if (isAuthenticated === false) {
    return <Redirect to="/" />;
  }
  
  return <Component />;
}

// Main App component
export default function SimpleApp() {
  return (
    <TooltipProvider>
      <Toaster />
        <Switch>
          <Route path="/" component={LoginPage} />
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={MainLayout} />
          </Route>
          <Route path="/chat/:type/:id">
            <ProtectedRoute path="/chat/:type/:id" component={MainLayout} />
          </Route>
          <Route path="/:tab">
            <ProtectedRoute path="/:tab" component={MainLayout} />
          </Route>
        </Switch>
    </TooltipProvider>
  );
}