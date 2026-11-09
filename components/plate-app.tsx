"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { type Candidate, applyCandidate, scaleItem, convertQty, sameFood } from "@/lib/nutrition";
import { searchFoods, estimateFood } from "@/lib/api/foods";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Flame,
  Utensils,
  HeartPulse,
  Home,
  Mic,
  Moon,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
  X,
  Minus,
  Check,
  Loader2
} from "lucide-react";
// import { parseMealText, ParsedItem } from "@/lib/mock/parser";
// import { profile as seedProfile, seedMeals, history } from "@/lib/mock/seed";

import { parseMealText } from "@/lib/api/parse";
import { getMe, submitOnboarding } from "@/lib/api/me";
import { getDay, saveLog, deleteItem } from "@/lib/api/logs";
import {
  computeTargets,
  type Sex,
  type Activity,
  type GoalType,
} from "@/lib/targets";
import { getInsights, logWeight } from "@/lib/api/insights";
type Item = {
  id?: string;
  foodId?: string | null;
  name: string;
  qty: number;
  unit: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  micros?: Record<string, number>;
  confidence?: number;
  estimated?: boolean;
};
type Meal = { type: string; items: Item[] };
type DItem = Item & {
  key: string;
  query?: string;
  candidates?: Candidate[];
  food?: Candidate;
  busy?: boolean;
  err?: string;
};
type Draft = { mealType: string; items: DItem[]; rawText?: string };

const mkKey = () => Math.random().toString(36).slice(2, 9);
const prepItems = (items: any[]): DItem[] =>
  items.map((i) => ({
    ...i,
    key: mkKey(),
    food: i.candidates?.find((c: Candidate) => c.foodId && c.foodId === i.foodId),
  }));
const DEFAULT_TARGETS = { kcal: 2000, protein: 120, carbs: 220, fat: 60 };
const fmt = (n: number) => Math.round(n);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
const nav = [
  { id: "today", label: "Today", icon: Home },
  { id: "insights", label: "Insights", icon: TrendingDown },
  { id: "profile", label: "Profile", icon: CircleUserRound },
];

