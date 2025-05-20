import { useLocation } from "wouter";
import { Shield, Lock, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export default function LandingPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background military-bg p-4">
      <Card className="max-w-xl w-full border-accent shadow-lg backdrop-blur-sm bg-background/95">
        <CardContent className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-2 text-accent">
            <Lock className="h-5 w-5" />
            <h1 className="text-2xl font-bold tracking-wider">MILITARY SECURE COMMUNICATION</h1>
          </div>
          
          {/* Title */}
          <div className="border-y border-accent py-4">
            <h2 className="text-xl font-bold text-center">Welcome, Authorized Personnel Only</h2>
          </div>
          
          {/* Description */}
          <div className="space-y-4 text-foreground">
            <p className="leading-relaxed">
              This is a <strong>classified military communication system</strong> intended for use by <strong>active duty personnel and authorized defense staff</strong>.
              All communications—chat, video call, and data transmission—are <strong>encrypted and monitored under military security protocols</strong>.
            </p>
            
            <div className="flex items-start space-x-2 p-3 bg-accent/10 border border-accent/50">
              <Shield className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm">
                Access to this system is restricted.
                Your <strong>Call Sign, Service Number (NRP), and Security Clearance</strong> will be required for authentication.
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-bold">By continuing, you acknowledge:</h3>
              <ul className="space-y-2 pl-6 list-disc">
                <li>You are entering a <strong>secure military communication network</strong>.</li>
                <li>Unauthorized access is strictly prohibited and subject to military law.</li>
                <li>All actions are logged and traceable.</li>
              </ul>
            </div>
            
            <blockquote className="border-l-4 border-accent pl-4 italic py-2">
              <p className="font-medium">Maintain Operational Security. Stay Vigilant. Stay Connected.</p>
            </blockquote>
          </div>
          
          {/* Action Button */}
          <div className="pt-4">
            <Button 
              className="w-full military-button text-lg uppercase font-bold tracking-wider h-12 group"
              onClick={() => setLocation("/auth")}
            >
              <Lock className="mr-2 h-5 w-5" />
              Authenticate Now
              <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          {/* Footer */}
          <div className="pt-4 flex items-center justify-center space-x-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            <p>Click the button to begin secure authentication.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}