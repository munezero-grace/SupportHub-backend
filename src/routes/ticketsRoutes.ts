import { Router, Request, Response } from 'express';
import multer from 'multer';
import TicketsController from '../controllers/tickets.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { errorHandler } from '../middlewares/errorHandler';
import { AuthenticatedRequest, authenticateJWT } from '../middlewares/authMiddleware';
import { ticketSchema, updateTicketSchema } from '../validations/ticket.validation';
import { WrapAsync } from '../middlewares/wrapAsync';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const createTicketHandler = (req: Request, res: Response) => {
  return TicketsController.createTicket(req as AuthenticatedRequest, res);
};

const getUserTicketsHandler = (req: Request, res: Response) => {
  return TicketsController.getUserTickets(req as AuthenticatedRequest, res);
};

router.post('/', authenticateJWT(), upload.single('file'), validateRequest(ticketSchema), WrapAsync(createTicketHandler));
router.get('/', authenticateJWT(), WrapAsync(getUserTicketsHandler));
router.get('/:id', authenticateJWT(), WrapAsync(TicketsController.getTicketById));
router.put('/:id', authenticateJWT(), validateRequest(updateTicketSchema), WrapAsync(TicketsController.updateTicket));
router.delete('/:id', authenticateJWT(), WrapAsync(TicketsController.deleteTicket));

router.use(errorHandler);

export default router;