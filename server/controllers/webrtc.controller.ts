import { Request, Response } from 'express';
import { WebRTCService } from '../services/webrtc.service';

export class WebRTCController {
  constructor(private webrtcService: WebRTCService) {}

  sendOffer = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { callId, targetUserId, offer } = req.body;

      console.log(`[HTTP API] Received WebRTC offer for call ${callId}, target user ${targetUserId}`);

      this.webrtcService.sendOffer(callId, targetUserId, offer);
      console.log(`[HTTP API] Sent WebRTC offer to user ${targetUserId}`);

      return res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling WebRTC offer:', error);
      return res.status(500).json({ message: 'Failed to send WebRTC offer' });
    }
  };

  sendAnswer = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { callId, targetUserId, answer } = req.body;

      console.log(`[HTTP API] Received WebRTC answer for call ${callId}, target user ${targetUserId}`);

      this.webrtcService.sendAnswer(callId, targetUserId, answer);
      console.log(`[HTTP API] Sent WebRTC answer to user ${targetUserId}`);

      return res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling WebRTC answer:', error);
      return res.status(500).json({ message: 'Failed to send WebRTC answer' });
    }
  };

  sendIceCandidate = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { callId, targetUserId, candidate } = req.body;

      console.log(`[HTTP API] Received ICE candidate for call ${callId}, target user ${targetUserId}`);

      this.webrtcService.sendIceCandidate(callId, targetUserId, candidate);
      console.log(`[HTTP API] Sent ICE candidate to user ${targetUserId}`);

      return res.json({ success: true });
    } catch (error) {
      console.error('[HTTP API] Error handling ICE candidate:', error);
      return res.status(500).json({ message: 'Failed to send ICE candidate' });
    }
  };
}
