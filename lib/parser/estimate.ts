import { z } from "zod";
import { UNITS } from "@/lib/types";
import { getAI } from "./llm";
import type { Candidate } from "@/lib/nutrition";

const SYSTEM = `You look up nutrition facts for a food tracking app used mostly in India.
Find reliable values PER 100 g of the food as normally eaten (cooked or prepared for dishes, raw for fruit and vegetables eaten raw). Prefer IFCT 2017 (India), USDA FoodData Central, or the manufacturer's label for packaged products.
Reply with ONLY a JSON object, no markdown, in exactly this shape:
{"found": true, "name": "<clear canonical name>", "aliases": ["<other common names, lowercase>"], "kcal100": 0, "protein100": 0, "carbs100": 0, "fat100": 0, "fiber100": 0, "portions": [{"unit": "piece", "grams": 0}], "note": "<one short line: what this is based on and any assumption>"}
Rules: carbs include fibre. Portion units may only be: ${UNITS.filter((u) => u !== "g" && u !== "ml").join(", ")}. Include the unit the user logged if it makes sense, with a realistic weight in grams per unit.
If you cannot find reliable data, reply {"found": false}. Never guess wildly.`;

const Raw = z.object({
  found: z.boolean(),
  name: z.string().min(1).max(80).optional(),
  aliases: z.array(z.string()).optional(),
  kcal100: z.number().optional(),
  protein100: z.number().optional(),
  carbs100: z.number().optional(),
  fat100: z.number().optional(),
  fiber100: z.number().optional(),
  portions: z.array(z.object({ unit: z.string(), grams: z.number() })).optional(),
  note: z.string().optional(),
});
type Raw = z.infer<typeof Raw>;

function parseJson(text: string): Raw | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return Raw.parse(JSON.parse(m[0])); } catch { return null; }
}

function toCandidate(raw: Raw, sources: string[]): Candidate | null {
  const { kcal100: k, protein100: p, carbs100: c, fat100: f } = raw;
  if ([k, p, c, f].some((v) => typeof v !== "number" || !isFinite(v)) || !raw.name) return null;
  const kcal = k as number, pro = p as number, carb = c as number, fat = f as number;
  const fiber = raw.fiber100 ?? 0;
  const atwater = 4 * pro + 4 * carb + 9 * fat;
  const sane =
    kcal >= 0 && kcal <= 900 && pro >= 0 && carb >= 0 && fat >= 0 &&
    pro + carb + fat <= 105 && fiber >= 0 && fiber <= carb + 0.5 &&
    Math.abs(atwater - kcal) <= Math.max(40, kcal * 0.25);
  if (!sane) return null;

  const portions: Record<string, number> = {};
  for (const x of raw.portions ?? []) {
    if ((UNITS as readonly string[]).includes(x.unit) && x.unit !== "g" && x.unit !== "ml" && x.grams > 0 && x.grams <= 2000)
      portions[x.unit] = Math.round(x.grams * 10) / 10;
  }
  return {
    foodId: null, isNew: true, name: raw.name, source: "ai", verified: false,
    aliases: (raw.aliases ?? []).slice(0, 8), note: raw.note, sources,
    kcal100: kcal, protein100: pro, carbs100: carb, fat100: fat, fiber100: fiber,
    micros: {}, portions,
  };
}


const schema = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    name: { type: "string", nullable: true },
    aliases: {
      type: "array",
      items: { type: "string" },
    },
    kcal100: { type: "number", nullable: true },
    protein100: { type: "number", nullable: true },
    carbs100: { type: "number", nullable: true },
    fat100: { type: "number", nullable: true },
    fiber100: { type: "number", nullable: true },
    portions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          unit: { type: "string" },
          grams: { type: "number" },
        },
        required: ["unit", "grams"],
      },
    },
    note: { type: "string" },
  },
  required: [
    "found",
    "name",
    "aliases",
    "kcal100",
    "protein100",
    "carbs100",
    "fat100",
    "fiber100",
    "portions",
    "note",
  ],
};
async function ask(prompt: string, web: boolean) {
  const res = await getAI().models.generateContent({
      model: "gemini-3.5-flash-lite", // check AI Studio for the current free model name
    contents: prompt,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
    },
  });
  const chunks: any[] = (res as any).candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources = chunks.map((c) => c.web?.title).filter(Boolean).slice(0, 3) as string[];
  return { text: res.text ?? "", sources };
}

export async function estimateFood(name: string, qty: number, unit: string): Promise<Candidate | null> {
  const prompt = `Food: ${name}\nThe user logged: ${qty} ${unit}`;
  const modes = process.env.AI_WEB_SEARCH === "false" ? [false] : [true, false];
  for (const web of modes) {
    try {
      const out = await ask(prompt, web);
      const raw = parseJson(out.text);
      if (!raw) continue;             // unparseable: try the next mode
      if (!raw.found) return null;    // model says it can't find it
      const cand = toCandidate(raw, web ? out.sources : []);
      if (cand) return cand;          // failed sanity checks: try the next mode
    } catch (e) {
      console.error("estimate failed", { web }, e);
    }
  }
  return null;
}