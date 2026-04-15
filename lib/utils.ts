import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatHours(n: number): string {
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

export function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
