# GHL Exporter AI — Guía de Configuración

## Prerrequisitos

- Node.js 20+
- PostgreSQL (local o en la nube: Supabase, Neon, Railway)
- Redis (local o en la nube: Upstash)
- Cuenta en: Clerk, GoHighLevel Marketplace, GitHub, Vercel, Supabase

## 1. Variables de entorno

Edita `.env.local` y completa todos los valores:

```bash
# Ver .env.local — contiene instrucciones para cada variable
```

## 2. Configurar GoHighLevel App

1. Ve a [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com)
2. Crea una nueva app
3. En OAuth Settings, agrega el Redirect URI:
   ```
   http://localhost:3000/api/ghl/oauth/callback
   ```
4. Copia el `Client ID` y `Client Secret` a tu `.env.local`
5. Scopes requeridos:
   - `locations.readonly`
   - `funnels.readonly`
   - `medias.readonly`

## 3. Configurar Clerk

1. Ve a [dashboard.clerk.com](https://dashboard.clerk.com)
2. Crea una aplicación
3. Copia las keys a `.env.local`
4. En Webhooks, crea un endpoint:
   ```
   http://localhost:3000/api/auth/webhook
   ```
   Eventos: `user.created`, `user.updated`, `user.deleted`

## 4. Base de datos

```bash
# Asegúrate de que DATABASE_URL en .env.local apunta a tu PostgreSQL
npm run db:push       # Crea las tablas
npm run db:generate   # Genera el cliente de Prisma
```

## 5. Instalar y ejecutar

```bash
npm install
npm run dev
```

## 6. Worker de exportaciones (proceso separado)

El procesamiento de exportaciones ocurre en un worker BullMQ:

```bash
# En una terminal separada:
npm run worker
```

> **Nota:** Sin el worker corriendo, las exportaciones quedarán en estado PENDING.

## Flujo de uso

1. Regístrate en la app
2. En el Dashboard → haz clic en "Conectar GoHighLevel"
3. Autoriza la app en GHL
4. Ve a "Exportaciones" → "Nueva exportación"
5. Selecciona Funnel o Website → página → haz clic en "Exportar y Desplegar"
6. Observa el progreso en tiempo real en la vista de detalle

## Arquitectura

```
API GHL (funnels, metadata)
       ↓
  ¿Tiene HTML?
  NO → Playwright renderiza la URL pública
       ↓
  Cheerio detecta componentes
       ↓
  Genera proyecto Next.js (app router, TypeScript, Tailwind)
       ↓
  Sube ZIP a Supabase Storage
       ↓
  Crea repositorio GitHub + commit inicial
       ↓
  Crea proyecto Vercel + deploy
       ↓
  URL pública lista
```
