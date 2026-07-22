import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function isEmail(identifier: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

export function isPhone(identifier: string) {
  return /^\+?[0-9][0-9\s().-]{6,}$/.test(identifier);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
