import { string, z } from "zod";

export const UNITS = ["piece","g","ml","katori","cup","scoop","tbsp","tsp","slice","glass","plate","handful","tin"] as const;
export const MEAL_TYPES = ["breakfast","lunch","dinner","snack"] as const;

// What the LLM returns (no nutrition numbers allowed)
export const LLMParse = z.object({
  meal_type: z.enum(MEAL_TYPES).nullable(), // null = not stated in text
  items: z.array(z.object({
    food_name: z.string().min(1),
    qty: z.number().positive(),
    unit: z.enum(UNITS),
  })).min(1),
});
export type LLMParse = z.infer<typeof LLMParse>;

// What /api/parse returns to the frontend (match your mock shape)
export const NewFood = z
  .object({
    name: z.string().trim().min(1).max(80),
    query: z.string().trim().max(80).optional(),
    aliases: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
    kcal100: z.number().min(0).max(900),
    protein100: z.number().min(0).max(100),
    carbs100: z.number().min(0).max(100),
    fat100: z.number().min(0).max(100),
    fiber100: z.number().min(0).max(100).default(0),
    portions: z.array(z.object({ unit: z.enum(UNITS), grams: z.number().positive().max(2000) })).max(6).default([]),
    note: z.string().max(300).optional(),
    sources: z.array(z.string().max(120)).max(3).default([]),
  })
  .refine((f) => f.protein100 + f.carbs100 + f.fat100 <= 105 && f.fiber100 <= f.carbs100 + 0.5, "Nutrition values look inconsistent");

export const DraftItem = z.object({
  name: z.string(),
  foodId: z.string().nullable(),
  qty: z.number(),
  unit: z.string(),
  grams: z.number(),
  kcal: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  micros: z.record(z.string(), z.number()),
  confidence: z.enum(["high", "medium", "low"]),
  estimated: z.boolean(),
  query: z.string().optional(),
  candidates: z.array(z.unknown()).optional(),
});

export const SaveItem = DraftItem.omit({ candidates: true, query: true }).extend({ newFood: NewFood.optional() });

export const SaveLogBody = z.object({
  mealType: z.enum(MEAL_TYPES),
  rawText: z.string().max(500),
  loggedAt: z.string().datetime().optional(),
  items: z.array(SaveItem).min(1),
});
export type SaveLogBody = z.infer<typeof SaveLogBody>;
export type NewFood = z.infer<typeof NewFood>;

export const OnboardingBody = z.object({
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(300),
  name: z.string().trim().min(1).max(40),
  age: z.number().int().min(18).max(100), // targets are tuned for adults
  sex: z.enum(["male", "female", "other"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  dietType: z.enum(["veg", "eggetarian", "non_veg"]),
  timezone: z.string().default("Asia/Hong_Kong"),
  goalType: z.enum(["lose", "maintain", "gain"]),
  rateKgPerWeek: z.number().min(0).max(1),
  // final targets after the user's tweaks on the last screen
  kcal: z.number().int().min(1000).max(6000),
  proteinG: z.number().int().min(20).max(400),
  carbsG: z.number().int().min(0).max(800),
  fatG: z.number().int().min(10).max(300),
});
export type OnboardingBody = z.infer<typeof OnboardingBody>;