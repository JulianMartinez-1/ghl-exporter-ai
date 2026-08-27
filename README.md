# GHL Exporter AI

Plataforma SaaS que convierte Funnels y Websites de **GoHighLevel** en sitios web estáticos independientes, los sube automáticamente a un repositorio de **GitHub** y los despliega en **Vercel** con una URL pública lista para usar.

---

## ¿Qué hace?

GoHighLevel no permite exportar directamente el HTML de sus páginas. **GHL Exporter AI** resuelve ese problema de tres formas:

1. **Vía API + Playwright** — Extrae la metadata desde la API de GHL y, si el contenido no está disponible, renderiza la página con un navegador headless (Playwright) para capturar el HTML completo incluyendo estilos y assets.
2. **Crawling completo de sitio** — A partir de una URL pública, recorre hasta 25 páginas del sitio automáticamente.
3. **HTML pegado manualmente** — El usuario pega el HTML de la página directamente en la interfaz como respaldo.

Una vez extraído el contenido, la plataforma:
- Convierte el HTML a un proyecto estático listo para hostear
- Crea un repositorio en GitHub con todos los archivos
- Despliega en Vercel y entrega una URL pública en minutos
- Guarda una copia ZIP en Supabase Storage como respaldo

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Estilos | Tailwind CSS + Radix UI |
| Autenticación | Clerk |
| Base de datos | PostgreSQL + Prisma ORM |
| Cola de tareas | BullMQ + Redis |
| Extracción | Playwright + Cheerio |
| Repositorios | GitHub API (Octokit) |
| Despliegue | Vercel API |
| Almacenamiento | Supabase Storage |
| Animaciones | Framer Motion |

---

## Características principales

- **OAuth 2.0 con GoHighLevel** — Conexión segura a subcuentas GHL sin exponer credenciales
- **Múltiples métodos de extracción** — API, Playwright headless, o HTML manual
- **Progreso en tiempo real** — Logs detallados por cada paso del proceso de exportación
- **Historial completo** — Panel con todas las exportaciones, su estado y URLs resultantes
- **Repositorios GitHub automáticos** — Cada exportación genera un repo independiente
- **Deploys en Vercel** — URL pública funcional al finalizar cada exportación
- **API Keys propias** — Acceso programático a la plataforma
- **Arquitectura de workers** — Procesamiento asíncrono con BullMQ para no bloquear la UI

---

## Requisitos previos