export default function PlateApp() {
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [screen, setScreen] = useState("today");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [text, setText] = useState("");
  const [streak, setStreak] = useState({ count: 0, loggedToday: false });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [openMeal, setOpenMeal] = useState<string | null>("Breakfast");
  const [dark, setDark] = useState(false);
  const [onboard, setOnboard] = useState(false);
  const [onStep, setOnStep] = useState(1);

  const notify = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };

  const targets = me?.goal
    ? {
        kcal: me.goal.kcal,
        protein: me.goal.proteinG,
        carbs: me.goal.carbsG,
        fat: me.goal.fatG,
      }
    : DEFAULT_TARGETS;

  const refreshMe = async () => {
    const m = await getMe();
    if (!m.unauthenticated) setMe(m);
  };

  const loadDay = async () => {
    const d = await getDay(todayStr());
    const grouped: Record<string, Item[]> = {};
    for (const l of d.logs) (grouped[cap(l.mealType)] ??= []).push(...l.items);
    setMeals(Object.entries(grouped).map(([type, items]) => ({ type, items })));
    setStreak({ count: d.streak, loggedToday: d.loggedToday });
  };

  // boot: who am I?
  useEffect(() => {
    (async () => {
      const m = await getMe();
      if (m.unauthenticated) {
        router.replace("/login");
        return;
      }
      setMe(m);
      if (!m.profile) setOnboard(true);
      setBooting(false);
    })().catch(() => {
      setBooting(false);
      notify("Couldn't reach the server");
    });
  }, []);

  // load today's meals once we know the user has a profile
  useEffect(() => {
    if (me?.profile)
      loadDay().catch(() => notify("Couldn't load today's meals"));
  }, [me]);

  const totals = useMemo(
    () =>
      meals
        .flatMap((m) => m.items)
        .reduce(
          (a, i) => ({
            kcal: a.kcal + i.kcal,
            protein: a.protein + i.protein,
            carbs: a.carbs + i.carbs,
            fat: a.fat + i.fat,
          }),
          { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        ),
    [meals],
  );

  const saveDraft = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      await saveLog(draft.mealType, draft.rawText ?? "", draft.items);
      await loadDay();
      const kcal = draft.items.reduce((a, i) => a + i.kcal, 0);
      notify(`Logged to ${draft.mealType} · ${fmt(kcal)} kcal`);
      setDraft(null);
      setText("");
    } catch (e: any) {
      notify(e.message ?? "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: Item) => {
    if (!item.id) return;
    try {
      await deleteItem(item.id);
      await loadDay();
    } catch (e: any) {
      notify(e.message ?? "Couldn't delete");
    }
  };

  if (booting)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[#7b887f]">
        Loading…
      </div>
    );

  if (onboard)
    return (
      <Onboarding
        step={onStep}
        setStep={setOnStep}
        initial={me}
        onDone={async () => {
          await refreshMe();
          setOnboard(false);
          setOnStep(1);
          setScreen("today");
        }}
        onCancel={
          me?.profile
            ? () => {
                setOnboard(false);
                setOnStep(1);
              }
            : undefined
        }
      />
    );
  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen bg-[#f6f8f6] text-[#17231e] dark:bg-[#111715] dark:text-[#edf5f0] font-sans">
        <div className="mx-auto min-h-screen max-w-md bg-[#f6f8f6] dark:bg-[#111715] lg:max-w-6xl lg:px-8">
          <header className="flex items-center justify-between px-5 pb-2 pt-7 lg:px-0">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-xl bg-[#d9f5df] text-[#167a46]">
                  <Utensils size={16} />
                </div>
                <span className="text-xl font-semibold tracking-tight">
            fork<span className="text-[#28a866]">8</span>
                </span>
              </div>
            </div>
            {/* <button
              onClick={() => setDark(!dark)}
              className="grid size-11 place-items-center rounded-full bg-white text-[#65716b] shadow-sm dark:bg-[#1d2722]"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button> */}
          </header>
          <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
            <section className="px-5 pb-28 lg:px-0">
              {screen === "today" ? (
                <Today
                  totals={totals}
                  meals={meals}
                  openMeal={openMeal}
                  setOpenMeal={setOpenMeal}
                  name={me?.profile?.name}
                  removeItem={removeItem}
                  setOnboard={setOnboard}
                  targets={targets}
                  text={text}
                  setText={setText}
                  setDraft={setDraft}
                  notify={notify}
                  streak={streak}
                />
              ) : screen === "insights" ? (
                <Insights refreshMe={refreshMe} notify={notify} />
              ) : (
                <Profile
                  dark={dark}
                  setDark={setDark}
                  setOnboard={setOnboard}
                  me={me}
                />
              )}
            </section>
            <aside className="hidden lg:block lg:pt-10">
              <nav
                className="mb-6 flex gap-2 rounded-2xl bg-white p-2 shadow-sm"
                aria-label="Primary navigation"
              >
                {nav.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setScreen(id)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium ${screen === id ? "bg-[#e2f5e7] text-[#198a4e]" : "text-[#8b9890]"}`}
                  >
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </nav>
              <StreakCard
                count={streak.count}
                loggedToday={streak.loggedToday}
              />
            </aside>
          </div>
          <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-[#e5ebe6] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-[#26322b] dark:bg-[#17201c]/95 lg:hidden">
            <nav className="flex justify-around">
              {nav.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setScreen(id)}
                  className={`flex min-h-11 min-w-20 flex-col items-center gap-1 text-[11px] font-medium ${screen === id ? "text-[#198a4e]" : "text-[#8b9890]"}`}
                >
                  <Icon size={19} />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </main>
      {draft && (
        <Confirm
          draft={draft}
          setDraft={setDraft}
          save={saveDraft}
          notify={notify}
          saving={saving}
        />
      )}
      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[#19352a] px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}{" "}
    </div>
  );
}
function Today({
  totals,
  meals,
  openMeal,
  setOpenMeal,
  removeItem,
  setOnboard,
  targets,
  name,
  text: value,
  setText: setValue,
  setDraft,
  notify,
  streak,
}: any) {
  const [processingStep, setProcessingStep] = useState(0);

  const processingMessages = [
    "Understanding your meal...",
    "Identifying food items...",
    "Estimating portion sizes...",
    "Calculating calories and macros...",
    "Preparing your food log...",
  ];
  const [working, setWorking] = useState(false);
  const [listening, setListening] = useState(false);
  const left = Math.round(targets.kcal - totals.kcal)
  const remaining = targets.kcal - totals.kcal;
const progress = Math.min(100, (totals.kcal / targets.kcal) * 100);
const exceeded = remaining < 0;
 const run = async (t: string = value) => {
  if (!t.trim() || working) return;
  setWorking(true);
  try {
    const parsed = await parseMealText(t);
setDraft({ ...parsed, items: prepItems(parsed.items), rawText: t });  

} catch (e: any) {
    notify(e.message ?? "Couldn't parse that, try rephrasing");
  } finally {
    setWorking(false);
  }
};

const recRef = useRef<any>(null);
useEffect(() => () => recRef.current?.abort?.(), []);

const toggleMic = () => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    notify("Voice input isn't supported in this browser. Try Chrome or Safari.");
    return;
  }
  if (listening) {
    recRef.current?.stop();
    return;
  }
  const rec = new SR();
  rec.lang = "en-IN"; // better with Indian food words
  rec.interimResults = true;
  rec.continuous = false;
  let heard = "";
  rec.onresult = (e: any) => {
    heard = Array.from(e.results).map((r: any) => r[0].transcript).join(" ").trim();
    setValue(heard);
  };
  rec.onerror = (e: any) => {
    heard = "";
    notify(
      e.error === "not-allowed" ? "Microphone access was blocked"
      : e.error === "no-speech" ? "Didn't catch that, try again"
      : "Voice input failed",
    );
  };
  rec.onend = () => {
    setListening(false);
    if (heard) run(heard);
  };
  recRef.current = rec;
  setValue("");
  setListening(true);
  rec.start();
};

  return (
    <>
      <div className="flex items-end justify-between pt-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-[#7b887f]">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
            {streak.count > 0 && (
              <span
                title={
                  streak.loggedToday
                    ? "Today's logged"
                    : "Log a meal today to keep your streak"
                }
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold lg:hidden ${
                  streak.loggedToday
                    ? "bg-[#e2f5e7] text-[#208850]"
                    : "bg-[#fff3d6] text-[#9b7526]"
                }`}
              >
                <Flame size={13} />
                {streak.count} {streak.count === 1 ? "day" : "days"}
                {!streak.loggedToday && (
                  <span className="font-medium"> · log today</span>
                )}
              </span>
            )}
          </div>
          {(() => {
            const h = new Date().getHours();
            const hi =
              h < 12
                ? "Good morning"
                : h < 17
                  ? "Good afternoon"
                  : "Good evening";
            return name ? `${hi}, ${name}` : hi;
          })()}
        </div>
        <button
          onClick={() => setOnboard(true)}
          className="hidden rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#1d8b50] shadow-sm lg:block"
        >
          Edit goals
        </button>
      </div>
      <div className="mt-6">
        {/* <div className="mb-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setValue("2 eggs with toast")}
            disabled={working}
            className="whitespace-nowrap rounded-full bg-[#e1f5e6] px-3 py-2 text-xs font-medium text-[#228750]"
          >
            My usual breakfast
          </button>

          <button
            onClick={() => setValue("protein shake")}
            disabled={working}
            className="whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-medium text-[#65716b]"
          >
            Protein shake
          </button>

          <button
            onClick={() => setValue("rice with dal and curd")}
            disabled={working}
            className="whitespace-nowrap rounded-full bg-white px-3 py-2 text-xs font-medium text-[#65716b]"
          >
            Yesterday's lunch
          </button>
        </div> */}

        {/* INPUT */}
        <div
          className={`flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm transition-all duration-300 ${
            working
              ? "border-[#9bd8ae] shadow-[0_0_0_3px_rgba(30,155,89,0.08)]"
              : "border-[#dfe9e1]"
          }`}
        >
         <button
  onClick={toggleMic}
  aria-label={listening ? "Stop listening" : "Use voice input"}
  className={`grid size-10 shrink-0 place-items-center rounded-xl ${
    listening
      ? "animate-pulse bg-[#d9f5df] text-[#1e9b59] ring-2 ring-[#1e9b59]/40"
      : "bg-[#f1f7f2] text-[#228750]"
  }`}
>
  <Mic size={18} />
</button>

          <input
            value={value}
            disabled={working}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              )
                run();
            }}
            aria-label="Describe your meal"
            className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#9ca8a0] disabled:opacity-60"
