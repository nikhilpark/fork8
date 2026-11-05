import { findFood, Food, foods } from './foods'
export type ParsedItem = { name: string; qty: number; unit: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; confidence: number; estimated?: boolean }
const scale = (f: Food, qty: number): ParsedItem => ({ name: f.name, qty, unit: f.unit, grams: f.grams * qty, kcal: Math.round(f.kcal * qty), protein: +(f.protein * qty).toFixed(1), carbs: +(f.carbs * qty).toFixed(1), fat: +(f.fat * qty).toFixed(1), confidence: .97 })
export async function parseMealText(text: string) { await new Promise(r => setTimeout(r, 800)); const lower = text.toLowerCase(); const items: ParsedItem[] = []
 if (lower.includes('whole') && lower.includes('white')) { items.push(scale(findFood('egg')!, 2), scale(findFood('white')!, 2)); const rotis = lower.match(/(\d+)\s*rotis?/) ; if (rotis) items.push(scale(findFood('roti')!, +rotis[1])) }
 else { for (const f of (await Promise.resolve([ ...new Set([findFood(lower), ...foodsFor(lower)]) ]))) if (f) { const match = lower.match(new RegExp(`(\\d+)\\s*(?:${f.aliases.join('|')})`)); const qty = match ? +match[1] : (lower.includes('bowl') || lower.includes('katori') || lower.includes('glass') ? 1 : 1); items.push(scale(f, qty)) } }
 if (!items.length) items.push({ name: text.trim() || 'Unrecognized meal', qty: 1, unit: 'serving', grams: 150, kcal: 300, protein: 12, carbs: 35, fat: 10, confidence: .35, estimated: true })
 const mealType = lower.includes('breakfast') ? 'Breakfast' : lower.includes('lunch') ? 'Lunch' : lower.includes('dinner') ? 'Dinner' : lower.includes('snack') ? 'Snack' : new Date().getHours() < 11 ? 'Breakfast' : new Date().getHours() < 16 ? 'Lunch' : 'Dinner'
 return { mealType, items }
}
function foodsFor(text: string) { return ['roti','rice','dal','paneer','curd','chicken','egg','banana','oats','milk','almonds','rajma','chole','poha','idli','dosa','sabzi','whey','protein'].map(findFood).filter(f => f && text.includes(f.name.toLowerCase())) }
