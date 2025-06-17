import { Router, Request, Response } from 'express';
import multer from 'multer';
import TicketsController from '../controllers/tickets.controller';
import { validateRequest } from '../middlewares/validateRequest';
import { errorHandler } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { ticketSchema, updateTicketSchema } from '../validations/ticket.validation';
import { WrapAsync } from '../middlewares/wrapAsync';
import { authenticateUser } from '../middlewares/authenticateUser';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const createTicketHandler = (req: Request, res: Response) => {
  return TicketsController.createTicket(req as AuthenticatedRequest, res);
};

const getUserTicketsHandler = (req: Request, res: Response) => {
  return TicketsController.getUserTickets(req as AuthenticatedRequest, res);
};

router.post('/', WrapAsync(authenticateUser), upload.single('file'), validateRequest(ticketSchema), WrapAsync(createTicketHandler));
router.get('/', WrapAsync(authenticateUser), WrapAsync(getUserTicketsHandler));
router.get('/:id', WrapAsync(authenticateUser), WrapAsync(TicketsController.getTicketById));
router.put('/:id', WrapAsync(authenticateUser), validateRequest(updateTicketSchema), WrapAsync(TicketsController.updateTicket));
router.delete('/:id', WrapAsync(authenticateUser), WrapAsync(TicketsController.deleteTicket));

router.use(errorHandler);

export default router;