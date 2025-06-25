export const ticketIncludes = {
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    client: { select: { id: true, clientCode: true, companyName: true, status: true } },
    product: { select: { id: true, name: true, productCode: true, status: true, updatedAt: true } },
    TicketAttachments: true
};

export const ticketListIncludes = {
    client: {
        select: {
            id: true,
            companyName: true,
            clientCode: true,
            status: true,
        },
    },
    product: {
        select: {
            id: true,
            name: true,
            productCode: true,
            status: true,
            updatedAt: true,
        },
    },
    owner: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        },
    },
};
