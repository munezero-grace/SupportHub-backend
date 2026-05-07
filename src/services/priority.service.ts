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
          content:
            'You score support tickets on two axes. Reply with STRICT JSON only, no prose: {"emotion": <number 0..1>, "complexity": <number 0..1>}. emotion = frustration/urgency in the writer\'s tone (0 calm, 1 furious). complexity = technical severity (0 trivial cosmetic, 1 system-down/data-loss).',
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
