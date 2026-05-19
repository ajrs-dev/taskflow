import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { deleteList, updateList } from '../controllers/list.controller';
import { createCard } from '../controllers/card.controller';

const router = Router();

router.use(requireAuth);

router.patch('/:id', asyncHandler(updateList));
router.delete('/:id', asyncHandler(deleteList));

// Cards live under a list.
router.post('/:listId/cards', asyncHandler(createCard));

export default router;
