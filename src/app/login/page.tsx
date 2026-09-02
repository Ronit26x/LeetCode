import type { Metadata } from "next";
import { GithubLogo, Prohibit } from "@phosphor-icons/react/dist/ssr";
import { signIn, TEST_LOGIN } from "@/auth";
import { Wordmark } from "@/components/common/mark";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "@/components/theme/theme-switch";

export const metadata: Metadata = { title: "Sign in" };

const ERROR_TEXT: Record<string, string> = {
  AccessDenied:
    "That GitHub account is not allowed here. Sign in with the account this instance is bound to.",
  Configuration: "Sign-in is not configured. Check the GitHub OAuth environment variables.",
  OAuthCallbackError: "GitHub did not complete the sign-in. Try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/today";
  const message = error ? (ERROR_TEXT[error] ?? "Sign-in failed. Try again.") : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 items-center justify-end px-4">
        <ThemeSwitch />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-sm">
          <Wordmark />
          <h1 className="mt-6 display text-2xl leading-8">Sign in</h1>
          <p className="mt-2 text-sm text-fg-muted">
            This instance is bound to a short list of GitHub accounts. Sign in with one of them.
          </p>
          {message ? (
            <p
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-md border border-again/30 bg-again/8 px-3 py-2 text-md text-foreground"
            >
              <Prohibit size={16} className="mt-0.5 shrink-0 text-again" />
              <span>{message}</span>
            </p>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo });
            }}
          >
            <Button size="lg" className="mt-6 w-full" type="submit">
              <GithubLogo size={18} />
              Continue with GitHub
            </Button>
          </form>
          {TEST_LOGIN ? (
            <form
              action={async () => {
                "use server";
                await signIn("test", { redirectTo });
              }}
            >
              <Button size="lg" variant="outline" className="mt-2 w-full" type="submit">
                Test sign in as {TEST_LOGIN}
              </Button>
            </form>
          ) : null}
        </div>
      </main>
    </div>
  );
}
