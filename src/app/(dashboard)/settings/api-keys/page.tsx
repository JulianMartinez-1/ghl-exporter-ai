import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key } from "lucide-react";

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gestiona tus claves de API para acceso programático.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis claves</CardTitle>
          <CardDescription>
            Las claves se muestran una sola vez al crearlas. Guárdalas en un lugar seguro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Key className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No tienes claves de API</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Próximamente: acceso programático via REST API.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
