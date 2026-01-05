import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';

export function createPublicRoutes(publicController: PublicController): Router {
  const router = Router();

  router.get('/public/ranks', publicController.getRanks);
  router.get('/public/branches', publicController.getBranches);

  return router;
}
