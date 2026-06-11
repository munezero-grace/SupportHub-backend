import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { scoreTicket } from "../services/priority.service";

const prisma = new PrismaClient();

// Top of every hour. Use "* * * * *" temporarily for local verification.
const SCHEDULE = "0 * * * *";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

async function scoreOneTicket(t: {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
}) {
  const score = await scoreTicket({
    title: t.title,
    description: t.description,
    createdAt: t.createdAt,
  });
  const LOW_CONFIDENCE_THRESHOLD = 0.5;
  const llmReasoning =
    score.confidence < LOW_CONFIDENCE_THRESHOLD
      ? `⚠️ Low confidence — recommend manual review. ${score.llmReasoning}`
      : score.llmReasoning;

  await prisma.tickets.update({
    where: { id: t.id },
    data: {
      priorityScore:   score.priorityScore,
      emotionScore:    score.emotion,
      complexityScore: score.complexity,
      agingScore:      score.agingScore,
      llmReasoning,
      confidence:      score.confidence,
      lastScoredAt:    new Date(),
    },
  });
}

async function refreshPriorities() {
  const startedAt = new Date();
  console.log(`[priorityRefresh] run started at ${startedAt.toISOString()}`);

  try {
    const tickets = await prisma.tickets.findMany({
      where: { status: { not: "resolved" } },
      select: { id: true, title: true, description: true, createdAt: true },
    });

    console.log(`[priorityRefresh] ${tickets.length} ticket(s) need scoring`);

    let updated = 0;
    let failed = 0;

    const batches = chunk(tickets, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const results = await Promise.allSettled(batch.map(scoreOneTicket));

      let batchUpdated = 0;
      let batchFailed = 0;
      results.forEach((result, idx) => {
        if (result.status === "fulfilled") {
          batchUpdated++;
        } else {
          batchFailed++;
          console.error(
            `[priorityRefresh] ticket ${batch[idx].id} failed:`,
            result.reason
          );
        }
      });

      updated += batchUpdated;
      failed += batchFailed;

      console.log(
        `[priorityRefresh] batch ${i + 1}/${batches.length} — succeeded ${batchUpdated}, failed ${batchFailed}`
      );

      if (i < batches.length - 1) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(
      `[priorityRefresh] done — scored ${updated}/${tickets.length} tickets (${failed} failed)`
    );
  } catch (e) {
    console.error("[priorityRefresh] run failed:", e);
  }
}

export function startPriorityRefreshJob() {
  cron.schedule(SCHEDULE, () => {
    refreshPriorities().catch((e) =>
      console.error("[priorityRefresh] unhandled error:", e)
    );
  });
  console.log(`[priorityRefresh] scheduled with cron "${SCHEDULE}"`);
}
