import { Router } from 'express';
import { WebRTCController } from '../controllers/webrtc.controller';
import { validateOffer, validateAnswer, validateIceCandidate } from '../validators/webrtc.validator';
import { isAuthenticated } from '../auth';

export function createWebRTCRoutes(webrtcController: WebRTCController): Router {
  const router = Router();

  // These relay signaling to arbitrary target users, so they MUST be authenticated — otherwise
  // anyone on the network can POST an offer/answer/ICE at any user and break their call. The only
  // in-repo caller is the web client's HTTP fallback, which runs with a session cookie.
  router.post('/webrtc/offer', isAuthenticated, validateOffer, webrtcController.sendOffer);
  router.post('/webrtc/answer', isAuthenticated, validateAnswer, webrtcController.sendAnswer);
  router.post('/webrtc/ice-candidate', isAuthenticated, validateIceCandidate, webrtcController.sendIceCandidate);

  return router;
}
