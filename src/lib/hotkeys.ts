/** True when a single-key shortcut should stay inert: typing targets, CodeMirror, dialogs. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  if (target.closest(".cm-editor")) return true;
  if (target.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'))
    return true;
  return false;
}

export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    "button, a, input, textarea, select, [role='radio'], [role='button'], [role='switch'], [role='checkbox'], summary",
  );
}