- Node.js 20+
- PostgreSQL (local, [Supabase](https://supabase.com), [Neon](https://neon.tech), o [Railway](https://railway.app))
- Redis (local o [Upstash](https://upstash.com))
- Cuentas en: [Clerk](https://clerk.com), [GoHighLevel Marketplace](https://marketplace.gohighlevel.com), [GitHub](https://github.com), [Vercel](https://vercel.com)
- (Opcional) Cuenta en [Supabase](https://supabase.com) para backup de ZIPs

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/JulianMartinez-1/ghl-exporter-ai.git
cd ghl-exporter-ai
npm install
```

### 2. Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://usuario:contraseña@host:5432/dbname?pgbouncer=true"
DIRECT_URL="postgresql://usuario:contraseña@host:5432/dbname"

# Clerk (autenticación)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# GoHighLevel OAuth
GHL_CLIENT_ID="tu-client-id"
GHL_CLIENT_SECRET="tu-client-secret"

# Redis (para la cola de exportaciones)
REDIS_URL="redis://localhost:6379"

# GitHub (token con permisos repo)
GITHUB_TOKEN="ghp_..."
GITHUB_ORG="tu-usuario-o-organizacion"

# Vercel (token de cuenta personal o de equipo)
VERCEL_TOKEN="tu-vercel-token"
VERCEL_TEAM_ID="team_..."   # Opcional — solo si usas un equipo

# Cifrado de tokens GHL en base de datos
ENCRYPTION_KEY="clave-aleatoria-de-32-caracteres"

# Supabase Storage (opcional — para backup de ZIPs)
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# URL pública de la app
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Configurar GoHighLevel

1. Ve a [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) y crea una app
2. En **OAuth Settings**, agrega el Redirect URI:
   ```
   http://localhost:3000/api/ghl/oauth/callback
   ```
3. Scopes requeridos: `locations.readonly`, `funnels.readonly`, `medias.readonly`
4. Copia el Client ID y Client Secret a tu `.env.local`

### 4. Configurar Clerk

1. En [dashboard.clerk.com](https://dashboard.clerk.com), crea una aplicación
2. Ve a **Webhooks** y crea un endpoint:
   ```
   http://localhost:3000/api/auth/webhook
   ```
   Eventos: `user.created`, `user.updated`, `user.deleted`
3. Copia el Webhook Secret a `CLERK_WEBHOOK_SECRET`

### 5. Inicializar la base de datos

```bash
npm run db:push       # Crea las tablas en PostgreSQL
npm run db:generate   # Genera el cliente de Prisma
```

---

## Ejecutar en desarrollo

La plataforma requiere **dos procesos corriendo en paralelo**:

```bash
# Terminal 1 — servidor web Next.js
npm run dev

# Terminal 2 — worker de exportaciones (BullMQ)
npm run worker
```

> Sin el worker corriendo, las exportaciones quedarán en estado `PENDING` indefinidamente.

Abre [http://localhost:3000](http://localhost:3000) para ver la landing page.

---

## Comandos disponibles

```bash
npm run dev          # Servidor de desarrollo con Turbopack
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción
npm run lint         # Linter ESLint
npm run worker       # Iniciar worker de BullMQ

npm run db:push      # Sincronizar schema con la BD sin migration
npm run db:migrate   # Crear y aplicar una migration con nombre
npm run db:generate  # Regenerar el cliente de Prisma
npm run db:studio    # Abrir Prisma Studio (GUI de la BD)
```

---

## Flujo de uso

1. **Regístrate** en la plataforma
2. En el **Dashboard**, haz clic en **"Conectar GoHighLevel"** y autoriza la app
3. Ve a **Exportaciones** → **"Nueva exportación"**
4. Selecciona la subcuenta conectada, elige **Funnel** o **Website**, luego la página específica
5. Haz clic en **"Exportar y Desplegar"**
6. Observa el progreso en tiempo real: Extracción → Conversión → GitHub → Vercel
7. Al completarse, obtienes:
   - URL pública en Vercel (ej. `https://ghl-mi-pagina.vercel.app`)
   - Repositorio en GitHub con todo el código generado
   - ZIP de respaldo en Supabase Storage

---

## Pipeline de exportación

```
GHL API (metadata de la página)
        ↓
¿Tiene HTML renderizado?
  NO → Playwright captura la URL pública
        ↓
Cheerio extrae: HTML, CSS, fuentes, imágenes
        ↓
Conversión a sitio estático
        ↓
ZIP → Supabase Storage (backup)
        ↓
Nuevo repositorio en GitHub + commit inicial
        ↓
Deploy en Vercel (archivos directos, sin conexión GitHub↔Vercel)
        ↓
URL pública lista ✓
```

### Estados de una exportación

| Estado | Descripción |
|---|---|
| `PENDING` | En cola, esperando el worker |
| `EXTRACTING` | Obteniendo HTML de la página |
| `CONVERTING` | Generando los archivos del sitio estático |
| `PUSHING_TO_GITHUB` | Creando repositorio y subiendo archivos |
| `DEPLOYING` | Desplegando en Vercel |
| `COMPLETED` | URL pública disponible |
| `FAILED` | Error — ver logs para diagnóstico |

---

## Despliegue en producción

### Opción A — Vercel (recomendado para el servidor web)

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Agrega todas las variables de entorno del `.env.local`
3. Para el worker, despliégalo en un servidor separado (Railway, Render, o VPS)

### Opción B — Hostinger VPS (app completa)

Requiere un VPS con Ubuntu 22.04 y mínimo 2 GB de RAM (por Playwright).

```bash
# En el servidor, ejecutar como root:
wget https://raw.githubusercontent.com/JulianMartinez-1/ghl-exporter-ai/main/deploy/setup-vps.sh
bash setup-vps.sh
```

El script instala Node.js 20, Redis, Nginx, PM2 y clona el repositorio.

Después de crear el archivo `.env.production` con tus variables:

```bash
cd /var/www/ghl-exporter
npm run build
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

Para futuras actualizaciones:
```bash
bash /var/www/ghl-exporter/deploy/update.sh
```

Configura Nginx copiando `deploy/nginx.conf` a `/etc/nginx/sites-available/`, ajusta tu dominio y obtén SSL con:
```bash
certbot --nginx -d tudominio.com
```

---

## Arquitectura de módulos

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Sign-in / Sign-up (Clerk)
│   ├── (dashboard)/            # Rutas protegidas
│   │   ├── dashboard/          # Panel principal con estadísticas
│   │   ├── exports/            # Historial y creación de exportaciones
│   │   ├── deploys/            # Sitios desplegados en Vercel
│   │   ├── repositories/       # Repositorios en GitHub
│   │   ├── settings/           # Cuenta y API keys
│   │   └── logs/               # Logs de sistema
│   └── api/                    # API Routes
│       ├── ghl/                # OAuth GHL, funnels, websites
│       ├── exports/            # CRUD + retry + logs en tiempo real
│       └── auth/webhook/       # Sync de usuarios desde Clerk
│
└── modules/                    # Lógica de negocio
    ├── gohighlevel/            # Cliente API GHL + servicios OAuth
    ├── extractor/              # ExtractionOrchestrator + WebsiteCrawler
    ├── converter/              # PageConverter + ComponentDetector
    ├── github/                 # GitHubService (Octokit)
    ├── vercel/                 # VercelService (deploy directo)
    ├── storage/                # SupabaseStorageService
    ├── jobs/                   # BullMQ queue + worker + processor
    └── logs/                   # ExportLogger (logs a BD)
```

---

## Licencia

Proyecto privado — GO-TO Marketing. Todos los derechos reservados.
