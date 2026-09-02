import { createHighlighter, type Highlighter } from "shiki";

/** One Shiki theme per app palette. Emitted as CSS variables; globals.css picks the active one. */
export const SHIKI_THEMES = {
  light: "github-light",
  dim: "github-dark-dimmed",
  dark: "github-dark",
} as const;

export const SHIKI_LANGS = [
  "cpp",
  "c",
  "python",
  "java",
  "javascript",
  "typescript",
  "bash",
  "json",
  "sql",
  "text",
] as const;

const globalForShiki = globalThis as unknown as { __recurShiki?: Promise<Highlighter> };

export function getHighlighter(): Promise<Highlighter> {
  globalForShiki.__recurShiki ??= createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: [...SHIKI_LANGS],
  });
  return globalForShiki.__recurShiki;
}

export function normalizeLang(lang: string | null | undefined): string {
  const l = (lang ?? "text").toLowerCase();
  if (l === "c++" || l === "cc" || l === "cxx" || l === "hpp") return "cpp";
  if (l === "py") return "python";
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  if (l === "sh" || l === "shell" || l === "zsh") return "bash";
  if (l === "txt" || l === "plain" || l === "plaintext") return "text";
  return l;
}

/** Highlighted HTML with per-theme color variables. Falls back to plain text for unknown languages. */
export async function highlightCode(
  code: string,
  lang: string | null | undefined,
): Promise<string> {
  const h = await getHighlighter();
  const wanted = normalizeLang(lang);
  const loaded = h.getLoadedLanguages();
  const use = loaded.includes(wanted) ? wanted : "text";
  return h.codeToHtml(code, { lang: use, themes: SHIKI_THEMES, defaultColor: false });
}
