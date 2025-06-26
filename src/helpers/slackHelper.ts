import { SlackTicket, SlackProduct } from "../types/ticket";

export function buildSlackTicketMessage(ticketResult: SlackTicket, product: SlackProduct, userName: string): string {
  return [
    `*New ticket created:*\n${ticketResult.title}(${ticketResult.ticketCode})`,
    `${product?.name || "Unknown"}(${product?.productCode || "Unknown"})`,
    "description" in ticketResult ? `Description: ${ticketResult.description}` : null,
    ...(ticketResult.TicketAttachments?.map((attachment: any) => attachment.fileUrl) || []),
    `Created by: ${userName}`,
  ].filter(Boolean).join("\n");
}

export function buildSlackStatusChangeMessage(ticketTitle: string, ticketCode: string, oldStatus: string, newStatus: string, updatedBy: string): string {
  return [
    "*Ticket status updated:*",
    `${ticketTitle}(${ticketCode})`,
    `Status from *${oldStatus}* to *${newStatus}*`,
    `Updated by: ${updatedBy}`,
  ].join("\n");
}
