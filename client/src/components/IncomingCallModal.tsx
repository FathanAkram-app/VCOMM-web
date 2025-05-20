import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { Phone, Video } from "lucide-react";

export default function IncomingCallModal() {
  const { incomingCall, answerCall, rejectCall, isCallLoading } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="bg-background border-2 border-accent rounded-sm overflow-hidden w-5/6 max-w-sm shadow-2xl">
        <header className="bg-black px-4 py-3 text-center">
          <h3 className="text-lg font-bold uppercase tracking-wider text-white">INCOMING TRANSMISSION</h3>
        </header>
        
        <div className="p-6 flex flex-col items-center">
          <h4 className="text-lg font-bold uppercase mb-1">{incomingCall.callerName}</h4>
          <p className="text-accent font-medium uppercase mb-5">
            {incomingCall.callType === "video" ? "VIDEO" : "VOICE"} CHANNEL {incomingCall.isRoom ? ` - ${incomingCall.roomName}` : ""}
          </p>

          <div className="w-28 h-28 rounded-sm mb-5 bg-secondary border-2 border-accent overflow-hidden flex items-center justify-center">
            <span className="text-3xl font-bold text-secondary-foreground">
              {incomingCall.callerName.substring(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex justify-around w-full mt-2 gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="flex-1 h-16 rounded-sm border border-destructive uppercase font-bold"
              onClick={rejectCall}
              disabled={isCallLoading}
            >
              <Phone className="h-6 w-6 rotate-135 mr-2" />
              REJECT
            </Button>
            
            <Button
              variant="default"
              size="lg"
              className="flex-1 h-16 rounded-sm border uppercase font-bold"
              onClick={answerCall}
              disabled={isCallLoading}
            >
              {incomingCall.callType === "video" ? (
                <Video className="h-6 w-6 mr-2" />
              ) : (
                <Phone className="h-6 w-6 mr-2" />
              )}
              ACCEPT
            </Button>
          </div>
          
          {isCallLoading && (
            <div className="bg-muted px-4 py-2 rounded-sm mt-5 border border-accent">
              <p className="text-sm font-bold text-center uppercase">
                ESTABLISHING CONNECTION...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}