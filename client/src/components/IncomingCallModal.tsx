import { useCall } from "../hooks/useCall";
import { Button } from "./ui/button";
import { Phone, PhoneOff, Volume2 } from "lucide-react";

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useCall();
  
  console.log("[IncomingCallModal] Rendering with incomingCall:", incomingCall);
  
  if (!incomingCall) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 border border-green-500 p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Incoming Call Header */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#a6c455] uppercase tracking-wide mb-2">
              {incomingCall.isGroupCall ? 'INCOMING GROUP' : 'INCOMING'} {incomingCall.callType?.toUpperCase()} TRANSMISSION
            </h2>
            <div className="h-px bg-[#a6c455] mx-8"></div>
          </div>
          
          {/* Caller Avatar */}
          <div className="w-24 h-24 rounded-none bg-[#333333] border-4 border-[#a6c455] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-[#a6c455]">
              {incomingCall.isGroupCall 
                ? (incomingCall.groupName ? incomingCall.groupName.substring(0, 2).toUpperCase() : 'GR')
                : (incomingCall.peerName ? incomingCall.peerName.substring(0, 2).toUpperCase() : '??')
              }
            </span>
          </div>
          
          {/* Caller Information */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white uppercase tracking-wider mb-1">
              {incomingCall.isGroupCall 
                ? `GRUP ${incomingCall.groupName || 'UNKNOWN'}`
                : (incomingCall.peerName || 'UNKNOWN OPERATOR')
              }
            </h3>
            <p className="text-sm text-[#a6c455] font-medium">
              {incomingCall.isGroupCall 
                ? `${incomingCall.peerName} MEMULAI PANGGILAN GRUP`
                : `REQUESTING ${incomingCall.callType?.toUpperCase()} CONNECTION`
              }
            </p>
          </div>
          
          {/* Call Type Indicator */}
          <div className="bg-[#2a2a2a] border border-[#a6c455] px-4 py-2 mb-8 inline-block">
            <div className="flex items-center justify-center space-x-2">
              {incomingCall.callType === 'audio' ? (
                <Volume2 className="h-4 w-4 text-[#a6c455]" />
              ) : (
                <Phone className="h-4 w-4 text-[#a6c455]" />
              )}
              <span className="text-[#a6c455] font-bold text-sm uppercase">
                {incomingCall.callType} CALL
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center space-x-6">
            <Button 
              variant="destructive" 
              size="icon" 
              className="w-16 h-16 rounded-sm bg-red-600 hover:bg-red-700 border-2 border-red-500"
              onClick={rejectCall}
            >
              <PhoneOff className="h-7 w-7" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="w-16 h-16 rounded-sm bg-green-600 hover:bg-green-700 border-2 border-green-500 text-white"
              onClick={acceptCall}
            >
              <Phone className="h-7 w-7" />
            </Button>
          </div>
          
          {/* Instruction Text */}
          <div className="mt-6 text-xs text-gray-400 uppercase tracking-wide">
            <p>DECLINE ← → ACCEPT</p>
          </div>
        </div>
      </div>
    </div>
  );
}