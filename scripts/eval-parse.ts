import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { parseWithLLM } from "../lib/parser/llm";

const cases: { text: string; expect: { food: string; qty: number }[]; meal?: string }[] = [
  { text: "i ate 4 boiled eggs, 2 whole 2 whites only, and 2 rotis",
    expect: [{ food: "egg", qty: 2 }, { food: "egg white", qty: 2 }, { food: "roti", qty: 2 }] },
  { text: "lunch: a katori of dal, 1 katori rice, 1 roti", meal: "lunch",
    expect: [{ food: "dal", qty: 1 }, { food: "rice", qty: 1 }, { food: "roti", qty: 1 }] },
  { text: "protein shake with 1 scoop whey",
    expect: [{ food: "whey", qty: 1 }] },

  // add 27 more of YOUR real sentences
];

(async () => {
  let pass = 0;
  for (const c of cases) {
    try {
      const out = await parseWithLLM(c.text);
      const ok = c.expect.every((e) =>
        out.items.some((i) => i.food_name.includes(e.food) && i.qty === e.qty)
      ) && (!c.meal || out.meal_type === c.meal);
      if (ok) pass++; else console.log("FAIL:", c.text, JSON.stringify(out));
    } catch (e) { console.log("ERROR:", c.text, e); }
  }
  console.log(`${pass}/${cases.length} passed`);
  process.exit(0);
})();