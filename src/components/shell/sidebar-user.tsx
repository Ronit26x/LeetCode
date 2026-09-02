"use client";

import { SignOut } from "@phosphor-icons/react/dist/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SidebarUser({
  name,
  login,
  image,
  onSignOut,
}: {
  name: string;
  login: string;
  image: string | null;
  onSignOut: () => Promise<void>;
}) {
  const initial = (name || login || "?").slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-md text-fg-muted transition-colors hover:bg-hover hover:text-foreground data-popup-open:bg-hover"
        aria-label="Account menu"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={20} height={20} className="size-5 rounded-full" />
        ) : (
          <span className="flex size-5 items-center justify-center rounded-full bg-sunken text-2xs font-medium text-foreground">
            {initial}
          </span>
        )}
        <span className="truncate text-foreground">{name || login}</span>
        {login && login !== name ? <span className="ml-auto truncate text-fg-subtle">{login}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-(--anchor-width)">
        <DropdownMenuItem onClick={() => void onSignOut()}>
          <SignOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
