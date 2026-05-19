import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import {
  createBoard,
  deleteBoard,
  getBoard,
  listBoards,
  updateBoard,
} from '../controllers/board.controller';
import { createList } from '../controllers/list.controller';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(listBoards));
router.post('/', asyncHandler(createBoard));
router.get('/:id', asyncHandler(getBoard));
router.patch('/:id', asyncHandler(updateBoard));
router.delete('/:id', asyncHandler(deleteBoard));

// Lists live under a board.
router.post('/:boardId/lists', asyncHandler(createList));

export default router;
