# GHL → GitHub Exporter — Guía de Configuración

## Prerrequisitos

- Node.js 20+
- PostgreSQL (local o en la nube: Supabase, Neon, Railway) — solo guarda el
  historial de exportaciones, no requiere nada especial.
- Un token de GitHub con permisos `repo`.

## 1. Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` / `DIRECT_URL` — tu Postgres.
- `GITHUB_TOKEN` — [github.com/settings/tokens](https://github.com/settings/tokens), permisos `repo`.
- `GITHUB_ORG` — opcional. Déjalo vacío para crear los repos en tu cuenta personal.

## 2. Base de datos

```bash
npm run db:push       # Crea las tablas
npm run db:generate   # Genera el cliente de Prisma
```

## 3. Instalar y ejecutar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). No hay proceso separado
que levantar — todo corre en el mismo servidor Next.js.

## Flujo de uso

1. Pega el link público del funnel/sitio de GoHighLevel.
2. La app rastrea todas sus páginas, genera un sitio estático idéntico y crea
   un repositorio nuevo en tu GitHub.
3. Al terminar, obtienes el link del repo y un ZIP de respaldo descargable.
4. Sube ese repositorio (o el ZIP) a Hostinger (o cualquier hosting estático)
   para publicarlo con tu propio dominio.

Si el rastreo automático falla (por ejemplo, un sitio protegido por
Cloudflare), la vista de la exportación permite pegar el HTML de la página a
mano y reintentar con eso.

## Arquitectura

```
Link de GoHighLevel pegado por el usuario
       ↓
WebsiteCrawler (Playwright) rastrea todas las páginas del sitio/funnel
       ↓
PageConverter genera HTML/CSS/JS estático 1:1
       ↓
ZIP de respaldo local (descargable desde la UI)
       ↓
Crea repositorio en GitHub + push de todos los archivos
       ↓
Repo listo para hostear en Hostinger (o cualquier hosting estático)
```
