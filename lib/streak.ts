import { dateStr } from "@/lib/insights";

export function computeStreak(days: Set<string>, tz: string) {
  const loggedToday = days.has(dateStr(0, tz));
  let streak = 0;
  // if today isn't logged yet, the streak still counts through yesterday
  for (let i = loggedToday ? 0 : 1; i < 365 && days.has(dateStr(i, tz)); i++) streak++;
  return { streak, loggedToday };
}