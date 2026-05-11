import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const AGE_SATURATION_DAYS = 14;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function computeScore(emotion: number, complexity: number, ageDays: number): number {
  const age = Math.min(ageDays / AGE_SATURATION_DAYS, 1);
  return parseFloat((0.4 * emotion + 0.35 * complexity + 0.25 * age).toFixed(4));
}

// ticketCode prefix to avoid collisions with real tickets
const CODE_PREFIX = "DM";

const TICKETS = [
  // ── NEW ────────────────────────────────────────────────────────────────
  {
    code: `${CODE_PREFIX}-001`,
    title: "Dashboard charts not loading on Safari",
    description: "The analytics dashboard charts are completely blank on Safari 17. Chrome works fine. We have several executives who only use Safari and they cannot see any data.",
    status: "new" as const,
    priority: "high" as const,
    emotion: 0.45,
    complexity: 0.60,
    ageDays: 0.3,
    tags: ["safari", "charts", "browser-compat"],
  },
  {
    code: `${CODE_PREFIX}-002`,
    title: "Export to CSV includes deleted records",
    description: "When exporting client data to CSV, soft-deleted clients are included in the output. This is causing confusion for our finance team.",
    status: "new" as const,
    priority: "medium" as const,
    emotion: 0.30,
    complexity: 0.45,
    ageDays: 0.8,
    tags: ["export", "csv", "data"],
  },
  {
    code: `${CODE_PREFIX}-003`,
    title: "Two-factor auth emails going to spam",
    description: "Multiple users have reported that 2FA verification emails are landing in spam folders. This is blocking new user onboarding. Please investigate the email sender reputation.",
    status: "new" as const,
    priority: "high" as const,
    emotion: 0.40,
    complexity: 0.55,
    ageDays: 1.2,
    tags: ["email", "2fa", "onboarding"],
  },
  {
    code: `${CODE_PREFIX}-004`,
    title: "UI text clipped on French locale",
    description: "Several button labels are truncated when the application language is set to French. The strings are longer than in English and overflow their containers.",
    status: "new" as const,
    priority: "low" as const,
    emotion: 0.15,
    complexity: 0.20,
    ageDays: 1.5,
    tags: ["i18n", "french", "ui"],
  },
  {
    code: `${CODE_PREFIX}-005`,
    title: "API rate limit hit during batch import",
    description: "Our nightly batch import of 5,000 records is consistently hitting the API rate limit at around 3,000 records. The import fails silently and we only notice data gaps the next morning.",
    status: "new" as const,
    priority: "high" as const,
    emotion: 0.50,
    complexity: 0.70,
    ageDays: 2.0,
    tags: ["api", "batch", "rate-limit"],
  },

  // ── IN_PROGRESS ────────────────────────────────────────────────────────
  {
    code: `${CODE_PREFIX}-006`,
    title: "Database connection pool exhausted — all users blocked",
    description: "URGENT: Our entire team cannot access the application. Every action returns a 500 error. We are losing business every minute this is down. I have escalated to my CTO. FIX THIS NOW.",
    status: "in_progress" as const,
    priority: "critical" as const,
    emotion: 0.95,
    complexity: 0.92,
    ageDays: 0.5,
    tags: ["outage", "database", "critical"],
  },
  {
    code: `${CODE_PREFIX}-007`,
    title: "Payment webhook not firing on order completion",
    description: "Our Stripe webhook is not triggering after successful payments. Orders are being processed but inventory and fulfillment are not being notified. This has caused 12 unfulfilled orders today alone.",
    status: "in_progress" as const,
    priority: "critical" as const,
    emotion: 0.78,
    complexity: 0.88,
    ageDays: 1.0,
    tags: ["stripe", "webhook", "payments"],
  },
  {
    code: `${CODE_PREFIX}-008`,
    title: "Search results return incorrect data after indexing",
    description: "After the last deployment, search results are returning stale data. Records updated 3 days ago still show old values in search. The index is clearly out of sync.",
    status: "in_progress" as const,
    priority: "high" as const,
    emotion: 0.55,
    complexity: 0.72,
    ageDays: 3.5,
    tags: ["search", "index", "data-integrity"],
  },
  {
    code: `${CODE_PREFIX}-009`,
    title: "File uploads fail for files over 5MB",
    description: "Users cannot upload files larger than 5MB. The upload spinner hangs indefinitely and then shows a generic error. Our typical attachments are 10-20MB PDFs.",
    status: "in_progress" as const,
    priority: "medium" as const,
    emotion: 0.42,
    complexity: 0.50,
    ageDays: 4.0,
    tags: ["upload", "file-size", "storage"],
  },
  {
    code: `${CODE_PREFIX}-010`,
    title: "Password reset link expires in 2 minutes instead of 24 hours",
    description: "Users are reporting that password reset links expire almost immediately. Our helpdesk is being flooded with repeat requests. The token expiry appears to be misconfigured.",
    status: "in_progress" as const,
    priority: "high" as const,
    emotion: 0.60,
    complexity: 0.40,
    ageDays: 5.5,
    tags: ["auth", "password-reset", "security"],
  },
  {
    code: `${CODE_PREFIX}-011`,
    title: "Notification emails not respecting user timezone",
    description: "Scheduled notification emails are sent in UTC regardless of the user's selected timezone. Users in GMT+3 are receiving emails 3 hours off schedule.",
    status: "in_progress" as const,
    priority: "medium" as const,
    emotion: 0.28,
    complexity: 0.38,
    ageDays: 7.0,
    tags: ["notifications", "timezone", "email"],
  },
  {
    code: `${CODE_PREFIX}-012`,
    title: "Sidebar collapses randomly on tablet view",
    description: "The navigation sidebar occasionally collapses on its own during use on iPad. Hard to reproduce consistently but happens at least once per session for our field team.",
    status: "in_progress" as const,
    priority: "low" as const,
    emotion: 0.20,
    complexity: 0.25,
    ageDays: 9.0,
    tags: ["ui", "tablet", "navigation"],
  },

  // ── ASSIGNED ───────────────────────────────────────────────────────────
  {
    code: `${CODE_PREFIX}-013`,
    title: "Report generation times out for large date ranges",
    description: "Generating a report for more than 3 months of data consistently times out at the 30-second mark. Our monthly reviews require at least 12 months of data.",
    status: "assigned" as const,
    priority: "high" as const,
    emotion: 0.52,
    complexity: 0.65,
    ageDays: 2.5,
    tags: ["reports", "performance", "timeout"],
  },
  {
    code: `${CODE_PREFIX}-014`,
    title: "Drag-and-drop kanban fails on Windows Chrome",
    description: "Items cannot be dragged between columns in the kanban view when using Chrome on Windows. The same browser on Mac works perfectly. Appears to be a pointer event issue.",
    status: "assigned" as const,
    priority: "medium" as const,
    emotion: 0.35,
    complexity: 0.42,
    ageDays: 3.0,
    tags: ["kanban", "drag-drop", "chrome"],
  },
  {
    code: `${CODE_PREFIX}-015`,
    title: "Bulk status update reverts after page refresh",
    description: "When using the bulk action to change status on multiple tickets, the changes appear in the UI but revert to the previous state after refreshing. Seems like the API call is succeeding but the cache isn't being invalidated.",
    status: "assigned" as const,
    priority: "medium" as const,
    emotion: 0.40,
    complexity: 0.55,
    ageDays: 6.0,
    tags: ["bulk-actions", "cache", "state"],
  },
  {
    code: `${CODE_PREFIX}-016`,
    title: "Dark mode toggle not persisting between sessions",
    description: "The dark mode preference resets to light mode every time the user logs out and back in. The preference should be saved to the user profile.",
    status: "assigned" as const,
    priority: "low" as const,
    emotion: 0.18,
    complexity: 0.20,
    ageDays: 10.0,
    tags: ["dark-mode", "preferences", "ux"],
  },

  // ── AWAITING_CLIENT ────────────────────────────────────────────────────
  {
    code: `${CODE_PREFIX}-017`,
    title: "SSO integration with Okta returning 403",
    description: "We are getting a 403 Forbidden response when attempting SSO login via our Okta tenant. Regular email/password login works fine. This is blocking our entire IT department from accessing the system.",
    status: "awaiting_client" as const,
    priority: "critical" as const,
    emotion: 0.72,
    complexity: 0.80,
    ageDays: 4.5,
    tags: ["sso", "okta", "auth"],
  },
  {
    code: `${CODE_PREFIX}-018`,
    title: "Custom domain SSL certificate shows as invalid",
    description: "Our custom domain shows an SSL certificate warning in browsers. We set it up 2 weeks ago and it was working, but now the cert appears to have expired. Please investigate.",
    status: "awaiting_client" as const,
    priority: "high" as const,
    emotion: 0.58,
    complexity: 0.60,
    ageDays: 5.0,
    tags: ["ssl", "custom-domain", "security"],
  },
  {
    code: `${CODE_PREFIX}-019`,
    title: "User roles not syncing from Azure AD",
    description: "New users provisioned from Azure AD are arriving with no roles assigned. They can log in but see an empty application. Role mapping in the SCIM provisioning may be misconfigured.",
    status: "awaiting_client" as const,
    priority: "high" as const,
    emotion: 0.48,
    complexity: 0.68,
    ageDays: 8.0,
    tags: ["azure-ad", "scim", "roles"],
  },
  {
    code: `${CODE_PREFIX}-020`,
    title: "Incorrect currency symbol in invoices for EUR accounts",
    description: "Invoices for clients set to EUR currency are displaying the $ symbol instead of €. The amounts are correct, only the symbol is wrong.",
    status: "awaiting_client" as const,
    priority: "medium" as const,
    emotion: 0.32,
    complexity: 0.30,
    ageDays: 11.0,
    tags: ["invoices", "currency", "localization"],
  },

  // ── RESOLVED ───────────────────────────────────────────────────────────
  {
    code: `${CODE_PREFIX}-021`,
    title: "Login page infinite redirect loop",
    description: "CRITICAL: All users are stuck in an infinite redirect loop on the login page. Nobody can access the system. This started after the deployment 2 hours ago. Please roll back immediately.",
    status: "resolved" as const,
    priority: "critical" as const,
    emotion: 0.98,
    complexity: 0.95,
    ageDays: 12.0,
    tags: ["login", "redirect", "deployment"],
  },
  {
    code: `${CODE_PREFIX}-022`,
    title: "Email notifications sent 500 times per event",
    description: "Users are receiving hundreds of duplicate email notifications for a single event. One user reported receiving 500+ emails in an hour. Our mail server has been flagged as a spammer.",
    status: "resolved" as const,
    priority: "critical" as const,
    emotion: 0.85,
    complexity: 0.90,
    ageDays: 16.0,
    tags: ["email", "notifications", "duplicate"],
  },
  {
    code: `${CODE_PREFIX}-023`,
    title: "Column sort broken after recent UI update",
    description: "Clicking column headers in the data table no longer sorts the data. The sort icon appears but nothing happens. This broke in version 2.4.1.",
    status: "resolved" as const,
    priority: "medium" as const,
    emotion: 0.38,
    complexity: 0.35,
    ageDays: 20.0,
    tags: ["table", "sort", "ui"],
  },
  {
    code: `${CODE_PREFIX}-024`,
    title: "Date picker not accepting dates before 2000",
    description: "Our HR team needs to enter historical employee start dates, some from the 1990s. The date picker calendar does not allow selecting years before 2000.",
    status: "resolved" as const,
    priority: "medium" as const,
    emotion: 0.22,
    complexity: 0.25,
    ageDays: 25.0,
    tags: ["datepicker", "hr", "legacy"],
  },
  {
    code: `${CODE_PREFIX}-025`,
    title: "Mobile app crashes on Android 12 after login",
    description: "The mobile app crashes immediately after successful login on Android 12 devices. This was introduced in app version 3.2.0. Android 11 and below are unaffected.",
    status: "resolved" as const,
    priority: "high" as const,
    emotion: 0.65,
    complexity: 0.70,
    ageDays: 30.0,
    tags: ["mobile", "android", "crash"],
  },
];

