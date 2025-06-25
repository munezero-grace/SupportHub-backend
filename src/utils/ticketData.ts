import { StatusEnum, PriorityEnum } from "@prisma/client";
import { BuildTicketDataInput } from "../types/ticket";

export function buildTicketData({
    ticketCode,
    title,
    priority,
    imageUrls,
    description,
    internalNotes,
    tags,
    dueDate,
    userId,
    finalClientId,
    finalProductId
}: BuildTicketDataInput) {
    return {
        ticketCode,
        title,
        status: StatusEnum.new,
        priority: priority || PriorityEnum.medium,
        imageUrl: imageUrls && imageUrls.length > 0 ? imageUrls[0] : null,
        description,
        internalNotes,
        tags,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        owner: { connect: { id: userId } },
        ...(finalClientId && { client: { connect: { id: finalClientId } } }),
        ...(finalProductId && { product: { connect: { id: finalProductId } } }),
    };
}
