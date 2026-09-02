import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { SidebarUser } from "@/components/shell/sidebar-user";
import { SetupNotice } from "@/components/common/setup-notice";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const missing = ["DATABASE_URL"].filter((k) => !process.env[k]);
  if (missing.length) return <SetupNotice missing={missing} />;

  const session = await auth();
  const user = session?.user;
  return (
    <AppShell
      sidebarFooter={
        user ? (
          <SidebarUser
            name={user.name ?? ""}
            login={user.login}
            image={user.image ?? null}
            onSignOut={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          />
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
