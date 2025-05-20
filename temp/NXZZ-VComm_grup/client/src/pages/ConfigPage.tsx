import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Moon, Sun, ArrowLeft, ShieldAlert } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useLocation } from "wouter";

const ConfigPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [_, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <div className="container max-w-2xl py-6">
        <Button
          variant="outline"
          size="sm"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-accent">
          <CardHeader className="space-y-1 military-header pb-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-6 w-6" />
              <CardTitle className="text-xl font-bold uppercase">System Configuration</CardTitle>
            </div>
            <CardDescription className="text-primary-foreground/80">
              Adjust application settings and preferences
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Display Settings</h3>
              
              <Separator className="my-4 bg-accent/50" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-md">Theme Mode</h4>
                    <p className="text-sm text-muted-foreground">
                      Toggle between light and dark display modes
                    </p>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 border-accent"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-4 w-4" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-4 w-4" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Card 
                    className={`border-2 cursor-pointer transition-all p-4 ${theme === 'light' ? 'border-primary bg-accent/10' : 'border-muted hover:border-accent/50'}`}
                    onClick={() => theme === 'dark' && toggleTheme()}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium">Light Mode</h5>
                      <Sun className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">Standard display for daytime operation</p>
                  </Card>
                  
                  <Card 
                    className={`border-2 cursor-pointer transition-all p-4 ${theme === 'dark' ? 'border-primary bg-accent/10' : 'border-muted hover:border-accent/50'}`}
                    onClick={() => theme === 'light' && toggleTheme()}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium">Dark Mode</h5>
                      <Moon className="h-4 w-4" />
                    </div>
                    <p className="text-xs text-muted-foreground">Low-light display for night operations</p>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfigPage;