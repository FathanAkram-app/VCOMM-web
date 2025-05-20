import { useState } from "react";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Settings } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useLocation } from "wouter";

export default function CameraConfigPage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  
  // Camera states
  const [bluetoothCamera, setBluetoothCamera] = useState("none");
  const [wifiCamera, setWifiCamera] = useState("none");
  const [usbCamera, setUsbCamera] = useState("default");
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="military-header px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-primary-foreground hover:bg-accent/30"
            onClick={() => navigate("/main")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold uppercase tracking-wider">CAMERA CONFIGURATION</h1>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto tab-content">
        <div className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-bold uppercase mb-4">DEVICE CONFIGURATION</h2>
            
            {/* Bluetooth Camera */}
            <div className="bg-muted rounded-sm p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold">BLUETOOTH CAMERA</p>
                  <p className="text-xs text-muted-foreground">Connect to Bluetooth video devices</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="military-button border-accent"
                  onClick={() => {
                    toast({
                      title: "BLUETOOTH SCAN INITIATED",
                      description: "Scanning for available Bluetooth camera devices...",
                      variant: "default"
                    });
                  }}
                >
                  SCAN
                </Button>
              </div>
              <Select 
                value={bluetoothCamera} 
                onValueChange={setBluetoothCamera}
              >
                <SelectTrigger className="w-full bg-background border-accent">
                  <SelectValue placeholder="No devices found" />
                </SelectTrigger>
                <SelectContent className="bg-background border-accent">
                  <SelectItem value="none">No devices found</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Wi-Fi Camera */}
            <div className="bg-muted rounded-sm p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold">WI-FI CAMERA</p>
                  <p className="text-xs text-muted-foreground">Connect to network cameras</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="military-button border-accent"
                  onClick={() => {
                    toast({
                      title: "NETWORK SCAN INITIATED",
                      description: "Scanning for available network camera devices...",
                      variant: "default"
                    });
                  }}
                >
                  SCAN
                </Button>
              </div>
              <Select 
                value={wifiCamera} 
                onValueChange={setWifiCamera}
              >
                <SelectTrigger className="w-full bg-background border-accent">
                  <SelectValue placeholder="No devices found" />
                </SelectTrigger>
                <SelectContent className="bg-background border-accent">
                  <SelectItem value="none">No devices found</SelectItem>
                  <SelectItem value="cam1">Network Camera (192.168.1.120)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* USB Camera */}
            <div className="bg-muted rounded-sm p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-bold">USB CAMERA</p>
                  <p className="text-xs text-muted-foreground">Connect to directly attached cameras</p>
                </div>
                <div className="military-badge text-xs bg-green-700 text-white px-2 py-1">DETECTED</div>
              </div>
              <Select 
                value={usbCamera} 
                onValueChange={setUsbCamera}
              >
                <SelectTrigger className="w-full bg-background border-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-accent">
                  <SelectItem value="default">Default Camera</SelectItem>
                  <SelectItem value="usb1">External USB Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mb-6">
            <h2 className="text-lg font-bold uppercase mb-4">VIDEO SETTINGS</h2>
            
            {/* Video Quality */}
            <div className="bg-muted rounded-sm p-4 mb-4">
              <div className="mb-3">
                <p className="font-bold">VIDEO QUALITY</p>
                <p className="text-xs text-muted-foreground mb-2">Adjust video transmission quality</p>
              </div>
              <Select defaultValue="medium">
                <SelectTrigger className="w-full bg-background border-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-accent">
                  <SelectItem value="low">LOW (Conserve Bandwidth)</SelectItem>
                  <SelectItem value="medium">MEDIUM (Balanced)</SelectItem>
                  <SelectItem value="high">HIGH (Clear Image)</SelectItem>
                  <SelectItem value="tactical">TACTICAL (Low Light)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Frame Rate */}
            <div className="bg-muted rounded-sm p-4 mb-4">
              <div className="mb-3">
                <p className="font-bold">FRAME RATE</p>
                <p className="text-xs text-muted-foreground mb-2">Adjust video transmission framerate</p>
              </div>
              <Select defaultValue="15">
                <SelectTrigger className="w-full bg-background border-accent">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-accent">
                  <SelectItem value="10">10 FPS (Minimal)</SelectItem>
                  <SelectItem value="15">15 FPS (Standard)</SelectItem>
                  <SelectItem value="24">24 FPS (Smooth)</SelectItem>
                  <SelectItem value="30">30 FPS (Maximum)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Apply button */}
          <Button 
            variant="default" 
            className="w-full military-button bg-accent hover:bg-accent/90 text-white"
            onClick={() => {
              toast({
                title: "CAMERA CONFIGURATION SAVED",
                description: "Your camera preferences have been updated successfully.",
                variant: "default"
              });
              
              // Navigate back to the main config page after saving
              setTimeout(() => {
                navigate("/main");
              }, 1000);
            }}
          >
            SAVE CAMERA CONFIGURATION
          </Button>
        </div>
      </div>
    </div>
  );
}