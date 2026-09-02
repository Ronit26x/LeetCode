import { auth, signOut } from "@/auth";
import { AppShell } from "@/components/shell/app-shell";
import { SidebarUser } from "@/components/shell/sidebar-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
