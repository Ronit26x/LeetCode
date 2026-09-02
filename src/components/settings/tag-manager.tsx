"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, DotsThree, Plus, Trash, GitMerge } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/common/native-select";
import { inputClass } from "@/components/common/field";
import { TAG_DOT_CLASSES } from "@/components/common/badges";
import { createTag, deleteTag, mergeTags, reorderTags, updateTag } from "@/lib/tags/actions";
import type { TagWithCounts } from "@/lib/problems/queries";
import type { TagColor, TagKind } from "@/db/schema";
import { cn } from "@/lib/utils";

const COLORS = Object.keys(TAG_DOT_CLASSES) as TagColor[];
const KINDS: { value: TagKind; label: string }[] = [
  { value: "topic", label: "Topic" },
  { value: "pattern", label: "Pattern" },
  { value: "company", label: "Company" },
  { value: "custom", label: "Custom" },
];

function ColorPicker({ value, onChange }: { value: TagColor; onChange: (c: TagColor) => void }) {
  return (
    <Popover>
      <PopoverTrigger className="flex size-7 items-center justify-center rounded-md hover:bg-hover" aria-label={`Color: ${value}`}>
        <span className={cn("size-3 rounded-full", TAG_DOT_CLASSES[value])} />
      </PopoverTrigger>
      <PopoverContent align="start" className="grid w-auto grid-cols-6 gap-1 p-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => onChange(c)}
            className={cn("flex size-7 items-center justify-center rounded-md hover:bg-hover", c === value && "ring-1 ring-border-strong")}
          >
            <span className={cn("size-3.5 rounded-full", TAG_DOT_CLASSES[c])} />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function TagRow({
  tag,
  index,
  count,
  all,
  onMove,
}: {
  tag: TagWithCounts;
  index: number;
  count: number;
  all: TagWithCounts[];
  onMove: (from: number, to: number) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(tag.name);
  const [merging, setMerging] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function save(patch: Omit<Parameters<typeof updateTag>[0], "id">) {
    startTransition(async () => {
      const res = await updateTag({ id: tag.id, ...patch });
      if (!res.ok) {
        toast.error(res.error);
        setName(tag.name);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <ColorPicker value={tag.color} onChange={(color) => save({ color })} />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== tag.name && save({ name })}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setName(tag.name);
        }}
        aria-label="Tag name"
        className={cn(inputClass, "h-8 min-w-0 flex-1 border-transparent bg-transparent hover:border-border focus:border-border")}
      />
      <NativeSelect size="sm" value={tag.kind} onChange={(e) => save({ kind: e.target.value as TagKind })} aria-label="Kind" className="w-24">
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </NativeSelect>
      <label className="hidden items-center gap-1.5 text-2xs text-fg-muted sm:flex" title="Suggest Resolve for every review of problems with this tag">
        <Switch checked={tag.alwaysResolve} onCheckedChange={(v) => save({ alwaysResolve: v })} aria-label="Always resolve" />
        Resolve
      </label>
      <span className="w-8 text-right text-2xs text-fg-subtle" title="Problems with this tag">
        {tag.total}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${tag.name}`} />}>
          <DotsThree size={16} weight="bold" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={index === 0} onClick={() => onMove(index, index - 1)}>
            <ArrowUp /> Move up
          </DropdownMenuItem>
          <DropdownMenuItem disabled={index === count - 1} onClick={() => onMove(index, index + 1)}>
            <ArrowDown /> Move down
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMerging(true)}>
            <GitMerge /> Merge into…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await deleteTag(tag.id);
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success(`Deleted ${tag.name}`);
                  router.refresh();
                }
              })
            }
          >
            <Trash /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={merging} onOpenChange={setMerging}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge {tag.name} into</DialogTitle>
            <DialogDescription>
              Every problem tagged {tag.name} gets the target tag, then {tag.name} is deleted.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border">
            {all
              .filter((t) => t.id !== tag.id)
              .map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center gap-2 px-3 text-left text-md hover:bg-hover"
                    onClick={() =>
                      startTransition(async () => {
                        const res = await mergeTags(tag.id, t.id);
                        if (!res.ok) toast.error(res.error);
                        else {
                          toast.success(`Merged into ${t.name}`);
                          setMerging(false);
                          router.refresh();
                        }
                      })
                    }
                  >
                    <span className={cn("size-2 rounded-full", TAG_DOT_CLASSES[t.color])} />
                    {t.name}
                    <span className="ml-auto text-2xs text-fg-subtle">{t.total}</span>
                  </button>
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>
    </li>
  );
}

export function TagManager({ tags }: { tags: TagWithCounts[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<TagKind>("topic");
  const [pending, startTransition] = React.useTransition();

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createTag({ name, kind, color: COLORS[tags.length % COLORS.length] });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setName("");
      router.refresh();
    });
  }

  function move(from: number, to: number) {
    const ids = tags.map((t) => t.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    startTransition(async () => {
      const res = await reorderTags(ids);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag" aria-label="New tag name" className={cn(inputClass, "h-8 flex-1")} />
        <NativeSelect size="sm" value={kind} onChange={(e) => setKind(e.target.value as TagKind)} aria-label="New tag kind" className="w-24">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={pending || !name.trim()}>
          <Plus size={14} /> Add
        </Button>
      </form>
      <ul className="divide-y divide-border">
        {tags.map((t, i) => (
          <TagRow key={t.id} tag={t} index={i} count={tags.length} all={tags} onMove={move} />
        ))}
      </ul>
      <p className="text-2xs text-fg-subtle">
        Order matters: a problem&apos;s primary topic is its first topic tag in this list. Resolve marks a tag whose problems are always re-solved instead of revised.
      </p>
    </div>
  );
}
