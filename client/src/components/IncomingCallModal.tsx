import { useCall } from "../hooks/useCall";

export default function IncomingCallModal() {
  console.log("[IncomingCallModal] 🔥 COMPONENT RENDERED - START");
  
  const { incomingCall, acceptCall, rejectCall } = useCall();
  
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
  
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-red-900/90 backdrop-blur-sm">
      <div className="bg-red-600 border-4 border-yellow-400 p-8 max-w-md w-full mx-4 text-white font-bold text-center">
        <h1 className="text-2xl mb-4">🚨 INCOMING GROUP CALL 🚨</h1>
        <p className="text-xl mb-4">{incomingCall.groupName || 'Unknown Group'}</p>
        <p className="text-lg mb-4">From: {incomingCall.peerName || 'Unknown User'}</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={acceptCall}
            className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700"
          >
            ACCEPT
          </button>
          <button 
            onClick={rejectCall}
            className="bg-red-800 text-white px-6 py-3 rounded font-bold hover:bg-red-900"
          >
            REJECT
          </button>
        </div>
      </div>
    </div>
  );
}