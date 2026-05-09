import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const AGE_SATURATION_DAYS = 14;

type ScorableTicket = {
  title?: string | null;
  description?: string | null;
  createdAt: Date | string;
};

type ScoreResult = {
  emotion: number;
  complexity: number;
  age: number;
  priorityScore: number;
};

const clamp01 = (n: number): number =>
  Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5;

const computeAgeScore = (createdAt: Date | string): number => {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return 0;
  const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
  const normalized = ageDays / AGE_SATURATION_DAYS;
  return Math.min(1, Math.max(0, normalized));
};

export const scoreTicket = async (
  ticket: ScorableTicket
): Promise<ScoreResult> => {
  const text = [ticket.title, ticket.description].filter(Boolean).join("\n\n");

  let emotion = 0.5;
  let complexity = 0.5;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      response_format: { type: "json_object" },
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            'Score a support ticket on two axes. Reply with STRICT JSON only, no prose: {"emotion": <float 0.0-1.0>, "complexity": <float 0.0-1.0>}',
            '',
            'emotion — the frustration or urgency expressed in the WRITER\'S TONE and word choice only.',
            '  0.0 = calm, polite, no urgency ("could you please", "when convenient", "just a thought")',
            '  0.2 = mildly concerned, professional language ("would appreciate a fix", "minor issue")',
            '  0.4 = noticeably frustrated, some urgency ("this is annoying", "please fix soon", "blocking us")',
            '  0.6 = clearly frustrated, strong language ("unacceptable", "very urgent", "escalating this")',
            '  0.8 = angry, demanding, threatening consequences ("this is a disaster", "we are losing money")',
            '  1.0 = furious, aggressive, ultimatums ("FIX THIS NOW", "legal action", "I DEMAND")',
            'Score ONLY the tone — not the implied urgency of the topic itself. "All clients are blocked" is factual scope, not emotion.',
            '',
            'complexity — the TECHNICAL severity and business impact of the problem described.',
            '  0.0 = cosmetic only: typo, colour, grammar, spacing, icon size',
            '  0.2 = minor UX or feature request: dark mode, sorting preference, alignment glitch',
            '  0.4 = single feature degraded, workaround exists: slow load, filter not saving, wrong timezone',
            '  0.6 = one isolated feature broken, data is safe and system still runs: export fails, search wrong, emails not sending',
            '  0.8 = core workflow broken for many users, but system is up: login broken for a user group, financial reports wrong, backups failing',
            '  1.0 = system down, irreversible data loss, or active security breach: database unreachable, PII exposed, payments stopped',
            'Base complexity on the TECHNICAL PROBLEM, not on how many users complain about it.',
          ].join('\n'),
        },
        {
          role: "user",
          content: text || "(no ticket content provided)",
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);
    emotion = clamp01(Number(parsed.emotion));
    complexity = clamp01(Number(parsed.complexity));
  } catch {
    emotion = 0.5;
    complexity = 0.5;
  }

  const age = computeAgeScore(ticket.createdAt);
  const priorityScore = 0.4 * emotion + 0.35 * complexity + 0.25 * age;

  return { emotion, complexity, age, priorityScore };
};
