import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Cuenta</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gestiona tu perfil y configuración de seguridad.</p>
      </div>
      <UserProfile />
    </div>
  );
}
