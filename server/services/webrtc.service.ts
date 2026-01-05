export class WebRTCService {
  constructor(private sendToUser: (userId: number, message: any) => boolean) {}

  sendOffer(callId: string, targetUserId: number, offer: any): boolean {
    console.log(`[WebRTC Service] Sending offer for call ${callId} to user ${targetUserId}`);

    const message = {
      type: 'webrtc_offer',
      callId,
      offer
    };

    return this.sendToUser(targetUserId, message);
  }

  sendAnswer(callId: string, targetUserId: number, answer: any): boolean {
    console.log(`[WebRTC Service] Sending answer for call ${callId} to user ${targetUserId}`);

    const message = {
      type: 'webrtc_answer',
      callId,
      answer
    };

    return this.sendToUser(targetUserId, message);
  }

  sendIceCandidate(callId: string, targetUserId: number, candidate: any): boolean {
    console.log(`[WebRTC Service] Sending ICE candidate for call ${callId} to user ${targetUserId}`);

    const message = {
      type: 'webrtc_ice_candidate',
      callId,
      candidate
    };

    return this.sendToUser(targetUserId, message);
  }
}
