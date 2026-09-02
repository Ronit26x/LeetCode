import type { Metadata } from "next";
import { GithubLogo } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/common/mark";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme/theme-switch";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 items-center justify-end px-4">
        <ThemeSwitch />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <Wordmark />
          <h1 className="display mt-6 text-2xl leading-8">Sign in</h1>
          <p className="mt-2 text-sm text-fg-muted">
            One account owns this instance. Sign in with the GitHub login it is bound to.
          </p>
          <Button size="lg" className="mt-6 w-full" disabled>
            <GithubLogo size={18} />
            Continue with GitHub
          </Button>
        </div>
      </main>
    </div>
  );
}
