
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "fs";

const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

async function main() {
  console.log("\n========== FORK8 FOOD IMPORT ==========\n");

  console.log("1. Connecting to database...");

  const { db } = await import("../db");
  const { foods, foodAliases, portionUnits } = await import("../db/schema");

  console.log("Database module loaded successfully.");

  // Load JSON
  const filePath = "data/foodData.json";

  console.log(`\n2. Reading JSON: ${filePath}`);

  const raw = readFileSync(filePath, "utf8");

  console.log(`File size: ${(Buffer.byteLength(raw) / 1024).toFixed(2)} KB`);

  if (!raw.trim()) {
    throw new Error("foodData.json is empty!");
  }

  const rows = JSON.parse(raw);

  if (!Array.isArray(rows)) {
    throw new Error("Expected foodData.json to contain a JSON array.");
  }

  console.log(`Successfully loaded ${rows.length} food records.\n`);

  let insertedFoods = 0;
  let skippedFoods = 0;
  let insertedAliases = 0;
  let skippedAliases = 0;
  let insertedPortions = 0;

  console.log("3. Fetching existing foods and aliases...");

  await db.transaction(async (tx) => {
    const existingFoods = await tx
      .select({ name: foods.name })
      .from(foods);

    const existingAliases = await tx
      .select({ alias: foodAliases.alias })
      .from(foodAliases);

    const existingNames = new Set([
      ...existingFoods.map((f) => normalize(f.name)),
      ...existingAliases.map((a) => normalize(a.alias)),
    ]);

    console.log(`Existing foods: ${existingFoods.length}`);
    console.log(`Existing aliases: ${existingAliases.length}`);
    console.log(`Unique existing names: ${existingNames.size}\n`);

    console.log("4. Starting food import...\n");

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = r.name?.trim();

      console.log(
        `[${i + 1}/${rows.length}] Processing: ${name || "UNNAMED FOOD"}`
      );

      if (!name) {
        skippedFoods++;
        console.log("  SKIPPED: Missing food name.\n");
        continue;
      }

      const normalizedName = normalize(name);

      if (existingNames.has(normalizedName)) {
        skippedFoods++;
        console.log("  SKIPPED: Food already exists.");
        continue;
      }

      console.log("  Inserting food...");

      const [food] = await tx
        .insert(foods)
        .values({
          name,
          source: r.source || "anuvaad",
          kcal100: r.kcal_100,
          protein100: r.protein_100,
          carbs100: r.carbs_100,
          fat100: r.fat_100,
          fiber100: r.fiber_100 ?? 0,
          micros:
            typeof r.micros === "string"
              ? JSON.parse(r.micros)
              : r.micros ?? {},
        })
        .returning();

      insertedFoods++;
      existingNames.add(normalizedName);

      console.log(`  INSERTED: ${food.name} (ID: ${food.id})`);

      // Aliases
      const aliases = [
        name,
        ...(Array.isArray(r.aliases) ? r.aliases : []),
      ];

      const uniqueAliases = [
        ...new Set(
          aliases
            .filter((a: unknown) => typeof a === "string" && a.trim())
            .map(normalize)
        ),
      ];

      const aliasRows = [];

      for (const alias of uniqueAliases) {
        if (existingNames.has(alias) && alias !== normalizedName) {
          skippedAliases++;
          console.log(`  Alias skipped (already exists): ${alias}`);
          continue;
        }

        aliasRows.push({
          foodId: food.id,
          alias,
        });

        existingNames.add(alias);
      }

      if (aliasRows.length) {
        await tx.insert(foodAliases).values(aliasRows);
        insertedAliases += aliasRows.length;

        console.log(`Aliases inserted: ${aliasRows.length}`);
      }

      // Portions
      if (Array.isArray(r.portions) && r.portions.length) {
        await tx.insert(portionUnits).values(
          r.portions.map((p: any) => ({
            foodId: food.id,
            unit: p.unit,
            grams: p.grams,
          }))
        );

        insertedPortions += r.portions.length;

        console.log(`  Portions inserted: ${r.portions.length}`);
      }

      // Progress
      if ((i + 1) % 25 === 0 || i + 1 === rows.length) {
        console.log(
          `\n--- PROGRESS: ${i + 1}/${rows.length} | Foods: ${insertedFoods} inserted, ${skippedFoods} skipped | Aliases: ${insertedAliases} inserted ---\n`
        );
      }
    }
  });

  console.log("\n========== IMPORT COMPLETE ==========");
  console.log(`Total JSON rows:   ${rows.length}`);
  console.log(`Foods inserted:    ${insertedFoods}`);
  console.log(`Foods skipped:     ${skippedFoods}`);
  console.log(`Aliases inserted:  ${insertedAliases}`);
  console.log(`Aliases skipped:   ${skippedAliases}`);
  console.log(`Portions inserted: ${insertedPortions}`);
  console.log("=====================================\n");
}

main().catch((error) => {
  console.error("\n========== IMPORT FAILED ==========");
  console.error(error);
  process.exitCode = 1;
});
