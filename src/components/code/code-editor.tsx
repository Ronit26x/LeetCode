"use client";

import * as React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { indentWithTab } from "@codemirror/commands";
import { tags as t } from "@lezer/highlight";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import type { SnippetLanguage } from "@/db/schema";

function languageExtension(language: SnippetLanguage): Extension {
  switch (language) {
    case "cpp":
      return cpp();
    case "python":
      return python();
    case "java":
      return java();
    default:
      return [];
  }
}

/* Colors come from the app palette so the editor matches Light, Dim and Dark. */
const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--sunken)",
    color: "var(--foreground)",
    fontSize: "13px",
    borderRadius: "6px",
  },
  "&.cm-focused": { outline: "2px solid var(--primary)", outlineOffset: "1px" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    fontVariantLigatures: "none",
    lineHeight: "1.55",
  },
  ".cm-content": { padding: "10px 0", caretColor: "var(--foreground)" },
  ".cm-line": { padding: "0 12px" },
  ".cm-gutters": {
    backgroundColor: "var(--sunken)",
    color: "var(--fg-subtle)",
    border: "none",
    paddingLeft: "6px",
    userSelect: "none",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg-muted)" },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--primary) 22%, transparent) !important",
  },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklch, var(--primary) 16%, transparent)", outline: "none" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier], color: "var(--code-keyword)" },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: "var(--code-type)" },
  { tag: [t.string, t.special(t.string), t.character], color: "var(--code-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--code-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--code-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: "var(--code-function)" },
  { tag: [t.processingInstruction, t.meta, t.annotation], color: "var(--code-meta)" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--fg-muted)" },
]);

export function CodeEditor({
  value,
  onChange,
  language,
  minHeight = "180px",
  maxHeight = "560px",
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  language: SnippetLanguage;
  minHeight?: string;
  maxHeight?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}) {
  const extensions = React.useMemo<Extension[]>(
    () => [
      languageExtension(language),
      indentUnit.of("    "),
      EditorState.tabSize.of(4),
      keymap.of([indentWithTab]),
      editorTheme,
      syntaxHighlighting(highlight),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel ?? "Code", spellcheck: "false", autocorrect: "off", autocapitalize: "off" }),
    ],
    [language, ariaLabel],
  );
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="none"
      minHeight={minHeight}
      maxHeight={maxHeight}
      autoFocus={autoFocus}
      indentWithTab={false}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: true,
        closeBrackets: false,
        autocompletion: false,
        indentOnInput: false,
        bracketMatching: true,
        highlightSelectionMatches: false,
        tabSize: 4,
        allowMultipleSelections: true,
        rectangularSelection: true,
        crosshairCursor: false,
        dropCursor: true,
      }}
      className="overflow-hidden rounded-md border border-border"
    />
  );
}
