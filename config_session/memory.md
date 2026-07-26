# Contexto de Sesión — AutoStock (Jul 26 2026)

## Stack
- Next.js 16.2.6, React 19.2.4, Tailwind CSS v4, Supabase (RLS disabled), lucide-react icons
- No auth — RLS disabled on all tables, direct client-side Supabase queries
- Node.js v22.23.1 LTS (Turbopack)
- `@faker-js/faker` (devDependency) — generación de datos de prueba

## Branding
- Fraunces/DM Sans/JetBrains Mono fonts, primary blue #0a5c8a
- Logo: "AS" badge in sidebar

## Supabase
- Project ref: `mdrpujjczrgmxhxyjfdw`
- New account (separate from MedStock's 2-project limit)
- `aut_` prefix for all business tables
- RLS disabled with public `USING (true)` policies
- Service role key in `.env.local` for admin operations

## Auth & Roles
- `src/proxy.ts`: route protection via getServerUser(), role-based access map
- `src/lib/supabase-server.ts`: createClient() + getProfile()
- `src/components/AuthProvider.tsx`: React context exposing { user, role, loading, signOut }
- `src/lib/supabase.ts`: browser client via createBrowserClient
- Profiles table with roles: admin, vendedor, comprador
- `src/lib/supabase-admin.ts`: admin client with service_role key
- `src/app/api/users/route.ts`: PATCH endpoint for role changes (admin only)
- Login page at `/login` with ?redirect= param

## Palette & Conventions
- `bg-white text-slate-900 placeholder:text-slate-400` on all inputs
- Tailwind v4 uses OKLCH — amber-600 is lighter than v3 (use blue-600 for strong contrast)
- Cards: `bg-white rounded-xl shadow-sm border border-slate-100`
- Buttons: `bg-blue-600 hover:bg-blue-700 text-white` for accent actions

## Database Schema (14 tables)
- `profiles` — id, email, role (user_role enum), created_at, updated_at
- `aut_manufacturers` — id, name, contact, phone, email, notes
- `aut_suppliers` — id, name, contact_person, phone, email, address
- `aut_categories` — id, name, slug (UNIQUE), description
- `aut_locations` — id, code (UNIQUE), aisle, rack, shelf, description
- `aut_vehicles` — id, brand, model, year_start, year_end, engine, notes, UNIQUE(brand,model,engine)
- `aut_parts` — id, part_number (UNIQUE), oem_number, description, manufacturer_id FK, category_id FK, location_id FK, supplier_id FK, stock_actual, stock_min, stock_max, unit_type, weight_kg, length_cm, width_cm, height_cm, lot_number, expiry_date, notes, barcode, is_active, created_at, updated_at
- `aut_part_vehicles` — part_id FK, vehicle_id FK, PK(part_id, vehicle_id)
- `aut_movements` — id, part_id FK, type (entrada/salida/ajuste), quantity, reference_type, reference_id, notes, created_by FK, created_at
- `aut_purchase_orders` — id, order_number UNIQUE, supplier_id FK, status (pendiente/enviada/recibida/cancelada), notes, created_by FK
- `aut_purchase_items` — id, order_id FK, part_id FK, quantity_ordered, quantity_received, unit_price
- `aut_sale_orders` — id, order_number UNIQUE, customer_name, customer_phone, customer_email, status (pendiente/confirmada/despachada/entregada/cancelada), type (directa/reserva), notes, created_by FK
- `aut_sale_items` — id, order_id FK, part_id FK, quantity, unit_price
- `aut_licenses` — id, license_key (UNIQUE), activated_at, expires_at, is_active, created_at

## Pages (17 routes + 3 API routes + 1 proxy)

| Route | File | Description |
|-------|------|-------------|
| `/` | `page.tsx` | Landing page |
| `/login` | `login/page.tsx` | Login with redirect |
| `/dashboard` | `dashboard/page.tsx` | KPIs, 7-day chart, low stock alerts |
| `/inventory` | `inventory/page.tsx` | Parts CRUD + vehicle compatibility + CSV export |
| `/vehicles` | `vehicles/page.tsx` | Vehicles CRUD |
| `/categories` | `categories/page.tsx` | Categories CRUD |
| `/manufacturers` | `manufacturers/page.tsx` | Manufacturers CRUD |
| `/locations` | `locations/page.tsx` | Locations CRUD (auto-code: A-01-03) |
| `/movements` | `movements/page.tsx` | Tabbed: movements (entrada/salida + stock update via RPC) + suppliers CRUD |
| `/purchase-orders` | `purchase-orders/page.tsx` | OC list/detail/create, status flow with stock update on receive |
| `/sale-orders` | `sale-orders/page.tsx` | OV list/detail/create, direct/reserva, status flow with stock deduction |
| `/import` | `import/page.tsx` | Excel upload with column mapping, preview, template download |
| `/indicators` | `indicators/page.tsx` | 6 KPI cards, movement chart, top stock, category breakdown |
| `/users` | `users/page.tsx` | User list, role change modal via API |
| `/api/users` | `api/users/route.ts` | PATCH role (admin only) |
| `/api/reports` | `api/reports/route.ts` | POST email reports (SMTP_PASS pending) |
| `/license` | `license/page.tsx` | License activation form |
| `/api/license/activate` | `api/license/activate/route.ts` | POST activate license |
| `/admin/licenses` | `admin/licenses/page.tsx` | Admin license mgmt: edit dates, generate new key |
| `/api/admin/licenses/generate` | `api/admin/licenses/generate/route.ts` | POST generate license key |

## Shared Components
- `ui/BarChart.tsx` — needs `loaded` prop
- `ui/ConfirmModal.tsx` — variant (danger/info), confirmLabel, loading
- `ui/EmptyState.tsx` — title, description, optional action
- `ui/Skeleton.tsx` — variant (table/card/list), rows, cols
- `LicenseBanner.tsx` — banner ámbar cuando licencia ≤30 días, dismissible

## License System (SaaS)
- **Origen**: adaptado del proyecto Posadas (HMAC signing, activation form, CLI, 30-day flow, admin panel)
- **Tabla** `aut_licenses` en Supabase — SQL en `scripts/create-aut_licenses.sql`
- **Formato clave**: `XXXX-XXXX-XXXX-XXXX` — 6 chars YYMMDD + 10 chars HMAC-SHA256 truncado
- `src/lib/license.ts`: `verifyLicenseKey()` con `crypto.createHmac`, `extractExpiry()` parsea YYMMDD
- `scripts/generate-license.ts`: CLI con `--test` (30 días) o `--expires YYYY-MM-DD`
- `src/app/license/page.tsx`: formulario de activación con auto-formateo (4 grupos), mensajes de error/éxito
- `src/app/api/license/activate/route.ts`: POST endpoint, desactiva licencia anterior, inserta nueva con 30 días
- `src/proxy.ts`: license guard **solo se ejecuta en producción** (`process.env.NODE_ENV === "production"`). En desarrollo no hay ningún chequeo de licencia. En producción redirige a `/license` si no hay licencia activa o expiró. **Exclusiones**: `/license`, `/api/license/`, `/api/admin/`, `/login`
- **Dev**: el license guard no se ejecuta. Las variables `LICENSE_DISABLED` y `FORCE_LICENSE` ya no se usan.
- `LICENSE_SECRET` compartido entre `.env.local` y el CLI

### T7a/T7b — LicenseBanner (`src/components/LicenseBanner.tsx`)
- Banner ámbar en dashboard layout cuando faltan ≤30 días para expirar
- Consulta `aut_licenses` activa, calcula días restantes
- Dismissible vía `localStorage` (no vuelve a aparecer por 24h)
- Se integra en `src/app/(dashboard)/layout.tsx`

### Producción: `/admin/licenses` NUNCA accesible (3 capas de defensa)
1. **Proxy**: en producción, si `pathname` empieza con `/admin/licenses` o `/api/admin/`, redirige a `/dashboard` antes de cualquier otra lógica.
2. **Sidebar**: el link "Licencias" solo se incluye en el array navItems si `process.env.NODE_ENV === "development"`. En producción se tree-shakea del bundle.
3. **Página + API**: `page.tsx` llama `notFound()` si `process.env.NODE_ENV === "production"`. La API route devuelve 404.

### T8 — Admin License Management (`src/app/(dashboard)/admin/licenses/page.tsx`)
- Muestra licencia activa actual con fechas editables (`<input type="date">`)
- Formulario para editar `activated_at` y `expires_at` con guardado vía Supabase directo
- Sección separada "Nueva licencia generada (para próxima sesión)" con estilo ámbar
- Botón "Generar Nueva Licencia" que llama a la API de generación
- Copia al portapapeles con botón `<Copy>`
- **API** `src/app/api/admin/licenses/generate/route.ts`: genera clave HMAC desde `expires_at`, elimina duplicado previo, inserta como **inactiva** (`is_active: false`) — no desactiva la licencia actual
- **Sidebar**: entrada `"/admin/licenses"` con ícono `Shield`, rol `admin`

## Critical APIs & Patterns
- `@supabase/ssr` uses getAll()/setAll() cookie API
- Next.js 16 cookies() is async: `await cookies()`
- `maybeSingle()` (not single()) for profile queries
- `getUser()` preferred over getSession() in middleware
- CTE + UPDATE pattern fails (trigger hasn't run yet) — use 2 separate statements
- `supabase.rpc("update_part_stock", {...})` for stock mutations
- Movement recording + stock update: insert movement then RPC call
- Soft delete for parts: `is_active = false`
- tsconfig: noUnusedLocals=false, noUnusedParameters=false

## Seed Data (`scripts/seed.ts`) — Jul 25 2026
- Genera datos realistas con `@faker-js/faker` (instalado como devDependency)
- Respeta FK constraints: crea usuarios via `supabase.auth.admin.createUser()` para que existan en `auth.users`
- Se ejecuta con: `npx tsx scripts/seed.ts`
- **Tablas pobladas**:

| Tabla | Registros |
|---|---|
| `profiles` | 5 (1 admin + 4 usuarios funcionales) |
| `aut_manufacturers` | 20 (Bosch, Denso, Delphi, etc.) |
| `aut_suppliers` | 10 distribuidores argentinos |
| `aut_categories` | 12 (Frenos, Motor, etc.) |
| `aut_locations` | 24 (4 pasillos × 3 racks × 2 estantes) |
| `aut_vehicles` | 79 (Toyota, VW, Ford, etc.) |
| `aut_parts` | ~137 repuestos |
| `aut_part_vehicles` | ~326 compatibilidades |
| `aut_movements` | ~339 (entrada/salida/ajuste) |
| `aut_purchase_orders` | 25 con ~89 items |
| `aut_sale_orders` | 35 con ~96 items |

## Known Issues
- SMTP_PASS empty in `.env.local` — email reports return 501
- `autostock.web@gmail.com` needs app password setup
- Bot engine is rule-based (no OpenAI integration), responds to: stock bajo, total, movimientos, órdenes, proveedores, vehículos
- Export CSV uses UTF-8 BOM for Excel compatibility

## Checkpoint
- `141e835` — AutoStock MVP completo — 17 fases implementadas
- `0d16ed96` — historial reescrito (filter-branch)
- `de90001` — checkpoint: antes de implementar sistema de licencias (Fase 1)
- `cc1bca0` — checkpoint: antes de implementar T6 License Guard
- `d9e24f2` — checkpoint: T1-T6 sistema de licencias completado (Fase 1 y 2)
- `03556f4` — checkpoint: antes de implementar T8 panel admin licencias
- `93dd337` — checkpoint: T8 panel admin licencias + fix licencia inactiva para próxima sesión
- `a079273` — docs: actualizar memory.md con hashes reales
- `baef686` — docs: memory.md — actualizar checkpoint hashes reales
- `37af550` — checkpoint: license guard solo en producción + /admin/licenses bloqueado en producción (3 capas) + fixes seed.ts
- `HEAD` — checkpoint: license guard solo en producción + /admin/licenses bloqueado (3 capas) + fixes seed.ts + docs

## Environment
- Windows 11, PowerShell 5.1
- Supabase CLI linked to project
- `npm run dev` con Turbopack (Node.js 22 LTS required, NOT Node 24)

## Usuarios
- **admin@autostock.com** — creado via Supabase Auth Dashboard, rol cambiado a `admin` manualmente
- Los siguientes fueron creados por `scripts/seed.ts` con contraseña `AutoStock2026!`:
  - **vendedor1@autostock.com** — vendedor
  - **vendedor2@autostock.com** — vendedor
  - **comprador1@autostock.com** — comprador
  - **comprador2@autostock.com** — comprador

## Deploy
- **GitHub:** https://github.com/cycscarlos/AutoStock
- **Vercel:** https://auto-stock-nine.vercel.app/
- Variables de entorno configuradas en Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- `.gitignore` incluye: `.env*`, `Supabase-credentials/`, `supabase/.temp/`, `.vercel`

## Último Build — Jul 12 2026
```
> autostock@0.1.0 build> next build
▲ Next.js 16.2.6 (Turbopack)
- Environments: .env.local
  Creating an optimized production build ...
✓ Compiled successfully in 4.9s
✓ Finished TypeScript in 6.4s
✓ Collecting page data using 5 workers in 831ms
✓ Generating static pages using 5 workers (18/18) in 953ms
✓ Finalizing page optimization in 13ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/reports
├ ƒ /api/users
├ ○ /categories
├ ○ /dashboard
├ ○ /import
├ ○ /indicators
├ ○ /inventory
├ ○ /locations
├ ○ /login
├ ○ /manufacturers
├ ○ /movements
├ ○ /purchase-orders
├ ○ /sale-orders
├ ○ /users
└ ○ /vehicles

ƒ Proxy (Middleware)

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
