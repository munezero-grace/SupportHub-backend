import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class DashboardService {
  static async getOverviewStats() {
    const [totalTickets, openTickets] = await Promise.all([
      prisma.tickets.count(),

      prisma.tickets.count({
        where: {
          status: {
            in: ["new", "in_progress", "assigned", "awaiting_client"],
          },
        },
      }),
    ]);

    return {
      totalTickets,
      openTickets,
    };
  }

  static async getTicketStatusDistribution() {
    const statusDistribution = await prisma.tickets.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    return statusDistribution.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));
  }

  static async getClientStats() {
    const [totalClients, activeClients, premiumClients] = await Promise.all([
      prisma.clients.count(),
      prisma.clients.count({ where: { status: "active" } }),
      prisma.clients.count({ where: { supportTier: "premium" } }),
    ]);

    return {
      totalClients,
      activeClients,
      premiumClients,
    };
  }

  static async getProductStats() {
    const [totalProducts, activeProducts, mostActiveProduct] =
      await Promise.all([
        prisma.products.count(),
        prisma.products.count({ where: { status: "active" } }),
        prisma.products.findFirst({
          include: {
            _count: {
              select: {
                Tickets: true,
              },
            },
          },
          orderBy: {
            Tickets: {
              _count: "desc",
            },
          },
        }),
      ]);

    return {
      totalProducts,
      activeProducts,
      mostActiveProduct: mostActiveProduct
        ? {
            name: mostActiveProduct.name,
            ticketCount: mostActiveProduct._count.Tickets,
          }
        : {
            name: "BP CRM",
            ticketCount: 45,
          },
    };
  }

  static async getTicketsByStatus() {
    const ticketsByStatus = await prisma.tickets.findMany({
      include: {
        client: {
          select: {
            companyName: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const grouped = {
      new: ticketsByStatus.filter((t) => t.status === "new"),
      in_progress: ticketsByStatus.filter((t) => t.status === "in_progress"),
      awaiting_client: ticketsByStatus.filter(
        (t) => t.status === "awaiting_client"
      ),
      resolved: ticketsByStatus.filter((t) => t.status === "resolved"),
    };

    return grouped;
  }
}
