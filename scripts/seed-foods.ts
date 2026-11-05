import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "fs";

async function main() {
  const { db } = await import("../db");
  const { foods, foodAliases, portionUnits } = await import("../db/schema");

  const rows = JSON.parse(readFileSync("data/foods.seed.json", "utf8"));

  for (const r of rows) {
    const [food] = await db.insert(foods).values({
      name: r.name,
      source: r.source,
      kcal100: r.kcal100,
      protein100: r.protein100,
      carbs100: r.carbs100,
      fat100: r.fat100,
      fiber100: r.fiber100 ?? 0,
      micros: r.micros ?? {},
    }).returning();

    const aliases = [...new Set([
      r.name.toLowerCase(),
      ...r.aliases.map((a: string) => a.toLowerCase()),
    ])];

    await db.insert(foodAliases).values(
      aliases.map((alias) => ({ foodId: food.id, alias }))
    );

    if (r.portions?.length) {
      await db.insert(portionUnits).values(
        r.portions.map((p: any) => ({
          foodId: food.id,
          unit: p.unit,
          grams: p.grams,
        }))
      );
    }
  }

  console.log(`Seeded ${rows.length} foods`);
  process.exit(0);
}

main();