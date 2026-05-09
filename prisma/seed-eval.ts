/**
 * Evaluation seed — creates 25 controlled test tickets spanning all urgency tiers.
 * Each ticket stores its human-assigned rank and tier in the tags array so the
 * eval.ts script can retrieve and compare them without any hardcoded mapping.
 *
 * Run:   npm run eval:seed
 * Clean: npm run eval:cleanup
 */

import { PrismaClient, StatusEnum } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Ground-truth dataset — 25 tickets across four urgency tiers.
// ageDays controls the age score component (AGE_SATURATION = 14 days).
// humanRank is the order a reasonable support lead would work through them.
// ---------------------------------------------------------------------------
type Def = {
  humanRank: number;
  humanTier: "Critical" | "High" | "Medium" | "Low";
  ageDays: number;
  title: string;
  description: string;
};

const TICKETS: Def[] = [
  // ── CRITICAL (ranks 1–5): system-down or data-loss, high emotion ──────────
  {
    humanRank: 1,
    humanTier: "Critical",
    ageDays: 10,
    title: "URGENT: Production database completely inaccessible — all users locked out",
    description:
      "Our entire production database has been inaccessible for 6 hours. EVERY user " +
      "is locked out. We are losing thousands of dollars per hour. Our CEO is demanding " +
      "an immediate response. This is a total business shutdown — FIX THIS NOW.",
  },
  {
    humanRank: 2,
    humanTier: "Critical",
    ageDays: 8,
    title: "Critical data corruption: billing records overwritten after last deployment",
    description:
      "After last night's deployment, client billing records are corrupted. Invoice data " +
      "from the past 3 months has been overwritten with nulls. We cannot generate invoices " +
      "and face legal exposure. This is irreversible data loss — escalate immediately.",
  },
  {
    humanRank: 3,
    humanTier: "Critical",
    ageDays: 6,
    title: "Payment gateway completely broken — no transactions processing for 4 hours!!",
    description:
      "Payment processing has been dead for 4 hours. We cannot accept a single payment. " +
      "We are hemorrhaging revenue every minute. I have called support 3 times with no answer. " +
      "This is completely unacceptable and we are considering legal action if not resolved TODAY.",
  },
  {
    humanRank: 4,
    humanTier: "Critical",
    ageDays: 4,
    title: "Security breach: customer PII exposed via unauthenticated API endpoint",
    description:
      "A public API endpoint is returning full customer personal data including names, emails, " +
      "addresses, and partial card numbers without authentication. This is a GDPR violation. " +
      "Close this immediately and provide a full incident report. Legal is already involved.",
  },
  {
    humanRank: 5,
    humanTier: "Critical",
    ageDays: 2,
    title: "Application crash loop: crashing every 10 minutes and wiping all session data",
    description:
      "The application has been crashing in a loop every 10 minutes since 2am. Each crash " +
      "wipes all active sessions and unsaved work. Our ops team has been manually restarting " +
      "it all night. 200+ users affected. THIS HAS TO STOP IMMEDIATELY.",
  },

  // ── HIGH (ranks 6–10): serious impact, not a total outage ─────────────────
  {
    humanRank: 6,
    humanTier: "High",
    ageDays: 12,
    title: "Mobile login completely broken for all client users after the latest update",
    description:
      "Since yesterday's update, none of our client users can log in on mobile. The login " +
      "button spins indefinitely. All 45 clients are blocked from the mobile app. Most are " +
      "field workers and this is severely disrupting their operations.",
  },
  {
    humanRank: 7,
    humanTier: "High",
    ageDays: 11,
    title: "Financial reports generating incorrect totals — external audit next week",
    description:
      "The reports module calculates wrong revenue totals, off by 15–20%. We have an " +
      "external audit next week and will fail it if this is not fixed. Please escalate " +
      "to your backend team urgently.",
  },
  {
    humanRank: 8,
    humanTier: "High",
    ageDays: 7,
    title: "Automated backups silently failing — no backup taken for 10 days",
    description:
      "Our automated backup job has been failing silently for 10 days. We discovered " +
      "this only when attempting a test restore. We have zero recovery point for the " +
      "past 10 days — critical data-loss risk. Need this fixed and missed backups triggered.",
  },
  {
    humanRank: 9,
    humanTier: "High",
    ageDays: 5,
    title: "API rate limiter broken — integration partners receiving throttling errors",
    description:
      "The rate limiter counts requests incorrectly. Partners get 429 errors after just " +
      "5 requests instead of the agreed 500 per minute. Two partners have already escalated " +
      "this as an SLA breach.",
  },
  {
    humanRank: 10,
    humanTier: "High",
    ageDays: 3,
    title: "Ticket assignment emails not sending — support team missing critical escalations",
    description:
      "Email notifications for ticket assignments stopped working entirely. Our team has " +
      "missed 12 escalated tickets in 2 days because nobody was notified. We are breaching " +
      "SLA commitments. Needs resolution within the hour.",
  },

  // ── MEDIUM (ranks 11–17): functional bugs, no outage ──────────────────────
  {
    humanRank: 11,
    humanTier: "Medium",
    ageDays: 13,
    title: "CSV export always produces an empty file regardless of filters applied",
    description:
      "Exporting the ticket list to CSV always downloads an empty 0-byte file. This " +
      "blocks our weekly reporting workflow. Tested on Chrome, Firefox, and Edge — " +
      "all produce empty files. Please fix as soon as possible.",
  },
  {
    humanRank: 12,
    humanTier: "Medium",
    ageDays: 9,
    title: "Search returns completely wrong tickets — showing data from other clients",
    description:
      "Ticket search is returning unrelated results. Searching a client name shows " +
      "tickets from completely different clients. Very frustrating as we rely on search " +
      "heavily. Has been broken since last Tuesday.",
  },
  {
    humanRank: 13,
    humanTier: "Medium",
    ageDays: 9,
    title: "Dashboard takes over 45 seconds to load with more than 100 tickets",
    description:
      "The dashboard becomes extremely slow once we have more than 100 tickets — " +
      "currently 45 to 60 seconds. As we grow this will only worsen. We understand " +
      "performance work takes time but would appreciate an ETA.",
  },
  {
    humanRank: 14,
    humanTier: "Medium",
    ageDays: 7,
    title: "Saved ticket filters reset on every logout — must reconfigure each morning",
    description:
      "Every time I log back in all my saved filters are gone and I reconfigure from " +
      "scratch. Wastes about 15 minutes each morning. Please look into persisting " +
      "filter preferences between sessions.",
  },
  {
    humanRank: 15,
    humanTier: "Medium",
    ageDays: 6,
    title: "Bulk status update only applies to first 10 tickets when selecting all",
    description:
      "When I select all tickets and apply a bulk status update, only the first 10 " +
      "get updated. Clearly a bug in the select-all implementation — I have to " +
      "update in batches as a workaround.",
  },
  {
    humanRank: 16,
    humanTier: "Medium",
    ageDays: 5,
    title: "Pagination broken on clients list — stuck on page 1 permanently",
    description:
      "The Next Page button on the clients list does nothing and stays on page 1. " +
      "I have to use search to find clients beyond the first 10. Not urgent but " +
      "has been broken for a while.",
  },
  {
    humanRank: 17,
    humanTier: "Medium",
    ageDays: 4,
    title: "Date picker using UTC instead of local timezone — due dates off by 3 hours",
    description:
      "The date picker in ticket creation appears to use UTC instead of our local " +
      "timezone (GMT+3). All due dates show 3 hours off, causing scheduling confusion. " +
      "Could this respect the browser timezone setting?",
  },

  // ── LOW (ranks 18–25): cosmetic / UX polish / feature requests ────────────
  {
    humanRank: 18,
    humanTier: "Low",
    ageDays: 8,
    title: "Typo in the success notification shown after ticket creation",
    description:
      "The success toast says 'Ticket succesfully created' instead of 'successfully'. " +
      "Minor but looks unprofessional in client demos.",
  },
  {
    humanRank: 19,
    humanTier: "Low",
    ageDays: 6,
    title: "Create Ticket button slightly misaligned on mobile portrait mode",
    description:
      "On mobile in portrait mode the Create Ticket button overlaps slightly with " +
      "the filter icon. Still works fine but looks off on iPhone SE sized screens.",
  },
  {
    humanRank: 20,
    humanTier: "Low",
    ageDays: 4,
    title: "Table column widths briefly jump when switching between ticket views",
    description:
      "When toggling between All Tickets and My Tickets the columns briefly resize " +
      "before settling. A minor visual glitch that does not affect functionality.",
  },
  {
    humanRank: 21,
    humanTier: "Low",
    ageDays: 3,
    title: "Feature request: dark mode for the dashboard",
    description:
      "It would be great to have a dark mode option. Working late at night the white " +
      "background is quite bright. Not urgent at all — just a nice-to-have for future " +
      "consideration.",
  },
  {
    humanRank: 22,
    humanTier: "Low",
    ageDays: 2,
    title: "Suggestion: allow sorting the ticket list by client name",
    description:
      "Currently we can sort by date and priority but not client name. It would be " +
      "helpful when managing tickets for multiple clients. No rush on this.",
  },
  {
    humanRank: 23,
    humanTier: "Low",
    ageDays: 1,
    title: "Company logo appears slightly blurry on retina displays",
    description:
      "On retina and high-DPI screens the company logo in the header looks slightly " +
      "blurry. Probably needs a higher-resolution image. Purely cosmetic.",
  },
  {
    humanRank: 24,
    humanTier: "Low",
    ageDays: 0.25,
    title: "Minor grammar correction needed in the welcome email",
    description:
      "The welcome email says 'Welcome in Support Hub' instead of 'Welcome to Support Hub'. " +
      "A quick fix when convenient.",
  },
  {
    humanRank: 25,
    humanTier: "Low",
    ageDays: 0.1,
    title: "Action buttons in ticket menu slightly too close together",
    description:
      "The Edit and Delete buttons in ticket actions are a bit close and occasionally " +
      "cause mis-clicks. A minor UX polish thought for a future sprint.",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("\n──────────────────────────────────────────────────────");
  console.log("  Support Hub — Evaluation Seed");
  console.log("──────────────────────────────────────────────────────\n");

  // Guard: don't double-seed
  const existing = await prisma.tickets.findFirst({
    where: { tags: { has: "eval-dataset" } },
  });
  if (existing) {
    console.log(
      "⚠️   Eval dataset already exists — skipping.\n" +
        "    Run  npm run eval:cleanup  to remove it, then re-seed.\n"
    );
    return;
  }

  // Find any user to act as ticket creator
  const admin = await prisma.users.findFirst();
  if (!admin) {
    throw new Error(
      "No users found in the database. Run  npm run prisma:db:seed  first."
    );
  }
  console.log(`  Creator user : ${admin.email}`);
  console.log(`  Tickets      : ${TICKETS.length}`);
  console.log(`  Groq model   : ${process.env.GROQ_MODEL ?? "llama-3.1-8b-instant"}`);
  console.log();

  // Dynamic import so dotenv has already loaded before Groq reads GROQ_API_KEY
  const { scoreTicket } = await import("../src/services/priority.service");

  let created = 0;
  let failed = 0;

  for (const def of TICKETS) {
    const createdAt = new Date(
      Date.now() - def.ageDays * 24 * 60 * 60 * 1000
    );
    const ticketCode = `EVAL-${String(def.humanRank).padStart(3, "0")}`;

    try {
      const ticket = await prisma.tickets.create({
        data: {
          ticketCode,
          title: def.title,
          description: def.description,
          status: StatusEnum.new,
          priority: "medium",
          createdBy: admin.id,
          createdAt,
          tags: [
            "eval-dataset",
            `eval-rank-${def.humanRank}`,
            `eval-tier-${def.humanTier}`,
          ],
        },
      });

      const score = await scoreTicket({
        title: ticket.title,
        description: ticket.description,
        createdAt: ticket.createdAt,
      });

      await prisma.tickets.update({
        where: { id: ticket.id },
        data: { priorityScore: score.priorityScore, lastScoredAt: new Date() },
      });

      const pct = (score.priorityScore * 100).toFixed(1).padStart(5);
      const bar = "█".repeat(Math.round(score.priorityScore * 20)).padEnd(20);
      console.log(
        `  [${String(def.humanRank).padStart(2, " ")}] ${ticketCode}  ${pct}%  ${bar}  ${def.title.slice(0, 48)}`
      );

      created++;
    } catch (err) {
      console.error(`  ❌  Failed to create/score ${ticketCode}:`, err);
      failed++;
    }
  }

  console.log(
    `\n  ✅  Seeded ${created} tickets${failed ? `, ❌ ${failed} failed` : ""}.`
  );
  console.log("  Run  npm run eval:run  to generate the evaluation report.\n");
}

main()
  .catch((e) => {
    console.error("\n❌  Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
