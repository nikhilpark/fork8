import { pgTable, uuid, text, integer, real, timestamp, date, jsonb, boolean } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = supabase auth user id
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  age: integer("age"),
  name: text("name"),
  sex: text("sex"),
  activityLevel: text("activity_level"),
  dietType: text("diet_type"),
  timezone: text("timezone").default("Asia/Hong_Kong"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: text("type").notNull(), // lose | maintain | gain
  rateKgPerWeek: real("rate_kg_per_week"),
  kcal: integer("kcal").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
});

export const foods = pgTable("foods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  source: text("source").notNull(), // ifct | usda | custom
  kcal100: real("kcal_100").notNull(),
  protein100: real("protein_100").notNull(),
  carbs100: real("carbs_100").notNull(),
  fat100: real("fat_100").notNull(),
  fiber100: real("fiber_100").default(0),
  micros: jsonb("micros").$type<Record<string, number>>().default({}),
});

export const foodAliases = pgTable("food_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  foodId: uuid("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  alias: text("alias").notNull(), // always lowercase
});

export const portionUnits = pgTable("portion_units", {
  id: uuid("id").primaryKey().defaultRandom(),
  foodId: uuid("food_id").notNull().references(() => foods.id, { onDelete: "cascade" }),
  unit: text("unit").notNull(), // piece | katori | scoop | cup ...
  grams: real("grams").notNull(),
});

export const mealLogs = pgTable("meal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  mealType: text("meal_type").notNull(),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
  rawText: text("raw_text").notNull(),
});

export const logItems = pgTable("log_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  logId: uuid("log_id").notNull().references(() => mealLogs.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  foodId: uuid("food_id").references(() => foods.id), // null if LLM-estimated
  name: text("name").notNull(),
  qty: real("qty").notNull(),
  unit: text("unit").notNull(),
  grams: real("grams").notNull(),
  kcal: real("kcal").notNull(),
  protein: real("protein").notNull(),
  carbs: real("carbs").notNull(),
  fat: real("fat").notNull(),
  micros: jsonb("micros").$type<Record<string, number>>().default({}),
  estimated: boolean("estimated").default(false),
});

export const weightEntries = pgTable("weight_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  date: date("date").notNull(),
  kg: real("kg").notNull(),
});