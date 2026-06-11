/**
 * Tests for the "unscored tickets first" sorting behavior added to
 * getAllTickets, getUserTickets, and getUserTicketsControllerLogic.
 */

const findManyMock = jest.fn();

jest.mock("@prisma/client", () => {
  const mockPrismaClient: any = {
    tickets: { findMany: findManyMock },
    $extends: jest.fn(function (this: any) {
      return this;
    }),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    StatusEnum: { in_progress: "in_progress", new: "new", assigned: "assigned", awaiting_client: "awaiting_client", resolved: "resolved" },
    PriorityEnum: { medium: "medium", low: "low", high: "high", critical: "critical" },
    ClientStatus: { active: "active", inactive: "inactive" },
  };
});

jest.mock("groq-sdk", () => jest.fn().mockImplementation(() => ({})));

import { TicketsService } from "../tickets.service";

const UNSCORED_FILTER = { OR: [{ lastScoredAt: null }, { priorityScore: 0 }] };
const SCORED_FILTER = {
  AND: [{ lastScoredAt: { not: null } }, { priorityScore: { not: 0 } }],
};

describe("TicketsService.getAllTickets — unscored-first sorting", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("queries unscored and scored tickets separately with the right filters and ordering", async () => {
    const unscoredTickets = [{ id: "u1", priorityScore: 0, lastScoredAt: null }];
    const scoredTickets = [{ id: "s1", priorityScore: 0.9, lastScoredAt: new Date() }];

    findManyMock.mockResolvedValueOnce(unscoredTickets);
    findManyMock.mockResolvedValueOnce(scoredTickets);

    const result = await TicketsService.getAllTickets();

    expect(findManyMock).toHaveBeenCalledTimes(2);

    const [unscoredCall, scoredCall] = findManyMock.mock.calls;
    expect(unscoredCall[0]).toMatchObject({
      where: UNSCORED_FILTER,
      orderBy: [{ createdAt: "desc" }],
    });
    expect(scoredCall[0]).toMatchObject({
      where: SCORED_FILTER,
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    });

    // Unscored tickets must come first, regardless of priorityScore.
    expect(result).toEqual([...unscoredTickets, ...scoredTickets]);
  });

  it("places unscored tickets ahead of higher-priority scored tickets", async () => {
    const unscored = [{ id: "new-ticket", priorityScore: 0, lastScoredAt: null }];
    const scored = [{ id: "critical-ticket", priorityScore: 0.9, lastScoredAt: new Date() }];

    findManyMock.mockResolvedValueOnce(unscored);
    findManyMock.mockResolvedValueOnce(scored);

    const result = await TicketsService.getAllTickets();

    expect(result.map((t: any) => t.id)).toEqual(["new-ticket", "critical-ticket"]);
  });
});