placeholder={
  listening ? "Listening… say what you ate"
  : working ? "Understanding your meal…"
  : "What did you eat? e.g. 2 rotis with dal"
}          />

          <button
            aria-label="Log meal"
            onClick={() => run()}
            disabled={working || !value.trim()}
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1e9b59] text-white transition-all duration-200 hover:bg-[#17844b] active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {working ? (
              <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>

        {/* PROCESSING ANIMATION */}
        {/* PROCESSING OVERLAY */}
        <div
          className={`fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-6 transition-all duration-300 ${
            working
              ? "visible opacity-100"
              : "invisible opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`w-full max-w-sm rounded-[28px] bg-[#fbfdfb] p-7 text-center shadow-2xl transition-all duration-300 dark:bg-[#17201c] ${
              working ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
            }`}
          >
            {/* Animated icon */}
            <div className="relative mx-auto mb-6 grid size-20 place-items-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#1e9b59]/10" />

              <div className="absolute inset-1 animate-spin rounded-full border-[3px] border-[#dceee1] border-t-[#1e9b59]" />

              <div className="relative grid size-12 place-items-center rounded-full bg-[#e5f6e9] text-[#1e9b59]">
                <Utensils size={23} />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-[#17231e] dark:text-[#edf5f0]">
              Creating your food log
            </h3>

            <p
              key={processingStep}
              className="mt-2 min-h-5 animate-pulse text-sm text-[#718078]"
            >
              {processingMessages[processingStep]}
            </p>

            {/* Progress animation */}
            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-[#e5eee7]">
              <div className="h-full w-1/3 animate-[loading_1.5s_ease-in-out_infinite] rounded-full bg-[#1e9b59]" />
            </div>

            <p className="mt-4 text-xs text-[#9aa79e]">
              Analyzing ingredients and nutritional values
            </p>
          </div>
        </div>
      </div>
    
      <div className="mt-6 rounded-[28px] bg-[#19352a] p-6 text-white shadow-[0_18px_40px_-24px_#19352a]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#b7d1c2]">Daily fuel</span>
          <span className="text-xs text-[#b7d1c2]">
            {fmt(targets.kcal)} kcal goal
          </span>
        </div>
        <div className="mt-5 flex items-center gap-6">
      <div className="flex shrink-0 flex-col items-center">
  <div
    className="grid size-32 place-items-center rounded-full"
    style={{
      background: `conic-gradient(
        ${exceeded ? "#e88b72" : "#55d783"} ${progress * 3.6}deg,
        #315346 0deg
      )`,
    }}
  >
    <div className="grid size-24 place-items-center rounded-full bg-[#19352a] text-center">
      <div>
        <div className="text-2xl font-semibold tabular-nums">
          {fmt(totals.kcal)}
        </div>
        <div className="text-[10px] text-[#b7d1c2]">
          kcal consumed
        </div>
      </div>
    </div>
  </div>

  <div className={`mt-2 text-xs font-medium ${
    exceeded ? "text-[#f2a18b]" : "text-[#b7d1c2]"
  }`}>
    {exceeded
      ? `${fmt(Math.abs(remaining))} kcal over`
      : `${fmt(remaining)} kcal left`}
  </div>
</div>
        
          <div className="grid flex-1 grid-cols-3 gap-3">
            {[
              ["Protein", totals.protein, targets.protein, "#65d99a"],
              ["Carbs", totals.carbs, targets.carbs, "#e8c86e"],
              ["Fat", totals.fat, targets.fat, "#df9a72"],
            ].map(([l, v, t, c]: any) => (
              <div key={l}>
                <div className="text-xs text-[#b7d1c2]">{l}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">
                  {fmt(v)}
                  <span className="text-xs font-normal text-[#b7d1c2]">
                    /{t}g
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#315346]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (v / t) * 100)}%`,
                      background: c,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Today&apos;s meals</h2>
        <span className="text-xs text-[#7b887f]">
          {meals.flatMap((m: any) => m.items).length} items logged
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {["Breakfast", "Lunch", "Dinner", "Snack"].map((type) => (
          <MealCard
            key={type}
            type={type}
            meal={meals.find((m: any) => m.type === type)}
            open={openMeal === type}
            setOpen={() => setOpenMeal(openMeal === type ? null : type)}
            remove={removeItem}
          />
        ))}
      </div>
    </>
  );
}
function MealCard({ type, meal, open, setOpen, remove }: any) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_20px_-18px_#19352a] dark:bg-[#1b2520]">
      <button
        onClick={setOpen}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <div className="font-semibold">{type}</div>
          <div className="mt-1 text-xs text-[#89968e]">
            {meal?.items?.reduce((a: any, i: any) => a + i.kcal, 0) || 0} kcal
          </div>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="mt-4 border-t border-[#edf1ed] pt-2">
          {meal?.items?.length ? (
            meal.items.map((item: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-[#89968e]">
                    {item.qty} {item.unit}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-[#536159]">
                    {item.kcal} kcal
                  </span>
                  <button
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item.name}`}
                    className="text-[#b0bbb3]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-[#a0aaa3]">Nothing logged yet</p>
          )}
        </div>
      )}
    </div>
  );
}

function FoodPicker({ item, onPick, notify }: { item: DItem; onPick: (c: Candidate) => void; notify: (m: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const searching = q.trim().length >= 2;

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setResults([]); return; }
    setLoading(true);
    const id = setTimeout(() => {
      searchFoods(t).then(setResults).catch(() => notify("Search failed")).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const list = searching ? results : item.candidates ?? [];
  return (
    <div className="mt-3 rounded-2xl bg-[#f6f8f6] p-2 dark:bg-[#111715]">
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods…" autoFocus
        className="h-10 w-full rounded-xl border border-[#dce7de] bg-white px-3 text-base outline-none focus:border-[#28a866] dark:bg-[#1b2520]"
      />
      <div className="mt-2 max-h-52 overflow-y-auto">
        {loading && <p className="px-3 py-2 text-xs text-[#89968e]">Searching…</p>}
        {!loading && list.length === 0 && (
          <p className="px-3 py-2 text-xs text-[#89968e]">{searching ? "No matches. Try another word." : "No suggestions. Type to search."}</p>
        )}
        {list.map((c) => (
          <button
            key={c.foodId ?? "new"} onClick={() => onPick(c)}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-white dark:hover:bg-[#1b2520]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {item.food && sameFood(item.food, c) && <Check size={14} className="shrink-0 text-[#208850]" />}
              <span className="truncate">{c.name}</span>
              {c.source === "ai" && <span className="shrink-0 rounded bg-[#fff3d6] px-1 py-0.5 text-[10px] text-[#9b7526]">unverified</span>}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-[#89968e]">{Math.round(c.kcal100)} kcal/100g</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Confirm({ draft, setDraft, save, saving, notify }: any) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items: DItem[] = draft.items;

  const patch = (key: string, p: Partial<DItem>) =>
    setDraft((d: Draft | null) => d && { ...d, items: d.items.map((i) => (i.key === key ? { ...i, ...p } : i)) });

  const remove = (key: string) => {
    if (items.length <= 1) return setDraft(null);
    setDraft((d: Draft | null) => d && { ...d, items: d.items.filter((i) => i.key !== key) });
  };

  const stepOf = (it: DItem) => (it.unit === "g" || it.unit === "ml" ? 10 : 0.5);
  const setQty = (it: DItem, qty: number) => {
    if (!(qty > 0)) return;
    patch(it.key, it.food ? applyCandidate(it, it.food, { qty }) : scaleItem(it, qty));
  };
  const setUnit = (it: DItem, unit: string) => {
    if (!it.food) return;
    patch(it.key, applyCandidate(it, it.food, { qty: convertQty(it.grams, it.food.portions, unit), unit }));
  };
  const pick = (it: DItem, c: Candidate) => {
    patch(it.key, {
      ...applyCandidate(it, c),
      food: c, name: c.name, foodId: c.foodId, confidence: 0.9, estimated: c.source === "ai", err: undefined,
      candidates: it.candidates?.some((x) => sameFood(x, c)) ? it.candidates : [c, ...(it.candidates ?? [])],
    });
    setOpenKey(null);
  };
  const deeper = async (it: DItem) => {
    patch(it.key, { busy: true, err: undefined });
    try {
      const c = await estimateFood(it.query ?? it.name, it.qty, it.unit);
      patch(it.key, {
        ...applyCandidate(it, c),
        busy: false, food: c, name: c.name, foodId: null, confidence: 0.5, estimated: true,
        candidates: [c, ...(it.candidates ?? [])],
      });
    } catch (e: any) {
      patch(it.key, { busy: false, err: e.message ?? "Search failed" });
    }
  };

  const total = items.reduce(
    (a, i) => ({ kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const unresolved = items.filter((i) => !i.food && i.foodId == null && i.kcal === 0).length;
  const anyBusy = items.some((i) => i.busy);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30">
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-[#fbfdfb] p-5 pb-8 text-[#17231e] shadow-2xl dark:bg-[#17201c] dark:text-[#edf5f0]">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#d4ddd6]" />
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#32a964]">Ready to log</p>
            <h2 className="mt-1 text-xl font-semibold">Check your meal</h2>
          </div>
          <button onClick={() => setDraft(null)} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="mt-5 flex gap-2">
          {["Breakfast", "Lunch", "Dinner", "Snack"].map((t) => (
            <button
              key={t}
              onClick={() => setDraft({ ...draft, mealType: t })}
              className={`rounded-full px-3 py-2 text-xs ${draft.mealType === t ? "bg-[#1e9b59] text-white" : "bg-[#edf5ee] text-[#607168]"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 divide-y divide-[#edf1ed]">
          {items.map((i) => {
            const notFound = !i.food && i.foodId == null && i.kcal === 0;
            const ai = i.food?.source === "ai";
            const units = i.food ? [...new Set([i.unit, "g", ...Object.keys(i.food.portions)])] : null;
            return (
              <div key={i.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setOpenKey(openKey === i.key ? null : i.key)}
                    aria-label={`Change food for ${i.name}`}
                    className="flex min-w-0 items-center gap-1.5 text-left font-medium"
                  >
                    <span className="truncate">{i.name}</span>
                    <ChevronDown size={14} className={`shrink-0 text-[#89968e] transition ${openKey === i.key ? "rotate-180" : ""}`} />
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm tabular-nums">{i.kcal} kcal</span>
                    <button onClick={() => remove(i.key)} aria-label={`Remove ${i.name}`} className="grid size-9 place-items-center text-[#b0bbb3]">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {(ai || notFound) && (
                  <span className="mt-1 inline-block rounded bg-[#fff3d6] px-1.5 py-0.5 text-[10px] text-[#9b7526]">
                    {notFound ? "not found" : "unverified · AI estimate"}
                  </span>
                )}

                {!notFound && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-xl bg-[#f1f7f2] dark:bg-[#223029]">
                      <button
                        onClick={() => setQty(i, Math.max(stepOf(i), +(i.qty - stepOf(i)).toFixed(2)))}
                        disabled={i.qty <= stepOf(i)} aria-label="Decrease quantity"
                        className="grid size-9 place-items-center text-[#228750] disabled:opacity-40"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="min-w-12 text-center text-sm font-semibold tabular-nums">{Number(i.qty.toFixed(2))}</span>
                      <button
                        onClick={() => setQty(i, +(i.qty + stepOf(i)).toFixed(2))} aria-label="Increase quantity"
                        className="grid size-9 place-items-center text-[#228750]"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {units ? (
                      <select
                        value={i.unit} onChange={(e) => setUnit(i, e.target.value)} aria-label="Unit"
                        className="h-9 rounded-xl border border-[#dce7de] bg-white px-2 text-sm text-[#17231e]"
                      >
                        {units.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <span className="text-sm text-[#89968e]">{i.unit}</span>
                    )}
                    <span className="text-xs tabular-nums text-[#89968e]">{Math.round(i.grams)} g</span>
                  </div>
                )}

                {notFound && (
                  <div className="mt-2 rounded-xl bg-[#fffaf0] p-3 text-sm text-[#6e603e]">
                    <p>We couldn&apos;t find this in our food database.</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => deeper(i)} disabled={i.busy}
                        className="flex min-h-10 items-center gap-1.5 rounded-xl bg-[#1e9b59] px-3 font-medium text-white disabled:opacity-60"
                      >
                        {i.busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                        {i.busy ? "Searching…" : "Search deeper"}
                      </button>
                      <button onClick={() => setOpenKey(i.key)} className="min-h-10 rounded-xl px-3 font-medium text-[#208850]">
                        Pick a food
                      </button>
                    </div>
                  </div>
                )}

                {i.food?.isNew && (
                  <p className="mt-1 text-[11px] leading-4 text-[#9b7526]">
                    {i.food.note} {i.food.sources?.length ? `Sources: ${i.food.sources.join(", ")}. ` : ""}
                    Saved to your foods when you log this meal.
                  </p>
                )}
                {i.err && <p className="mt-2 text-xs text-[#b42318]">{i.err}</p>}
                {openKey === i.key && <FoodPicker item={i} onPick={(c) => pick(i, c)} notify={notify} />}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl bg-[#eff8f0] p-4 dark:bg-[#1f2d26]">
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{total.kcal} kcal</span>
          </div>
          <div className="mt-2 text-xs text-[#607168]">
            P {fmt(total.protein)}g · C {fmt(total.carbs)}g · F {fmt(total.fat)}g
          </div>
        </div>

        {unresolved > 0 && (
          <p className="mt-3 text-xs text-[#9b7526]">
            {unresolved} item{unresolved > 1 ? "s" : ""} not found. Search deeper, pick a food, or remove {unresolved > 1 ? "them" : "it"} to save.
          </p>
        )}
        <button
          onClick={save} disabled={saving || unresolved > 0 || anyBusy}
          className="mt-4 min-h-12 w-full rounded-2xl bg-[#1e9b59] font-semibold text-white shadow-lg shadow-[#1e9b59]/20 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save meal"}
        </button>
        <button onClick={() => setDraft(null)} className="mt-2 min-h-11 w-full text-sm font-medium text-[#718078]">
          Discard
        </button>
      </div>
    </div>
  );
}
function WeightChart({
  points,
  start,
  end,
}: {
  points: { date: string; kg: number }[];
  start?: string;
  end?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(320);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) =>
      setW(Math.max(240, Math.round(e.contentRect.width))),
    );
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const H = 210,
    L = 44,
    R = 14,
    T = 14,
    B = 30;

  const day = (d: string) => Date.parse(d + "T00:00:00");
  const t0 = day(start ?? points[0].date);
  const t1 = Math.max(day(end ?? points[points.length - 1].date), t0 + 864e5);
  const x = (d: string) => L + ((day(d) - t0) / (t1 - t0)) * (W - L - R);

  // y scale with round tick values
  const vals = points.map((p) => p.kg);
  const mn = Math.min(...vals),
    mx = Math.max(...vals);
  const step = mx - mn <= 1.5 ? 0.5 : mx - mn <= 4 ? 1 : 2;
  const lo = Math.floor((mn - 0.1) / step) * step;
  const hi = Math.ceil((mx + 0.1) / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step)
    ticks.push(Math.round(v * 10) / 10);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo || 1)) * (H - T - B);

  // x labels at up to 4 evenly spaced whole days
  const D = Math.round((t1 - t0) / 864e5);
  const offs = [...new Set([0, Math.round(D / 3), Math.round((2 * D) / 3), D])];
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const activeIdx =
    sel !== null && sel < points.length ? sel : points.length - 1;
  const a = points[activeIdx];
  const first = points[0];
  const last = points[points.length - 1];
  const delta = Math.round((last.kg - first.kg) * 10) / 10;

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0,
      bd = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.date) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setSel(best);
  };

  return (
    <div className="mt-3" ref={box}>
      <div className="flex items-baseline justify-between text-xs text-[#718078]">
        <span>
          <strong className="text-sm text-[#17231e]">{a.kg} kg</strong>
          {" · "}
          {fmtDate(day(a.date))}
        </span>
        {points.length >= 2 && (
          <span className={delta <= 0 ? "text-[#208850]" : "text-[#b7791f]"}>
            {delta > 0 ? "+" : ""}
            {delta} kg overall
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="mt-2 touch-pan-y select-none"
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === "mouse" && setSel(null)}
        role="img"
        aria-label="Weight over time"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={L}
              x2={W - R}
              y1={y(t)}
              y2={y(t)}
              stroke="#dfe8e1"
              strokeWidth="1"
            />
            <text
              x={L - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="12"
              fill="#5f6f66"
            >
              {t}
            </text>
          </g>
        ))}

        {offs.map((o) => (
          <text
            key={o}
            x={L + (o / (D || 1)) * (W - L - R)}
            y={H - 9}
            textAnchor={o === 0 ? "start" : o === D ? "end" : "middle"}
            fontSize="12"
            fill="#5f6f66"
          >
            {fmtDate(t0 + o * 864e5)}
          </text>
        ))}

        {sel !== null && (
          <line
            x1={x(a.date)}
            x2={x(a.date)}
            y1={T}
            y2={H - B}
            stroke="#cfe3d6"
            strokeWidth="1"
          />
        )}

        {points.length >= 2 && (
          <polyline
            fill="none"
            stroke="#28a866"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map((p) => `${x(p.date)},${y(p.kg)}`).join(" ")}
          />
        )}

        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={x(p.date)}
            cy={y(p.kg)}
            r={i === activeIdx ? 6 : 4.5}
            fill={i === activeIdx ? "#28a866" : "#fff"}
            stroke="#28a866"
            strokeWidth="2"
          />
        ))}
      </svg>

      {points.length < 2 && (
        <p className="mt-2 text-xs text-[#89968e]">
          Log another weigh-in on a different day to see a line.
        </p>
      )}
    </div>
  );
}

