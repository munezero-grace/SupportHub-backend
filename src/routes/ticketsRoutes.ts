import { Router } from "express";
import multer from "multer";
import TicketsController from "../controllers/tickets.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { errorHandler } from "../middlewares/errorHandler";
import {
  ticketSchema,
  updateTicketSchema,
} from "../validations/ticket.validation";
import { WrapAsync } from "../middlewares/wrapAsync";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/",
  WrapAsync(authenticateUser),
  upload.array("files", 10),
  validateRequest(ticketSchema),
  WrapAsync(TicketsController.createTicket)
);
router.get(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getUserTickets)
);
router.get(
  "/all",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getAllTickets)
);
router.get(
  "/count",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketsCount)
);
router.get(
  "/code/:ticketCode",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketByCode)
);
router.get(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketById)
);
router.put(
  "/:id",
  WrapAsync(authenticateUser),
  upload.array("files", 10),
  validateRequest(updateTicketSchema),
  WrapAsync(TicketsController.updateTicket)
);
router.post(
  "/:id/assign",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.assignTicket)
);

router.delete(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.deleteTicket)
);

router.use(errorHandler);

export default router;
