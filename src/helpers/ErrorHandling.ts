import { ERROR_MESSAGES } from '../constants/response/errors';

export class ErrorHandling extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = 'ErrorHandling';
    }
}

export function throwIfTicketNotFound(ticket: any) {
    if (!ticket) {
        throw new ErrorHandling(ERROR_MESSAGES.TICKET_NOT_FOUND, 404);
    }
}

export function throwIfNotAuthorized(user: any, ticket: any) {
    if (user && user.role === 'client') {
        const clientId = (user as any).clientId;
        if (!ticket.client || ticket.client.id !== clientId) {
            throw new ErrorHandling(ERROR_MESSAGES.NOT_AUTHORIZED, 400);
        }
    }
}