function MacroCard({ data, label }: { data: any; label: string }) {
  const t = data.targets;
  const av = data.avg;
  const rows = [
    {
      label: "Protein",
      avg: av.protein,
      target: t.protein,
      color: "#65d99a",
      lowIsBad: true,
    },
    {
      label: "Carbs",
      avg: av.carbs,
      target: t.carbs,
      color: "#e8c86e",
      lowIsBad: false,
    },
    {
      label: "Fat",
      avg: av.fat,
      target: t.fat,
      color: "#df9a72",
      lowIsBad: false,
    },
  ].map((r) => {
    const pct = Math.round((r.avg / r.target) * 100);
    const state = pct < 90 ? "under" : pct > 110 ? "over" : "on";
    const warn =
      (state === "under" && r.lowIsBad) || (state === "over" && !r.lowIsBad);
    return { ...r, pct, state, warn };
  });
  const worst = [...rows].sort(
    (a, b) => Math.abs(b.pct - 100) - Math.abs(a.pct - 100),
  )[0];
  const takeaway =
    Math.abs(worst.pct - 100) <= 10
      ? "Your macros are right on target."
      : `${worst.label} is averaging ${Math.abs(worst.pct - 100)}% ${worst.pct < 100 ? "under" : "over"} target.`;

  return (
    <div className="mt-4 rounded-2xl bg-white p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Macros vs target</h2>
        <span className="text-xs text-[#89968e]">daily avg · {label}</span>
      </div>
      <p className="mt-2 text-sm text-[#4f5f56]">{takeaway}</p>
      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="tabular-nums text-[#718078]">
                <strong className="text-[#17231e]">{Math.round(r.avg)}g</strong>{" "}
                / {r.target}g
                <span
                  className={`ml-2 text-xs font-medium ${r.warn ? "text-[#b7791f]" : "text-[#208850]"}`}
                >
                  {r.state === "on"
                    ? "on target"
                    : r.state === "under"
                      ? `${100 - r.pct}% under`
                      : `${r.pct - 100}% over`}
                </span>
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#eef3ef]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, r.pct)}%`,
                  background: r.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type Preset = 7 | 30 | 90 | "custom";

function Insights({ refreshMe, notify }: any) {
  const today = new Date().toLocaleDateString("en-CA");
  const [preset, setPreset] = useState<Preset>(7);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [data, setData] = useState<any>(null);
  const [kg, setKg] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const fmt = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

  const daysAgo = (d: string) => (Date.parse(today) - Date.parse(d)) / 864e5;
  const customOk =
    from !== "" &&
    to !== "" &&
    from <= to &&
    to <= today &&
    daysAgo(from) <= 364;
  const key =
    preset === "custom" ? (customOk ? `${from}|${to}` : null) : String(preset);

  const load = async () => {
    try {
      setData(
        await getInsights(
          preset === "custom" ? { from, to } : { range: preset },
        ),
      );
    } catch (e: any) {
      notify(e.message ?? "Couldn't load insights");
    }
  };
  useEffect(() => {
    if (!key) return;
    setData(null);
    load();
  }, [key]);

  const addWeight = async () => {
    const v = Number(kg);
    if (!(v >= 30 && v <= 300) || busy) return;
    setBusy(true);
    try {
      await logWeight(v);
      setKg("");
      setEditing(false);
      notify("Weight logged");
      await Promise.all([load(), refreshMe()]);
    } catch (e: any) {
      notify(e.message ?? "Couldn't save weight");
    } finally {
      setBusy(false);
    }
  };

  const days: any[] = data?.days ?? [];
  const target = data?.targets?.kcal ?? 2000;
  const maxK = Math.max(target * 1.3, ...days.map((d) => d.kcal), 1);
  const label = data
    ? preset === "custom"
      ? `${fmt(data.from)} – ${fmt(data.to)}`
      : `last ${preset} days`
    : "";

  const allW: any[] = data?.weight?.points ?? [];
  const wp = data
    ? allW.filter((p) => p.date >= data.from && p.date <= data.to)
    : [];
  const latestW = allW[allW.length - 1];
  const prevW = allW[allW.length - 2];
  const sinceLast =
    latestW && prevW ? Math.round((latestW.kg - prevW.kg) * 10) / 10 : null;
  const todayEntry = allW.find((p) => p.date === today);
  const showForm = !todayEntry || editing;
  const latestLabel = latestW
    ? latestW.date === today
      ? "today"
      : fmt(latestW.date)
    : "";

  const gaps: any[] = data && data.loggedDays >= 3 ? data.microGaps : [];
  const hasFocus = data && (gaps.length > 0 || data.notes.length > 0);

  return (
    <>
      <div className="pt-8">
        <p className="text-sm text-[#7b887f]">Your patterns</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Insights</h1>
      </div>

      <div className="mt-6 flex rounded-xl bg-white p-1 text-sm shadow-sm">
        {([7, 30, 90, "custom"] as const).map((p) => (
          <button
            key={p}
            onClick={() => {
              if (p === "custom" && !from)
                setFrom(
                  new Date(Date.now() - 29 * 864e5).toLocaleDateString("en-CA"),
                );
              setPreset(p);
            }}
            className={`flex-1 rounded-lg py-2 font-medium ${preset === p ? "bg-[#e2f5e7] text-[#208850]" : "text-[#89968e]"}`}
          >
            {p === "custom" ? "Custom" : `${p}d`}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#dce7de] bg-white px-3 text-sm outline-none focus:border-[#28a866]"
          />
          <span className="text-xs text-[#89968e]">to</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-[#dce7de] bg-white px-3 text-sm outline-none focus:border-[#28a866]"
          />
        </div>
      )}
      {preset === "custom" && !customOk && (
        <p className="mt-2 text-xs text-[#89968e]">
          Pick a start and end date within the last year.
        </p>
      )}

      {!data ? (
        <p className="mt-10 text-center text-sm text-[#89968e]">
          {key ? "Loading…" : ""}
        </p>
      ) : (
        <>
          {data.loggedDays === 0 ? (
            <div className="mt-5 rounded-2xl bg-white p-6 text-sm text-[#718078]">
              No meals logged in this period. Log a few on Today and your
              insights will show up here.
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  [
                    "Protein",
                    `${Math.round(data.avg.protein)}g`,
                    `of ${data.targets.protein}g · avg/day`,
                  ],
                  ["Calories", data.avg.kcal.toLocaleString(), "avg/day"],
                  ["Streak", String(data.streak), "days"],
                ].map((x) => (
                  <div className="rounded-2xl bg-white p-3" key={x[0]}>
                    <div className="text-xs text-[#89968e]">{x[0]}</div>
                    <div className="mt-2 text-lg font-semibold tabular-nums">
                      {x[1]}
                    </div>
                    <div className="text-[10px] text-[#89968e]">{x[2]}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-semibold">Calories</h2>
                  <span className="text-xs text-[#89968e]">
                    goal {target} · {label}
                  </span>
                </div>
                <div className="relative mt-5 flex h-32 items-end">
                  <div
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#9bb3a3]"
                    style={{ bottom: `${(target / maxK) * 100}%` }}
                  />
                  {days.map((d) => (
                    <div
                      key={d.date}
                      className="flex h-full flex-1 items-end"
                      style={{
                        padding: days.length > 60 ? "0 0.5px" : "0 1.5px",
                      }}
                      title={`${fmt(d.date)}: ${d.kcal} kcal`}
                    >
                      <div
                        className={`w-full rounded-t-sm ${!d.logged ? "bg-[#e6ece8]" : d.kcal > target * 1.05 ? "bg-[#e8b86e]" : "bg-[#72d69b]"}`}
                        style={{
                          height: d.logged
                            ? `${Math.max(4, (d.kcal / maxK) * 100)}%`
                            : "4%",
                        }}
                      />
                    </div>
                  ))}
                </div>
                {days.length <= 7 ? (
                  <div className="mt-2 flex">
                    {days.map((d) => (
                      <span
                        key={d.date}
                        className="flex-1 text-center text-[11px] text-[#718078]"
                      >
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          undefined,
                          { weekday: "narrow" },
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 flex justify-between text-[11px] text-[#718078]">
                    <span>{fmt(days[0].date)}</span>
                    <span>{fmt(days[days.length - 1].date)}</span>
                  </div>
                )}
              </div>

              <MacroCard data={data} label={label} />
            </>
          )}

          <div className="mt-4 rounded-2xl bg-white p-5">
            <h2 className="text-sm font-medium text-[#718078]">
              Current weight
            </h2>
            {latestW ? (
              <>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tabular-nums tracking-tight">
                    {latestW.kg}
                  </span>
                  <span className="text-base text-[#718078]">kg</span>
                </div>
                <div className="mt-1 text-xs text-[#89968e]">
                  {latestLabel}
                  {sinceLast !== null && (
                    <span
                      className={
                        sinceLast <= 0 ? "text-[#208850]" : "text-[#b7791f]"
                      }
                    >
                      {" · "}
                      {sinceLast > 0 ? "+" : ""}
                      {sinceLast} kg since last weigh-in
                    </span>
                  )}
                </div>
                {data.targetCheck && (
                  <p className="mt-3 rounded-lg bg-[#eff8f0] px-3 py-2 text-xs text-[#3f5a49]">
                    {data.targetCheck}{" "}
                    <span className="text-[#89968e]">
                      (based on the last 3 weeks)
                    </span>
                  </p>
                )}
              </>
            ) : (
              <div className="mt-1 text-sm text-[#89968e]">
                No weigh-ins yet
              </div>
            )}

            {wp.length >= 1 ? (
              <WeightChart points={wp} start={data.from} end={data.to} />
            ) : latestW ? (
              <p className="mt-4 text-sm text-[#89968e]">
                No weigh-ins in this period.
              </p>
            ) : null}

            {showForm ? (
              <div className="mt-4 flex gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={kg}
                  onChange={(e) => setKg(e.target.value)}
                  placeholder={
                    editing
                      ? "Update today's weight (kg)"
                      : "Today's weight (kg)"
                  }
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#dce7de] px-3 text-sm outline-none focus:border-[#28a866]"
                />
                <button
                  onClick={addWeight}
                  disabled={busy}
                  className="min-h-11 rounded-xl bg-[#1e9b59] px-4 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Saving…" : editing ? "Update" : "Log"}
                </button>
                {editing && (
                  <button
                    onClick={() => {
                      setEditing(false);
                      setKg("");
                    }}
                    className="min-h-11 rounded-xl px-3 text-sm font-medium text-[#718078]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-[#eff8f0] px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-[#208850]">
                    ✓ Today&apos;s weigh-in logged
                  </div>
                  <div className="text-xs text-[#718078]">
                    {todayEntry.kg} kg · come back tomorrow
                  </div>
                </div>
                <button
                  onClick={() => {
                    setKg(String(todayEntry.kg));
                    setEditing(true);
                  }}
                  className="min-h-11 px-2 text-sm font-medium text-[#208850]"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {hasFocus && (
            <div className="mt-4 rounded-2xl bg-[#fff8e8] p-5">
              <h2 className="font-semibold text-[#6e603e]">Worth a look</h2>
              {data.notes.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6e603e]">
                  {data.notes.map((n: string) => (
                    <li key={n}>• {n}</li>
                  ))}
                </ul>
              )}
              {gaps.length > 0 && (
                <div className="mt-4 border-t border-[#efe3c4] pt-3">
                  <div className="text-xs font-medium text-[#98762b]">
                    Low nutrients (estimated)
                  </div>
                  <div className="mt-2 space-y-2">
                    {gaps.map((m: any) => (
                      <div key={m.key} className="text-sm text-[#6e603e]">
                        <strong>{m.label}</strong>
                        <span className="text-[#98762b]">
                          {" "}
                          · {m.pct}% of daily need
                        </span>
                        <div className="text-xs text-[#98762b]">{m.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
const DIET_LABEL: Record<string, string> = {
  veg: "Vegetarian",
  eggetarian: "Eggetarian",
  non_veg: "Non-vegetarian",
};
const GOAL_LABEL: Record<string, string> = {
  lose: "Losing weight",
  maintain: "Maintaining",
  gain: "Gaining weight",
};

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

function StreakCard({
  count,
  loggedToday,
}: {
  count: number;
  loggedToday: boolean;
}) {
  const next =
    MILESTONES.find((m) => m > count) ?? Math.ceil((count + 1) / 100) * 100;
  const prev = [...MILESTONES].reverse().find((m) => m <= count) ?? 0;
  const pct = Math.max(4, Math.round(((count - prev) / (next - prev)) * 100));

  const title =
    count === 0
      ? "Ready when you are."
      : !loggedToday
        ? "Log today to keep it going."
        : count < 3
          ? "Good start."
          : count < 7
            ? "You're building a rhythm."
            : "Steady progress.";
  const sub =
    count === 0
      ? "Log a meal to start your streak."
      : loggedToday
        ? "Today's logged. See you tomorrow."
        : "One meal today extends your streak.";

  return (
    <div className="sticky top-6 rounded-3xl bg-[#e7f4e9] p-6">
      <Sparkles className="text-[#28a866]" size={20} />
      <h3 className="mt-6 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#607168]">{sub}</p>
      <div className="mt-7 h-2 rounded-full bg-white">
        <div
          className="h-full rounded-full bg-[#35b56d] transition-all"
          style={{ width: `${count === 0 ? 0 : pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[#607168]">
        {count === 0
          ? "No streak yet"
          : `${count} day logging streak · ${next - count} to go until ${next}`}
      </p>
    </div>
  );
}

function Profile({ dark, setDark, setOnboard, me }: any) {
  const p = me?.profile;
  const g = me?.goal;
  const name: string = p?.name ?? "";
  const email: string = me?.email ?? "";
  return (
    <>
      <div className="pt-8">
        <p className="text-sm text-[#7b887f]">Your space</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Profile</h1>
      </div>
      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-4">
        <div className="grid size-14 place-items-center rounded-full bg-[#dff5e5] text-xl font-semibold uppercase text-[#208850]">
          {(name || email).charAt(0) || "?"}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{name || email}</div>
          <div className="truncate text-sm text-[#89968e]">
            {name
              ? email
              : `${DIET_LABEL[p?.dietType] ?? "—"} · ${GOAL_LABEL[g?.type] ?? "—"}`}
          </div>
          {name && (
            <div className="text-xs text-[#89968e]">
              {DIET_LABEL[p?.dietType] ?? "—"} · {GOAL_LABEL[g?.type] ?? "—"}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Height", p?.heightCm ? `${p.heightCm} cm` : "—"],
          ["Weight", p?.weightKg ? `${p.weightKg} kg` : "—"],
          ["Age", p?.age ? `${p.age} yrs` : "—"],
        ].map((x) => (
          <div className="rounded-2xl bg-white p-4" key={x[0]}>
            <div className="text-xs text-[#89968e]">{x[0]}</div>
            <div className="mt-2 font-semibold tabular-nums">{x[1]}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Daily targets</h2>
          <Settings2 size={17} className="text-[#89968e]" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Calories", g ? `${g.kcal} kcal` : "—"],
            ["Protein", g ? `${g.proteinG}g` : "—"],
            ["Carbs", g ? `${g.carbsG}g` : "—"],
            ["Fat", g ? `${g.fatG}g` : "—"],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-[#f4f8f4] p-3">
              <span className="text-[#89968e]">{l}</span>
              <strong className="ml-2">{v}</strong>
            </div>
          ))}
        </div>
      </div>
      {/* <div className="mt-4 rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="font-medium">Dark mode</span>
          <button
            onClick={() => setDark(!dark)}
            className={`h-7 w-12 rounded-full p-1 ${dark ? "bg-[#1e9b59]" : "bg-[#dfe8e0]"}`}
            aria-label="Toggle dark mode"
          >
            <span
              className={`block size-5 rounded-full bg-white transition ${dark ? "translate-x-5" : ""}`}
            />
          </button>
        </div>
      </div> */}
      <button
        onClick={() => setOnboard(true)}
        className="mt-4 min-h-12 w-full rounded-2xl border border-[#dce7de] bg-white font-medium text-[#218950]"
      >
        Edit profile & goals
      </button>
      <button
        onClick={async () => {
          await fetch("/auth/signout", { method: "POST" });
          window.location.href = "/";
        }}
        className="mt-3 min-h-12 w-full rounded-2xl text-sm font-medium text-[#718078]"
      >
        Sign out
      </button>
    </>
  );
}
type Form = {
  heightCm: string;
  weightKg: string;
  age: string;
  name: string;
  sex: Sex;
  activity: Activity;
  dietType: "veg" | "eggetarian" | "non_veg";
  goal: GoalType;
  rate: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const ACTIVITY: { key: Activity; title: string; desc: string }[] = [
  { key: "sedentary", title: "Sedentary", desc: "Mostly sitting" },
  { key: "light", title: "Lightly active", desc: "Walks and light exercise" },
  {
    key: "moderate",
    title: "Moderately active",
    desc: "Exercise 3–4 days/week",
  },
  { key: "active", title: "Very active", desc: "Hard training most days" },
];
const DIETS = [
  { key: "veg", title: "Vegetarian" },
  { key: "eggetarian", title: "Eggetarian" },
  { key: "non_veg", title: "Non-vegetarian" },
] as const;
const SEXES: { key: Sex; title: string }[] = [
  { key: "male", title: "Male" },
  { key: "female", title: "Female" },
  { key: "other", title: "Other" },
];

function Onboarding({ step, setStep, initial, onDone, onCancel }: any) {
  const labels = [
    "Your basics",
    "Movement",
    "Your goal",
    "Your diet",
    "Your targets",
  ];
  const p = initial?.profile;
  const g = initial?.goal;
  const [form, setForm] = useState<Form>({
    heightCm: p?.heightCm?.toString() ?? "",
    name: p?.name ?? "",
    weightKg: p?.weightKg?.toString() ?? "",
    age: p?.age?.toString() ?? "",
    sex: p?.sex ?? "male",
    activity: p?.activityLevel ?? "moderate",
    dietType: p?.dietType ?? "non_veg",
    goal: g?.type ?? "lose",
    rate: g?.rateKgPerWeek || 0.5,
    kcal: g?.kcal ?? 2000,
    proteinG: g?.proteinG ?? 120,
    carbsG: g?.carbsG ?? 220,
    fatG: g?.fatG ?? 60,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const h = +form.heightCm,
    w = +form.weightKg,
    a = +form.age;
  const step1Ok =
    form.name.trim().length > 0 &&
    h >= 100 &&
    h <= 250 &&
    w >= 30 &&
    w <= 300 &&
    a >= 18 &&
    a <= 100;
  // compute starting targets when we reach the last screen
  useEffect(() => {
    if (step !== 5) return;
    const t = computeTargets({
      heightCm: h,
      weightKg: w,
      age: a,
      sex: form.sex,
      activity: form.activity,
      goal: form.goal,
      rateKgPerWeek: form.goal === "maintain" ? 0 : form.rate,
    });
    set({ kcal: t.kcal, proteinG: t.proteinG, carbsG: t.carbsG, fatG: t.fatG });
  }, [step]);

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      await submitOnboarding({
        heightCm: h,
        weightKg: w,
        name: form.name.trim(),
        age: a,
        sex: form.sex,
        activityLevel: form.activity,
        dietType: form.dietType,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        goalType: form.goal,
        rateKgPerWeek: form.goal === "maintain" ? 0 : form.rate,
        kcal: form.kcal,
        proteinG: form.proteinG,
        carbsG: form.carbsG,
        fatG: form.fatG,
      });
      await onDone();
    } catch (e: any) {
      setErr(e.message ?? "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  const pick = (on: boolean) =>
    on
      ? "border-[#28a866] bg-[#e7f7ea] text-[#208850]"
      : "border-[#e1eae2] bg-white";

  return (
    <main className="min-h-screen bg-[#f6f8f6] px-5 py-8 text-[#17231e]">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <span className="text-xl font-semibold">
            fork<span className="text-[#28a866]">8</span>
          </span>
          <span className="text-sm text-[#89968e]">{step} of 5</span>
        </div>
        <div className="mt-5 h-1.5 rounded-full bg-[#dce9de]">
          <div
            className="h-full rounded-full bg-[#28a866] transition-all"
            style={{ width: `${step * 20}%` }}
          />
        </div>

        <div className="pt-16">
          <p className="text-sm font-medium text-[#28a866]">
            {labels[step - 1]}
          </p>

          {step === 1 && (
            <>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Let&apos;s get to know you.
              </h1>
              <p className="mt-3 text-[#718078]">
                We&apos;ll use this to set a starting point for your targets.
              </p>

              <label className="mt-9 block text-sm text-[#718078]">
                What should we call you?
                <input
                  type="text"
                  autoComplete="given-name"
                  maxLength={40}
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Your first name"
                  className="mt-2 h-12 w-full rounded-xl border border-[#dce7de] bg-white px-3 outline-none focus:border-[#28a866]"
                />
              </label>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {(
                  [
                    ["Height (cm)", "heightCm"],
                    ["Weight (kg)", "weightKg"],
                    ["Age", "age"],
                  ] as const
                ).map(([label, key]) => (
                  <label key={key} className="text-sm text-[#718078]">
                    {label}
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form[key]}
                      onChange={(e) =>
                        set({ [key]: e.target.value } as Partial<Form>)
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-[#dce7de] bg-white px-3 outline-none focus:border-[#28a866]"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {SEXES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => set({ sex: s.key })}
                    className={`rounded-2xl border p-3 text-sm font-medium ${pick(form.sex === s.key)}`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
              {!step1Ok && (form.heightCm || form.weightKg || form.age) && (
                <p className="mt-3 text-xs text-[#89968e]">
                  Add your name, height 100–250 cm, weight 30–300 kg, and age
                  18+.
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="mt-3 text-4xl font-semibold">
                How active are you?
              </h1>
              <div className="mt-8 space-y-3">
                {ACTIVITY.map((x) => (
                  <button
                    key={x.key}
                    onClick={() => set({ activity: x.key })}
                    className={`w-full rounded-2xl border bg-white p-4 text-left ${form.activity === x.key ? "border-[#28a866] ring-2 ring-[#d8f3df]" : "border-[#e1eae2]"}`}
                  >
                    <div className="font-medium">{x.title}</div>
                    <div className="mt-1 text-sm text-[#89968e]">{x.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="mt-3 text-4xl font-semibold">
                What&apos;s your goal?
              </h1>
              <div className="mt-8 grid grid-cols-3 gap-2">
                {(["lose", "maintain", "gain"] as GoalType[]).map((x) => (
                  <button
                    key={x}
                    onClick={() => set({ goal: x })}
                    className={`rounded-2xl border p-4 font-medium capitalize ${pick(form.goal === x)}`}
                  >
                    {x}
                  </button>
                ))}
              </div>
              {form.goal !== "maintain" && (
                <label className="mt-10 block text-sm text-[#718078]">
                  Weekly pace: <strong>{form.rate.toFixed(2)} kg/week</strong>
                  <input
                    type="range"
                    min={0.25}
                    max={1}
                    step={0.05}
                    value={form.rate}
                    onChange={(e) => set({ rate: Number(e.target.value) })}
                    className="mt-5 w-full accent-[#28a866]"
                  />
                  <div className="mt-2 flex justify-between text-xs">
                    <span>0.25 kg/week</span>
                    <span>1 kg/week</span>
                  </div>
                </label>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="mt-3 text-4xl font-semibold">How do you eat?</h1>
              <div className="mt-8 space-y-3">
                {DIETS.map((x) => (
                  <button
                    key={x.key}
                    onClick={() => set({ dietType: x.key })}
                    className={`w-full rounded-2xl border p-5 text-left font-medium ${pick(form.dietType === x.key)}`}
                  >
                    {x.title}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="mt-3 text-4xl font-semibold">
                Your starting point.
              </h1>
              <p className="mt-3 text-[#718078]">
                Tap any number to adjust. You can change these later in your
                profile.
              </p>
              <div className="mt-8 space-y-3">
                {(
                  [
                    ["Calories", "kcal", "kcal"],
                    ["Protein", "proteinG", "g"],
                    ["Carbs", "carbsG", "g"],
                    ["Fat", "fatG", "g"],
                  ] as const
                ).map(([label, key, unit]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-2xl bg-white p-4"
                  >
                    <span className="text-[#718078]">{label}</span>
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={form[key]}
                        onChange={(e) =>
                          set({
                            [key]: Number(e.target.value),
                          } as Partial<Form>)
                        }
                        className="w-24 rounded-lg border border-[#dce7de] px-2 py-1 text-right font-semibold tabular-nums outline-none focus:border-[#28a866]"
                      />
                      <span className="text-sm text-[#89968e]">{unit}</span>
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {err && <p className="mt-6 text-sm text-red-600">{err}</p>}

        <button
          onClick={() => (step === 5 ? submit() : setStep(step + 1))}
          disabled={busy || (step === 1 && !step1Ok)}
          className="mt-12 min-h-14 w-full rounded-2xl bg-[#1e9b59] font-semibold text-white disabled:opacity-50"
        >
          {step === 5 ? (busy ? "Saving…" : "Start tracking") : "Continue"}
        </button>
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mt-3 w-full py-3 text-sm text-[#718078]"
          >
            Back
          </button>
        )}
        {step === 1 && onCancel && (
          <button
            onClick={onCancel}
            className="mt-3 w-full py-3 text-sm text-[#718078]"
          >
            Cancel
          </button>
        )}
      </div>
    </main>
  );
}
