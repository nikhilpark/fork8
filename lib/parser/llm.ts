import { GoogleGenAI } from "@google/genai";
import { LLMParse, UNITS, MEAL_TYPES } from "@/lib/types";

// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
let ai: GoogleGenAI | null = null;

export function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

const SYSTEM = `You convert a casual food log sentence into structured items. Output JSON only.

Rules:
- Split into separate items. "4 boiled eggs, 2 whole 2 whites only" = 2 whole eggs + 2 egg whites (NOT 4 eggs). Use food_name "egg" for whole and "egg white" for whites.
- food_name: simple lowercase common name, no quantities. Keep Indian names as the user wrote them (roti, dal, dahi, paneer).
- qty and unit: if user gives a count of pieces use unit "piece". Bowl/katori of curry, dal, sabzi, rice = "katori". Glass of liquid = "glass". Weights in grams = "g". If no quantity is given, use qty 1 and the most natural unit.
- Allowed units: ${UNITS.join(", ")}.
- meal_type: only if the user states it (breakfast, lunch, dinner, snack, "for lunch", etc). Otherwise null. Never guess from the food.
- NEVER output calories, macros, or any nutrition numbers.
- Ignore filler words ("i ate", "had", "just", "today").`;

const schema = {
  type: "object",
  properties: {
    meal_type: { type: "string", enum: [...MEAL_TYPES], nullable: true },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          food_name: { type: "string" },
          qty: { type: "number" },
          unit: { type: "string", enum: [...UNITS] },
        },
        required: ["food_name", "qty", "unit"],
      },
    },
  },
  required: ["meal_type", "items"],
};

export async function parseWithLLM(text: string): Promise<LLMParse> {
console.log("parseWithLLM",text)
  const res = await getAI().models.generateContent({
    model: "gemini-3.5-flash-lite", // check AI Studio for the current free model name
    contents: text,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0,
    },
  });
  console.log(JSON.parse(res.text ?? "{}"))
  return LLMParse.parse(JSON.parse(res.text ?? "{}")); // throws if malformed
}

