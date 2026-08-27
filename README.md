# GHL → GitHub Exporter

Herramienta interna de GO TO Marketing enfocada en una sola cosa: pegas el
link público de un **Funnel** o **Website de GoHighLevel** y la app clona el
sitio completo tal cual — todas sus páginas, con el mismo diseño y las mismas
interacciones (popups, sliders, animaciones, menú móvil, etc.) — a un
**repositorio nuevo en GitHub**, listo para hostear en **Hostinger** (o
cualquier hosting de archivos estáticos).

---

## ¿Qué hace?

1. Pegas la URL pública del sitio/funnel de GHL.
2. La app rastrea el sitio completo (hasta `CRAWL_MAX_PAGES` páginas, todas
   las que estén enlazadas entre sí) con un navegador headless, capturando
   HTML, CSS, JS, fuentes e imágenes reales — no una aproximación.
3. Convierte todo a HTML/CSS/JS estático puro (sin build, sin framework, sin
   dependencias) que se comporta exactamente igual que el original.
4. Crea un repositorio nuevo en tu GitHub y sube todos los archivos.
5. Genera además un ZIP de respaldo descargable desde la propia app.

Si el rastreo automático no puede acceder a una página (por ejemplo, un sitio
protegido por Cloudflare), puedes pegar el HTML de esa página a mano y
reintentar — sin perder el resto del progreso.

No hay login, no hay conexión OAuth a GoHighLevel, no hay dashboard
multiusuario: es una herramienta de un solo propósito.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Estilos | Tailwind CSS + Radix UI |
| Base de datos | PostgreSQL + Prisma ORM (solo historial de exportaciones) |
| Rastreo/extracción | Playwright + Cheerio |
| Repositorios | GitHub API (Octokit) |
| ZIP de respaldo | JSZip, guardado en disco local |

---

## Requisitos previos

- Node.js 20+
- PostgreSQL (local, [Supabase](https://supabase.com), [Neon](https://neon.tech), o [Railway](https://railway.app))
- Un token de GitHub con permisos `repo`

---

## Instalación

```bash
git clone https://github.com/JulianMartinez-1/ghl-exporter-ai.git
cd ghl-exporter-ai
npm install
cp .env.example .env.local
```

Completa `.env.local`:

```env
DATABASE_URL="postgresql://usuario:contraseña@host:5432/dbname"
DIRECT_URL="postgresql://usuario:contraseña@host:5432/dbname"

GITHUB_TOKEN="ghp_..."
GITHUB_ORG=""                 # vacío = crea los repos en tu cuenta personal

EXPORT_OUTPUT_DIR="./data/exports"
CRAWL_MAX_PAGES=60
```

Inicializa la base de datos:

```bash
npm run db:push
npm run db:generate
```

---

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Un solo proceso — no
hace falta levantar ningún worker aparte.

---

## Comandos disponibles

```bash
npm run dev          # Servidor de desarrollo con Turbopack
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción
npm run lint         # Linter ESLint

npm run db:push      # Sincronizar schema con la BD sin migration
npm run db:migrate   # Crear y aplicar una migration con nombre
npm run db:generate  # Regenerar el cliente de Prisma
npm run db:studio    # Abrir Prisma Studio (GUI de la BD)
```

---

## Flujo de uso

1. Abre la app y pega el link público del funnel o sitio de GoHighLevel.
2. Haz clic en **"Clonar y subir a GitHub"**.
3. Observa el progreso en tiempo real: rastreo → conversión → push a GitHub.
4. Al completarse, obtienes:
   - El link del repositorio nuevo en GitHub.
   - Un ZIP de respaldo descargable con el mismo contenido.
5. Sube ese repositorio (o el ZIP) a Hostinger (carpeta `public_html/` de tu
   dominio o subdominio) — no requiere build ni configuración adicional.

## Pipeline de exportación

```
Link de GoHighLevel
        ↓
WebsiteCrawler (Playwright) rastrea el sitio/funnel completo
        ↓
Cheerio + normalizador de recursos extraen HTML, CSS, fuentes, imágenes
        ↓
PageConverter genera un sitio estático 1:1 (index.html + páginas + assets/)
        ↓
ZIP de respaldo local (descargable desde la UI)
        ↓
Nuevo repositorio en GitHub + push de todos los archivos
        ↓
Repo listo para hostear en Hostinger ✓
```

### Estados de una exportación

| Estado | Descripción |
|---|---|
| `PENDING` | En cola, a punto de iniciar |
| `EXTRACTING` | Rastreando el sitio/funnel |
| `CONVERTING` | Generando los archivos del sitio estático |
| `PUSHING_TO_GITHUB` | Creando repositorio y subiendo archivos |
| `COMPLETED` | Repositorio y ZIP listos |
| `FAILED` | Error — se puede reintentar pegando el HTML manualmente |

---

## Despliegue en producción

### Hostinger VPS (recomendado para correr esta herramienta)

Requiere un VPS con Ubuntu 22.04 y mínimo 2 GB de RAM (por Playwright).

```bash
# En el servidor, ejecutar como root:
wget https://raw.githubusercontent.com/JulianMartinez-1/ghl-exporter-ai/main/deploy/setup-vps.sh
bash setup-vps.sh
```

El script instala Node.js 20, Nginx, PM2 y clona el repositorio.

Después de crear `.env.production` con tus variables:

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

Configura Nginx copiando `deploy/nginx.conf` a `/etc/nginx/sites-available/`,
ajusta tu dominio y obtén SSL con:
```bash
certbot --nginx -d tudominio.com
```

> Nota: este VPS es donde corre *esta herramienta* (el exportador). Los
> **sitios clonados** que genera se hostean por separado, típicamente en
> Hostinger, subiendo el contenido de cada repo a la carpeta pública del
> dominio del cliente.

---

## Arquitectura de módulos

```
src/
├── app/
│   ├── page.tsx                # Formulario + historial de exportaciones
│   ├── exports/[id]/page.tsx   # Progreso en vivo, logs, resultado
│   └── api/exports/            # Crear, listar, consultar, reintentar, descargar
│
└── modules/
    ├── extractor/              # PlaywrightExtractor + WebsiteCrawler (rastreo completo)
    ├── converter/               # PageConverter — genera el sitio estático 1:1
    ├── github/                 # GitHubService (Octokit) — crea repo y pushea archivos
    └── export/                 # run-export.ts (pipeline) + ExportLogger
```
