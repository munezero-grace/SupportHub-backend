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
import { requireRole } from "../middlewares/requireRole";

const router = Router();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error("Only image (JPEG, PNG, GIF, WEBP) and PDF files are allowed"));
    }
    cb(null, true);
  },
});

router.post(
  "/",
  WrapAsync(authenticateUser),
  upload.array("files", 10),
  validateRequest(ticketSchema),
  WrapAsync(TicketsController.createTicket),
);
router.get(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getUserTickets),
);
router.get(
  "/all",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getAllTickets),
);
router.get(
  "/count",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketsCount),
);
router.get(
  "/ranked",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(TicketsController.getRankedTickets),
);
router.get(
  "/assigned",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getAssignedTickets),
);
router.get(
  "/assigned/:userId",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketsForUser),
);
router.get(
  "/code/:ticketCode",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketByCode),
);
router.get(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.getTicketById),
);
router.put(
  "/:id",
  WrapAsync(authenticateUser),
  upload.array("files", 10),
  validateRequest(updateTicketSchema),
  WrapAsync(TicketsController.updateTicket),
);
router.post(
  "/:id/assign",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.assignTicket),
);
router.post(
  "/:id/comments",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.addComment),
);
router.post(
  "/:id/notes",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.addNote),
);

router.delete(
  "/:id",
  WrapAsync(authenticateUser),
  WrapAsync(TicketsController.deleteTicket),
);

router.use(errorHandler);

export default router;
