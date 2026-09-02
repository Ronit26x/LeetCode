import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return true;
  return (
    /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "") || /Mac OS/.test(navigator.userAgent)
  );
}
