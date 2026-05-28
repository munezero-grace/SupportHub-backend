import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { scoreTicket } from "../services/priority.service";

const prisma = new PrismaClient();

// Top of every hour. Use "* * * * *" temporarily for local verification.
const SCHEDULE = "0 * * * *";

async function refreshPriorities() {
  const startedAt = new Date();
  console.log(`[priorityRefresh] run started at ${startedAt.toISOString()}`);

  const tickets = await prisma.tickets.findMany({
    where: { status: { not: "resolved" } },
    select: { id: true, title: true, description: true, createdAt: true },
  });

  let updated = 0;
  let failed = 0;

  for (const t of tickets) {
    try {
      const score = await scoreTicket({
        title: t.title,
        description: t.description,
        createdAt: t.createdAt,
      });
      await prisma.tickets.update({
        where: { id: t.id },
        data: {
          priorityScore:   score.priorityScore,
          emotionScore:    score.emotion,
          complexityScore: score.complexity,
          agingScore:      score.agingScore,
          llmReasoning:    score.llmReasoning,
          confidence:      score.confidence,
          lastScoredAt:    new Date(),
        },
      });
      updated++;
    } catch (e) {
      failed++;
      console.error(`[priorityRefresh] ticket ${t.id} failed:`, e);
    }
  }

  console.log(
    `[priorityRefresh] done — scanned ${tickets.length}, updated ${updated}, failed ${failed}`
  );
}

export function startPriorityRefreshJob() {
  cron.schedule(SCHEDULE, () => {
    refreshPriorities().catch((e) =>
      console.error("[priorityRefresh] unhandled error:", e)
    );
  });
  console.log(`[priorityRefresh] scheduled with cron "${SCHEDULE}"`);
}
