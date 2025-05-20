import { useState, useEffect } from 'react';
import AudioCall from './AudioCall';
import VideoCall from './VideoCall';
import IncomingCallModal from './IncomingCallModal';

/**
 * CallManager Component
 * 
 * Komponen ini menangani tampilan panggilan berdasarkan jenis panggilan aktif
 * (audio atau video) dan menampilkan modal panggilan masuk saat ada
 * panggilan masuk tetapi belum ada panggilan aktif.
 */
export default function CallManager() {
  // Status panggilan (untuk demo tanpa context)
  const [activeCall, setActiveCall] = useState<null | {type: 'audio'|'video', peerId: string}>(null);
  const [incomingCall, setIncomingCall] = useState<null | {type: 'audio'|'video', callerId: string, callerName: string}>(null);

  // Demo - handler panggilan masuk
  useEffect(() => {
    const handleIncomingCall = (e: CustomEvent) => {
      setIncomingCall({
        type: e.detail.type,
        callerId: e.detail.callerId,
        callerName: e.detail.callerName
      });
    };

    // @ts-ignore
    window.addEventListener('incoming-call', handleIncomingCall);
    
    return () => {
      // @ts-ignore
      window.removeEventListener('incoming-call', handleIncomingCall);
    };
  }, []);

  // Handler menerima panggilan
  const handleAcceptCall = () => {
    if (incomingCall) {
      setActiveCall({
        type: incomingCall.type,
        peerId: incomingCall.callerId
      });
      setIncomingCall(null);
    }
  };

  // Handler menolak panggilan
  const handleRejectCall = () => {
    setIncomingCall(null);
  };

  // Handler mengakhiri panggilan
  const handleEndCall = () => {
    setActiveCall(null);
  };

  // Tampilkan komponen berdasarkan status
  if (activeCall) {
    if (activeCall.type === 'audio') {
      return <AudioCall peerId={activeCall.peerId} onEnd={handleEndCall} />;
    } else {
      return <VideoCall peerId={activeCall.peerId} onEnd={handleEndCall} />;
    }
  }

  // Tampilkan modal panggilan masuk jika ada
  return incomingCall ? (
    <IncomingCallModal
      callerName={incomingCall.callerName}
      callType={incomingCall.type}
      onAccept={handleAcceptCall}
      onReject={handleRejectCall}
    />
  ) : null;
}