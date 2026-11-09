"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Menu,
  Mic,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  ["How it works", "#how-it-works"],
  ["Intelligence", "#intelligence"],
  ["Discover", "#discover"],
  ["Together", "#together"],
];

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 text-lg font-semibold tracking-tight text-[#183b2b]"
    >
      <span className="grid size-8 place-items-center text-sm text-[#f6f2e9]">
        <img src="/android-chrome-512x512.png"/>
      </span>
      Fork8
    </Link>
  );
}
function FoodLogCard() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-[#d7ded2] bg-[#fdfcf8] p-4 shadow-[0_30px_80px_rgba(24,59,43,0.14)] sm:p-6">
      <div className="flex items-center justify-between border-b border-[#e5e9e1] pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#809084]">
            Breakfast · 8:42 am
          </p>
          <p className="mt-1 text-sm font-semibold text-[#183b2b]">
            Natural language log
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-full bg-[#e7efe5] text-[#2a6548]">
          <Mic size={18} />
        </span>
      </div>
      <div className="mt-5 rounded-2xl bg-[#f2f5ef] p-4">
        <p className="text-[15px] leading-6 text-[#304437]">
          “Had 4 eggs and 2 slices of toast with a glass of milk for breakfast.”
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#63806c]">
          <Sparkles size={14} /> Matched to Fork8 nutrition database
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Calories", "548", "kcal"],
          ["Protein", "34", "g"],
          ["Carbs", "39", "g"],
          ["Fat", "25", "g"],
          ["Fiber", "6", "g"],
          ["Match", "98", "%"],
        ].map(([label, value, unit]) => (
          <div
            key={label}
            className="rounded-2xl border border-[#e5e9e1] bg-white p-3"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#8a988d]">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-[#183b2b]">
              {value}
              <span className="ml-1 text-[10px] font-normal text-[#839186]">
                {unit}
              </span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#183b2b] px-4 py-3 text-[#f6f2e9]">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#c7ec80]" />
          <span className="text-xs">3 foods understood</span>
        </div>
        <span className="text-xs text-[#b8cdbd]">4 eggs · toast · milk</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#6f876f]">
      {children}
    </p>
  );
}

export default function Fork8Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePlan, setActivePlan] = useState("This week");
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f2e9] text-[#1d2f25]">
      <header className="sticky top-0 z-50 border-b border-[#dfe5da]/80 bg-[#f6f2e9]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm text-[#57705e] lg:flex">
            {navItems.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="transition-colors hover:text-[#183b2b]"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop actions */}
            <div className="hidden items-center gap-4 lg:flex">
              <Link
                href="/app"
                className="text-sm font-medium text-[#57705e] hover:text-[#183b2b]"
              >
                Log in
              </Link>
              <Link
                href="/login?mode=signup"
                className="rounded-full bg-[#183b2b] px-5 py-2.5 text-sm font-medium text-[#f6f2e9] transition-transform hover:-translate-y-0.5"
              >
                Get started <ArrowUpRight className="ml-1 inline size-4" />
              </Link>
            </div>

            {/* Always-visible app link on mobile */}
            <Link
              href="/app"
              className="rounded-full bg-[#183b2b] px-4 py-2.5 text-xs font-semibold text-[#f6f2e9] transition-transform hover:-translate-y-0.5 sm:text-sm lg:hidden"
            >
              Log in <ArrowUpRight className="ml-1 inline size-3.5" />
            </Link>

            <button
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-full p-2 text-[#183b2b] lg:hidden"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-[#dfe5da] px-5 py-5 lg:hidden">
            <div className="grid gap-4 text-sm">
              {navItems.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>
                  {label}
                </a>
              ))}
              <Link
                href="/app"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-[#cfdcc9] px-4 py-3 text-center font-medium text-[#183b2b]"
              >
                Log in <ArrowUpRight className="ml-1 inline size-4" />
              </Link>
              <Link
                href="/login?mode=signup"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-[#183b2b] px-4 py-3 text-center font-medium text-[#f6f2e9]"
              >
                Get started <ArrowUpRight className="ml-1 inline size-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#cfdcc9] bg-[#edf3e9] px-3 py-1.5 text-xs font-medium text-[#477052]">
            <span className="size-1.5 rounded-full bg-[#6f9f57]" /> Nutrition,
            in your own words
          </div>
          <h1 className="max-w-2xl text-[clamp(3.4rem,7vw,6.8rem)] font-medium leading-[0.92] tracking-[-0.07em] text-[#183b2b]">
            Eat naturally.
            <br />
            <em className="font-serif font-normal text-[#6d896d]">
              Track intelligently.
            </em>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-8 text-[#627469]">
            Your nutrition journey shouldn&apos;t begin with endless food
            databases. Just tell Fork8 what you ate. We&apos;ll take care of the
            rest.
          </p>
          <div className="mt-9 flex flex-col items-start gap-4">
            <Link
              href="/login?mode=signup"
              className="inline-flex items-center rounded-full bg-[#183b2b] px-7 py-4 text-sm font-semibold text-[#f6f2e9] transition-all hover:-translate-y-0.5 hover:bg-[#28543d]"
            >
              Start tracking free
              <ArrowUpRight className="ml-2 size-4" />
            </Link>

            <Link
              href="/app"
              className="group text-sm text-[#718276] transition-colors hover:text-[#183b2b]"
            >
              Already using Fork8?
              <span className="ml-1 font-semibold text-[#355e46] group-hover:underline">
                Log in
              </span>
              <ArrowUpRight className="ml-1 inline size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-4 text-xs text-[#839286]">
            <div className="flex -space-x-2">
              <span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f2e9] bg-[#d6ac8d] text-[10px]">
                AM
              </span>
              <span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f2e9] bg-[#b3c7a9] text-[10px]">
                JL
              </span>
              <span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f2e9] bg-[#d7c5a8] text-[10px]">
                RK
              </span>
            </div>
            <span>Join 2,000+ people eating with more clarity</span>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -right-12 -top-12 size-44 rounded-full bg-[#dbe8cb] blur-3xl" />
          <FoodLogCard />
      
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-[#dfe5da] bg-[#eef2e8]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <SectionLabel>The core difference</SectionLabel>
            <h2 className="text-4xl font-medium leading-tight tracking-[-0.045em] text-[#183b2b] sm:text-6xl">
              Food logging, finally made{" "}
              <em className="font-serif font-normal text-[#759174]">
                effortless.
              </em>
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#65766a]">
              Describe meals the way you already think about them. Fork8 turns
              everyday language into structured nutrition you can trust.
            </p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {[
              [
                "01",
                "Describe",
                "Type or speak naturally. No searching, scanning, or measuring every ingredient.",
              ],
              [
                "02",
                "Understand",
                "Fork8 identifies foods, quantities, and portions from your words.",
              ],
              [
                "03",
                "Track",
                "Database matching gives you structured, deterministic nutrition information.",
              ],
            ].map(([n, title, body]) => (
              <div key={n} className="border-t border-[#cdd8cb] pt-5">
                <span className="text-xs text-[#7d927e]">{n}</span>
                <h3 className="mt-10 text-2xl font-medium tracking-tight text-[#183b2b]">
                  {title}
                </h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-[#6f7e72]">
                  {body}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-16 grid gap-4 rounded-[2rem] bg-[#183b2b] p-5 text-[#f6f2e9] sm:p-8 lg:grid-cols-2 lg:items-center">
            <div className="rounded-2xl bg-[#294f3d] p-5">
              <p className="text-xs uppercase tracking-widest text-[#a8c5a6]">
                Traditional logging
              </p>
              <div className="mt-5 space-y-2 opacity-70">
                <div className="h-3 w-4/5 rounded bg-[#6e8b75]" />
                <div className="h-3 w-3/5 rounded bg-[#6e8b75]" />
                <div className="h-3 w-2/3 rounded bg-[#6e8b75]" />
              </div>
              <p className="mt-6 text-sm text-[#b0c3b4]">
                Search. Measure. Repeat.
              </p>
            </div>
            <div className="relative rounded-2xl bg-[#f6f2e9] p-5 text-[#183b2b]">
              <div className="absolute -top-3 right-5 rounded-full bg-[#c7ec80] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
                Fork8 way
              </div>
              <p className="text-xs uppercase tracking-widest text-[#719078]">
                Natural log
              </p>
              <p className="mt-4 text-lg leading-7">
                “Chicken bowl with avocado and a little rice.”
              </p>
              <div className="mt-5 flex items-center gap-2 text-xs text-[#5f7b66]">
                <Check size={14} /> Understood in seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="intelligence"
        className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <SectionLabel>Intelligent tracking</SectionLabel>
            <h2 className="max-w-xl text-4xl font-medium leading-tight tracking-[-0.045em] text-[#183b2b] sm:text-6xl">
              Know what&apos;s actually on your{" "}
              <em className="font-serif font-normal text-[#759174]">plate.</em>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#6b7b70]">
            Every log becomes a clearer picture of your day, your week, and the
            habits underneath. Calories are just the beginning.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] bg-[#e4ecdc] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#779078]">
                  Today&apos;s balance
                </p>
                <p className="mt-2 text-3xl font-medium tracking-tight text-[#183b2b]">
                  1,284{" "}
                  <span className="text-sm font-normal text-[#7c8d80]">
                    / 2,100 kcal
                  </span>
                </p>
              </div>
              <div className="grid size-16 place-items-center rounded-full border-8 border-[#c7ec80] border-r-[#86a677] text-xs font-semibold text-[#183b2b]">
                61%
              </div>
            </div>
            <div className="mt-9 space-y-5">
              {[
                ["Protein", "86g", "112g", "77%", "#709b72"],
                ["Carbohydrates", "134g", "218g", "61%", "#c98b61"],
                ["Fat", "42g", "70g", "60%", "#9b8ac4"],
              ].map(([name, value, total, pct, color]) => (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-medium text-[#355540]">{name}</span>
                    <span className="text-[#829283]">
                      {value} / {total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/70">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: pct, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-9 flex items-center justify-between border-t border-[#cedbc9] pt-5">
              <span className="text-xs text-[#718374]">
                Your day is shaping up well.
              </span>
              <span className="text-xs font-semibold text-[#3d694c]">
                View details →
              </span>
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#dfe5da] bg-white p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.18em] text-[#779078]">
              Meal-wise clarity
            </p>
            <div className="mt-7 space-y-4">
              {[
                ["Breakfast", "548 kcal", "34g protein"],
                ["Lunch", "412 kcal", "28g protein"],
                ["Snack", "126 kcal", "7g protein"],
                ["Dinner", "—", "Ready when you are"],
              ].map(([meal, kcal, detail]) => (
                <div
                  key={meal}
                  className="flex items-center justify-between border-b border-[#edf0eb] pb-4 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#304d39]">{meal}</p>
                    <p className="mt-1 text-xs text-[#91a093]">{detail}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#183b2b]">
                    {kcal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#183b2b] text-[#f6f2e9]">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:py-28">
          <div>
            <SectionLabel>
              <span className="text-[#afc9a9]">Adaptive nutrition</span>
            </SectionLabel>
            <h2 className="text-4xl font-medium leading-tight tracking-[-0.045em] sm:text-6xl">
              Your plan should adapt to{" "}
              <em className="font-serif font-normal text-[#c7ec80]">
                real life.
              </em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[#b4c8b8]">
              A dinner with friends isn&apos;t a failure. Fork8 helps you see
              the whole week, so one day never has to derail your goals.
            </p>
            <button className="mt-8 flex items-center gap-2 rounded-full border border-[#587661] px-5 py-3 text-sm text-[#d6e1d4] hover:bg-[#294f3d]">
              See a flexible plan <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="rounded-[2rem] bg-[#f6f2e9] p-6 text-[#183b2b] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#779078]">
                  Weekly budget
                </p>
                <p className="mt-1 text-2xl font-medium">
                  12,840{" "}
                  <span className="text-sm font-normal text-[#91a093]">
                    kcal remaining
                  </span>
                </p>
              </div>
              <div className="flex rounded-full bg-[#e7efe5] p-1 text-xs">
                {["This week", "Last week"].map((x) => (
                  <button
                    key={x}
                    onClick={() => setActivePlan(x)}
                    className={`rounded-full px-3 py-1.5 ${activePlan === x ? "bg-white shadow-sm" : ""}`}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
         <div className="mt-8">
  <div className="flex h-28 items-end gap-2">
    {[62, 76, 51, 86, 68, 92, 44].map((h, i) => (
      <div
        key={i}
        className="flex h-full flex-1 items-end"
      >
        <div
          className={`w-full rounded-t-lg ${
            i === 5 ? "bg-[#c98b61]" : "bg-[#a9c69d]"
          }`}
          style={{ height: `${h}%` }}
        />
      </div>
    ))}
  </div>

  <div className="mt-2 flex gap-2">
    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
      <span key={i} className="flex-1 text-center text-[10px] text-[#91a093]">
        {day}
      </span>
    ))}
  </div>
</div>
            <div className="mt-6 rounded-2xl bg-[#e7efe5] p-4 text-sm leading-6 text-[#45634d]">
              <span className="font-semibold">Saturday was social.</span> Your
              weekly protein target is still on track. No need to compensate —
              just keep going.
            </div>
          </div>
        </div>
      </section>

      <section
        id="discover"
        className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"
      >
        <div className="max-w-2xl">
          <SectionLabel>Personal food discovery</SectionLabel>
          <h2 className="text-4xl font-medium leading-tight tracking-[-0.045em] text-[#183b2b] sm:text-6xl">
            Discover better meals without changing{" "}
            <em className="font-serif font-normal text-[#759174]">
              everything.
            </em>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            [
              "Improve your usual meals",
              "Small, satisfying shifts to the meals you already love.",
            ],
            [
              "Discover new foods",
              "Familiar ingredients, new combinations, right for your goals.",
            ],
            [
              "AI recipe suggestions",
              "Use what you have, fit what you need, make it delicious.",
            ],
          ].map(([title, body], i) => (
            <div
              key={title}
              className="group overflow-hidden rounded-[1.75rem] bg-white"
            >
              <div
                className={`h-52 ${i === 0 ? "bg-[linear-gradient(135deg,#d8e8ca,#789a78)]" : i === 1 ? "bg-[linear-gradient(135deg,#e8d4b4,#bb8057)]" : "bg-[linear-gradient(135deg,#d6d0e4,#796f9b)]"} p-6`}
              >
                <div className="flex h-full items-end">
                  <span className="rounded-full bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#355540]">
                    0{i + 1} / 03
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium tracking-tight text-[#183b2b]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[#748176]">{body}</p>
                <a
                  href="#discover"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#477052]"
                >
                  Explore ideas <ArrowUpRight size={15} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="together" className="border-t border-[#dfe5da] bg-[#eef2e8]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <SectionLabel>Private accountability</SectionLabel>
            <h2 className="text-4xl font-medium leading-tight tracking-[-0.045em] text-[#183b2b] sm:text-6xl">
              Good habits are easier to maintain{" "}
              <em className="font-serif font-normal text-[#759174]">
                together.
              </em>
            </h2>
            <p className="mt-6 max-w-md text-base leading-7 text-[#6b7b70]">
              Share only what you choose with the people who matter. Encourage
              each other, join private challenges, and celebrate consistency.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-[#4e6955]">
              {[
                "Selected food logs, never your whole life",
                "Shared progress and private challenges",
                "Achievements for showing up consistently",
              ].map((x) => (
                <li key={x} className="flex items-center gap-3">
                  <span className="grid size-5 place-items-center rounded-full bg-[#d3e3ca] text-[#477052]">
                    <Check size={12} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-[#183b2b] p-6 text-[#f6f2e9] sm:p-8">
            <div className="flex items-center justify-between border-b border-[#466950] pb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#a8c5a6]">
                  Sunday reset
                </p>
                <p className="mt-1 text-lg font-medium">The Green Room</p>
              </div>
              <span className="rounded-full bg-[#c7ec80] px-3 py-1 text-xs font-semibold text-[#183b2b]">
                Private
              </span>
            </div>
            <div className="mt-6 space-y-4">
              {[
                ["Maya", "Protein goal", "92%", "bg-[#c7ec80]"],
                ["Jon", "7 day streak", "100%", "bg-[#d5b789]"],
                ["You", "Weekly balance", "84%", "bg-[#a9c69d]"],
              ].map(([name, label, pct, color]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-[#42654d] text-xs">
                    {name[0]}
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-xs">
                      <span>
                        {name} · {label}
                      </span>
                      <span className="text-[#b4c8b8]">{pct}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#42654d]">
                      <div
                        className={`h-1.5 rounded-full ${color}`}
                        style={{ width: pct }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-[#b4c8b8]">
              Small wins, shared quietly.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 text-center lg:px-8 lg:py-36">
        <Sparkles className="mx-auto size-6 text-[#779078]" />
        <h2 className="mx-auto mt-6 max-w-3xl text-5xl font-medium leading-[0.98] tracking-[-0.06em] text-[#183b2b] sm:text-7xl">
          Start understanding what you{" "}
          <em className="font-serif font-normal text-[#759174]">eat.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-md text-base text-[#6b7b70]">
          Less time tracking. More time making progress.
        </p>
        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login?mode=signup"
            className="rounded-full bg-[#183b2b] px-6 py-3.5 text-sm font-medium text-[#f6f2e9]"
          >
            Start tracking free{" "}
            <ArrowUpRight className="ml-1 inline size-4" />
          </Link>
          <Link
            href="/app"
            className="text-sm font-semibold text-[#355e46] hover:underline"
          >
            Already using Fork8? Log in
            <ArrowUpRight className="ml-1 inline size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#dfe5da]">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-10 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-6 text-[#849187]">
              Eat naturally. Understand your nutrition. Get better every day.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-14 gap-y-3 text-sm text-[#66766b] sm:grid-cols-4">
            <a href="#how-it-works">How it works</a>
            <a href="#intelligence">Intelligence</a>
            <a href="#discover">Discover</a>
            <a href="#together">Together</a>
            <a href="#">About</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="mailto:hello@fork8.app">Contact</a>
          </div>
        </div>
        <div className="mx-auto max-w-7xl border-t border-[#dfe5da] px-5 py-5 text-xs text-[#98a399] lg:px-8">
          © 2026 Fork8. Built for better everyday choices.
        </div>
      </footer>
    </main>
  );
}
