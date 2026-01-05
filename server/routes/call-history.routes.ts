import { Router } from 'express';
import { CallHistoryController } from '../controllers/call-history.controller';
import { validateCallId } from '../validators/call-history.validator';
import { isAuthenticated } from '../auth';

export function createCallHistoryRoutes(callHistoryController: CallHistoryController): Router {
  const router = Router();

  router.get('/call-history', isAuthenticated, callHistoryController.getCallHistory);
  router.delete('/call-history/:id', isAuthenticated, validateCallId, callHistoryController.deleteCallHistory);

  return router;
}
