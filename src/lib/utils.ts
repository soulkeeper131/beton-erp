import { today } from "@/lib/dates";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR" }).format(amount);
}

export function formatDate(date: string | Date): string {
  // „2026-09-30“ е дата без час: форматира се в UTC, иначе в браузър западно от UTC става 29-ти
  const dateOnly = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date);
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric", month: "long", year: "numeric", ...(dateOnly ? { timeZone: "UTC" } : { timeZone: "Europe/Sofia" }),
  }).format(new Date(date));
}

export function generateNumber(prefix: string, count: number): string {
  const year = today().slice(0, 4);
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
