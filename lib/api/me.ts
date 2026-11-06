import type { OnboardingBody } from "@/lib/types";

export async function getMe() {
  const res = await fetch("/api/me");
  if (res.status === 401) return { unauthenticated: true as const };
  if (!res.ok) throw new Error("Couldn't load profile");
  return { unauthenticated: false as const, ...(await res.json()) };
}

export async function submitOnboarding(body: OnboardingBody) {
  const res = await fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save");
}