import { PriorityEnum } from "@prisma/client";

export interface CreateTicketData {
    title: string;
    priority?: PriorityEnum;
    imageUrl?: string;
    clientId?: string;
    productId?: string;
    product?: string;
    tags?: string;
    dueDate?: string;
    internalNotes?: string;
    description?: string;
    imageUrls?: string[];
}

export interface TicketAttachment {
  fileUrl: string;
}

export interface SlackTicket {
  title: string;
  ticketCode: string;
  description?: string;
  TicketAttachments?: TicketAttachment[];
}

export interface SlackProduct {
  name?: string;
  productCode?: string;
}

export interface BuildTicketDataInput {
  ticketCode: string;
  title: string;
  priority?: PriorityEnum;
  imageUrls?: string[];
  description?: string;
  internalNotes?: string;
  tags?: string;
  dueDate?: string;
  userId: string;
  finalClientId?: string;
  finalProductId?: string;
}