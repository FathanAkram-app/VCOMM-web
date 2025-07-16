import { useCall } from "../hooks/useCall";
import { Phone, PhoneOff, Video, VideoOff, Users } from "lucide-react";
import { useLocation } from "wouter";

export default function IncomingCallModal() {
  console.log("[IncomingCallModal] 🔥 COMPONENT RENDERED - START");
  
  const { incomingCall, acceptCall, rejectCall } = useCall();
  const [, setLocation] = useLocation();
  
  console.log("[IncomingCallModal] 🔥 After useCall hook - incomingCall:", incomingCall);
  console.log("[IncomingCallModal] 🔥 incomingCall type check:", typeof incomingCall);
  console.log("[IncomingCallModal] 🔥 incomingCall falsy check:", !incomingCall);
  
  if (!incomingCall) {
    console.log("[IncomingCallModal] No incoming call, returning null");
    return null;
  }
  
  console.log("[IncomingCallModal] ✅ SHOWING MODAL for call:", incomingCall.callId);
  console.log("[IncomingCallModal] Modal details:", {
    isGroupCall: incomingCall.isGroupCall,
    groupName: incomingCall.groupName,
    callType: incomingCall.callType,
    fromUser: incomingCall.peerName
  });

  const isGroupCall = incomingCall.isGroupCall;
  const isVideoCall = incomingCall.callType === 'video';

  // Handle reject with navigation back to chat
  const handleRejectCall = () => {
    console.log("[IncomingCallModal] 🚫 Rejecting call and redirecting to chat");
    rejectCall();
    
    // Navigate back to chat page after rejecting call
    setTimeout(() => {
      setLocation('/');
    }, 100); // Small delay to ensure reject call is processed first
  };
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-400 rounded-2xl p-8 max-w-md w-full mx-4 text-white shadow-2xl">
        
        {/* Call Type Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-amber-500 rounded-full p-4">
            {isGroupCall ? (
              <Users className="h-12 w-12 text-slate-900" />
            ) : isVideoCall ? (
              <Video className="h-12 w-12 text-slate-900" />
            ) : (
              <Phone className="h-12 w-12 text-slate-900" />
            )}
          </div>
        </div>

        {/* Call Info */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-amber-400 mb-2">
            {isGroupCall ? '📞 PANGGILAN GRUP' : isVideoCall ? '📹 VIDEO CALL' : '📞 PANGGILAN MASUK'}
          </h1>
          
          {isGroupCall ? (
            <>
              <p className="text-2xl font-bold mb-2">{incomingCall.groupName || 'Grup Tidak Dikenal'}</p>
              <p className="text-lg text-slate-300">Dari: {incomingCall.peerName || 'Pengguna Tidak Dikenal'}</p>
            </>
          ) : (
            <p className="text-2xl font-bold mb-2">{incomingCall.peerName || 'Pengguna Tidak Dikenal'}</p>
          )}
          
          <div className="flex items-center justify-center gap-2 mt-2 text-amber-400">
            {isVideoCall ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            <span className="text-sm">{isVideoCall ? 'Video Call' : 'Audio Call'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Accept Button */}
          <button 
            onClick={acceptCall}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
          >
            {isVideoCall ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            TERIMA
          </button>
          
          {/* Reject Button */}
          <button 
            onClick={handleRejectCall}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold transition-all duration-200 transform hover:scale-105 flex items-center gap-2 shadow-lg"
          >
            <PhoneOff className="h-5 w-5" />
            TOLAK
          </button>
        </div>

        {/* Call Duration Indicator */}
        <div className="text-center mt-4">
          <div className="inline-flex items-center gap-2 bg-slate-700 px-3 py-1 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Menunggu respons...</span>
          </div>
        </div>
      </div>
    </div>
  );
}