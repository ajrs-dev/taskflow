import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import {
  deleteCard,
  moveCard,
  updateCard,
} from '../controllers/card.controller';

const router = Router();

router.use(requireAuth);

router.patch('/:id', asyncHandler(updateCard));
router.put('/:id/move', asyncHandler(moveCard));
router.delete('/:id', asyncHandler(deleteCard));

export default router;
