import { useContext } from "react";
import { CallContext } from "../context/CallContext";

export const useCall = () => {
  const context = useContext(CallContext);
  
  if (!context) {
    throw new Error("useCall must be used within a CallProvider");
  }
  
  // Debug logging to see if context value changes
  console.log("[useCall] 🔥 Context value:", {
    incomingCall: context.incomingCall,
    activeCall: context.activeCall,
    hasIncomingCall: !!context.incomingCall
  });
  
  return context;
};