async function main() {
  console.log("Seeding realistic demo tickets...\n");

  // Find existing clients, products, users
  const clients = await prisma.clients.findMany({ where: { deletedAt: null }, take: 5 });
  const products = await prisma.products.findMany({ where: { status: "active" }, take: 4 });
  const developers = await prisma.users.findMany({
    where: { userRoles: { some: { role: { name: "developer" } } } },
    take: 5,
  });
  const creatorUser = await prisma.users.findFirst({
    where: { userRoles: { some: { role: { name: "super_admin" } } } },
  });

  if (!creatorUser) {
    throw new Error("No super_admin user found. Run seed-demo.ts first.");
  }

  let created = 0;
  let skipped = 0;

  for (const t of TICKETS) {
    const existing = await prisma.tickets.findUnique({ where: { ticketCode: t.code } });
    if (existing) {
      console.log(`skip: ${t.code} (already exists)`);
      skipped++;
      continue;
    }

    const client  = clients.length  ? clients[created  % clients.length]  : undefined;
    const product = products.length ? products[created % products.length] : undefined;
    const age     = t.ageDays;
    const score   = computeScore(t.emotion, t.complexity, age);
    const createdAt = daysAgo(age);

    await prisma.tickets.create({
      data: {
        ticketCode:     t.code,
        title:          t.title,
        description:    t.description,
        status:         t.status,
        priority:       t.priority,
        tags:           t.tags,
        priorityScore:  score,
        emotionScore:   t.emotion,
        complexityScore: t.complexity,
        lastScoredAt:   createdAt,
        createdAt,
        updatedAt:      createdAt,
        createdBy:      creatorUser.id,
        clientId:       client?.id,
        productId:      product?.id,
      },
    });

    // Assign developer for assigned tickets
    if (t.status === "assigned" && developers.length > 0) {
      const dev = developers[created % developers.length];
      await prisma.userTickets.upsert({
        where: { userId_ticketId: { userId: dev.id, ticketId: (await prisma.tickets.findUnique({ where: { ticketCode: t.code } }))!.id } },
        update: {},
        create: {
          userId:   dev.id,
          ticketId: (await prisma.tickets.findUnique({ where: { ticketCode: t.code } }))!.id,
          clientId: client?.id ?? "",
        },
      });
    }

    console.log(`created: ${t.code} | ${t.status.padEnd(16)} | score=${score.toFixed(2)} | ${t.title.slice(0, 55)}`);
    created++;
  }

  console.log(`\nDone — ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
