import { Router } from 'express';
import { WebRTCController } from '../controllers/webrtc.controller';
import { validateOffer, validateAnswer, validateIceCandidate } from '../validators/webrtc.validator';

export function createWebRTCRoutes(webrtcController: WebRTCController): Router {
  const router = Router();

  // Note: These routes are not authenticated by design - they need to work for signaling
  router.post('/webrtc/offer', validateOffer, webrtcController.sendOffer);
  router.post('/webrtc/answer', validateAnswer, webrtcController.sendAnswer);
  router.post('/webrtc/ice-candidate', validateIceCandidate, webrtcController.sendIceCandidate);

  return router;
}
