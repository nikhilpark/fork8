export type Food = {
  name: string;
  aliases: string[];
  grams: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  micros: Record<string, number>;
};

const base = (
  name: string,
  aliases: string[],
  grams: number,
  unit: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
): Food => ({
  name,
  aliases,
  grams,
  unit,
  kcal,
  protein,
  carbs,
  fat,
  fiber,
  micros: {
    iron: 8,
    calcium: 5,
    b12: 4,
    vitaminD: 3,
    potassium: 7,
    magnesium: 6,
    zinc: 8,
  },
});
export const foods: Food[] = [
  base("Roti", ["roti", "chapati"], 40, "piece", 104, 3.2, 18, 2.5, 2.8),
  base("Cooked rice", ["rice"], 150, "bowl", 195, 4, 42, 0.4, 0.6),
  base("Dal", ["dal", "lentils"], 150, "katori", 180, 10, 28, 3, 8),
  base("Paneer", ["paneer"], 100, "100g", 265, 18, 6, 20, 0),
  base("Curd", ["curd", "yogurt"], 150, "bowl", 95, 5, 7, 5, 0),
  base("Chicken breast", ["chicken"], 100, "100g", 165, 31, 0, 3.6, 0),
  base("Whole egg", ["egg", "eggs"], 50, "piece", 72, 6.3, 0.4, 4.8, 0),
  base("Egg white", ["white", "whites"], 33, "piece", 17, 3.6, 0.2, 0.1, 0),
  base("Banana", ["banana"], 100, "piece", 89, 1.1, 23, 0.3, 2.6),
  base("Oats", ["oats"], 40, "serving", 152, 5.2, 27, 2.8, 4),
  base("Milk", ["milk"], 250, "glass", 150, 8, 12, 8, 0),
  base("Almonds", ["almonds"], 15, "handful", 87, 3.2, 3.2, 7.5, 1.8),
  base("Rajma", ["rajma"], 150, "katori", 190, 12, 34, 1, 9),
  base("Chole", ["chole", "chickpeas"], 150, "katori", 240, 12, 38, 5, 10),
  base("Poha", ["poha"], 200, "bowl", 220, 5, 40, 5, 3),
  base("Idli", ["idli"], 60, "piece", 58, 2, 12, 0.2, 0.8),
  base("Dosa", ["dosa"], 100, "piece", 168, 4, 28, 5, 1),
  base("Sabzi", ["sabzi", "vegetables"], 150, "katori", 130, 4, 16, 6, 5),
  base("Whey protein", ["whey", "protein"], 30, "scoop", 120, 24, 3, 2, 0),
  base("Peanut butter", ["peanut butter"], 16, "tbsp", 94, 4, 3, 8, 1),
];
export const findFood = (text: string) =>
  foods.find((f) =>
    [f.name, ...f.aliases].some((a) => text.toLowerCase().includes(a)),
  );
