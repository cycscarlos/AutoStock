# Plan de Implementación — Sistema de Licencias (Activación por Clave)

## 1. Análisis del Sistema Referencial (Posadas)

### Arquitectura original (Express + MySQL)

| Capa | Archivo | Propósito |
|------|---------|-----------|
| DB Schema | `tools/migration/licencias.sql` | Tabla MySQL `licencias` |
| Generador | `tools/license-generator.js` | CLI para generar claves HMAC |
| Controlador | `src/controllers/ctrl_license.js` | Verificar clave, activar en DB |
| Middleware | `src/middlewares/licenseGuard.js` | Bloquear rutas si no hay licencia |
| Vista | `src/views/license-activate.ejs` | Formulario de activación |
| Ruta | `routes/license.js` | GET/POST `/license/activate` |
| Config | `env/.env` | `LICENSE_SECRET`, `FORCE_LICENSE`, `LICENSE_DISABLED` |

### Algoritmo de clave

```
Formato:  XXXX-XXXX-XXXX-XXXX  (16 caracteres hex, 4 grupos)
  └─ 6 chars: YYMMDD de expiración
  └─ 10 chars: HMAC-SHA256(secret, rawDate) → truncado a 10 → uppercase
```

### Flujo de validación

```
1. Llega request a ruta protegida
2. licenseGuard verifica:
   a) ¿LICENSE_DISABLED=true? → skip
   b) ¿desarrollo y FORCE_LICENSE≠true? → skip
   c) ¿ruta /license/? → skip
   d) Consulta licencia activa en DB
   e) ¿No hay licencia? → redirect /license/activate
   f) ¿Expirada? → redirect /license/activate?expired=1
   g) ¿<30 días? → warning en locals
3. Activar: validar HMAC → desactivar licencias activas → insertar nueva (30 días)
```

---

## 2. Adaptación a AutoStock (Next.js 16 + Supabase/PostgreSQL)

### Stack objetivo

| Componente | Tecnología |
|------------|------------|
| Frontend | Next.js App Router + React 19 + Tailwind v4 |
| Backend | Server Components + API Routes (Next.js) |
| DB | Supabase (PostgreSQL) con RLS disabled |
| Middleware | `src/proxy.ts` (edge function-like, runs on every request) |
| Auth | Supabase Auth (client-side) |
| Encriptación | `crypto` (Web Crypto API en edge, `crypto` module en Node) |

### Diferencias clave con Posadas

| Aspecto | Posadas | AutoStock |
|---------|---------|-----------|
| Lenguaje | JavaScript (ES5/CommonJS) | TypeScript (ESM) |
| Framework | Express + EJS | Next.js 16 App Router |
| DB | MySQL (mysql2) | PostgreSQL (Supabase) |
| DB driver | raw `query()` | Supabase client (`supabase.from()`) |
| Middleware | Express middleware chain | `proxy.ts` + layout guard |
| Sesión | `express-session` | Supabase Auth session |
| Vista | EJS template server-rendered | React Client Component |
| CLI | `node tools/license-generator.js` | `npx tsx scripts/generate-license.ts` |

---

## 3. Plan de Implementación

### Convención

- **Riesgo**: (bajo/medio/alto) — probabilidad de romper funcionalidad existente
- **Esfuerzo**: (bajo/medio/alto) — líneas de código o complejidad relativa

---

### Tarea 1 — Tabla `aut_licenses` en Supabase

**Archivo**: `supabase/migrations/001_licenses.sql` (nuevo)

**Descripción**: Crear tabla PostgreSQL para almacenar licencias activadas.

```sql
CREATE TABLE IF NOT EXISTS aut_licenses (
  id BIGSERIAL PRIMARY KEY,
  license_key VARCHAR(19) NOT NULL UNIQUE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aut_licenses_active ON aut_licenses(is_active, expires_at);
```

**Riesgo**: **Bajo** — tabla nueva, no afecta nada existente.
**Esfuerzo**: **Bajo** — 1 archivo SQL.

**Dependencias**: Ninguna.

---

### Tarea 2 — Variables de entorno

**Archivo**: `.env.local` (modificar)

**Descripción**: Añadir variables de configuración del sistema de licencias.

```
# Licenciamiento
LICENSE_SECRET=2103d05324d2521e4d2e591bb8fc2c62d558480b71f9d46fd5d81f557c84dff4
LICENSE_DISABLED=true
FORCE_LICENSE=false
```

- En **desarrollo**: `LICENSE_DISABLED=true` → licencia inactiva.
- En **producción** (Vercel): `LICENSE_DISABLED=false`, `FORCE_LICENSE=false` → licencia activa.
- `LICENSE_SECRET` debe ser el mismo usado por el generador de claves.

**Riesgo**: **Bajo** — solo variables de entorno.
**Esfuerzo**: **Bajo** — 4 líneas.

**Dependencias**: Ninguna.

---

### Tarea 3 — Utilidad criptográfica `src/lib/license.ts`

**Archivo**: `src/lib/license.ts` (nuevo)

**Descripción**: Funciones de verificación de clave HMAC (portadas desde `ctrl_license.js`). Usa Web Crypto API para compatibilidad con edge runtime.

```
verifyLicenseKey(key: string, secret: string): boolean
  └─ Limpia el formato (guiones, mayúsculas)
  └─ Valida regex /^[A-F0-9]{16}$/
  └─ Extrae rawDate (6 chars) + hmacPart (10 chars)
  └─ Recalcula HMAC-SHA256 y compara

extractExpiry(key: string): Date | null
  └─ Parsea YYMMDD → Date
```

**Riesgo**: **Bajo** — módulo nuevo sin side effects, 100% testeable.
**Esfuerzo**: **Bajo** — ~40 líneas.

**Dependencias**: Tarea 2 (LICENSE_SECRET).

---

### Tarea 4 — Script generador de licencias `scripts/generate-license.ts`

**Archivo**: `scripts/generate-license.ts` (nuevo)

**Descripción**: CLI portado de `tools/license-generator.js`. Genera claves en formato `XXXX-XXXX-XXXX-XXXX`.

```
Uso: npx tsx scripts/generate-license.ts --expires 2027-12-31
     npx tsx scripts/generate-license.ts --test
```

**Riesgo**: **Bajo** — script independiente, no afecta la app.
**Esfuerzo**: **Bajo-Bajo** — ~70 líneas, port directo.

**Dependencias**: Tarea 2 (misma lógica HMAC).

---

### Tarea 5 — Página de activación de licencia `/license`

#### 5a. Ruta `src/app/license/page.tsx`

**Archivo**: `src/app/license/page.tsx` (nuevo)

**Descripción**: Formulario de activación de licencia con auto-formateo del input.

- Input con placeholder `XXXX-XXXX-XXXX-XXXX`
- Auto-mayúsculas y auto-formateo al escribir (JS puro, como Posadas)
- CSRF no necesario (RLS disabled, no auth)
- Botón "Activar" que envía POST a API route
- Muestra errores: clave inválida, ya activada, expirada
- Muestra sweet alert-style toast con `confirmModal` o similar

**Riesgo**: **Medio** — nueva ruta pública, hay que asegurarse que el proxy no la bloquee.
**Esfuerzo**: **Medio** — ~100 líneas de JSX + lógica de formulario.

#### 5b. API Route `src/app/api/license/activate/route.ts`

**Archivo**: `src/app/api/license/activate/route.ts` (nuevo)

**Descripción**: Endpoint POST que recibe la clave, la verifica y la activa.

```
POST /api/license/activate
  Body: { license_key: string }
  Response: { success: boolean, error?: string }

Lógica:
  1. Validar clave con verifyLicenseKey()
  2. Desactivar licencias activas: UPDATE aut_licenses SET is_active = false
  3. Insertar nueva licencia con expires_at = DATE(NOW() + 30 days)
  4. Return { success: true }
```

**Riesgo**: **Medio** — escribe en DB, pero ya hay patrón similar en otras API routes.
**Esfuerzo**: **Bajo-Medio** — ~50 líneas.

**Dependencias**: Tareas 1 (tabla), 3 (verifyLicenseKey), 2 (env).

---

### Tarea 6 — License guard en el proxy `src/proxy.ts`

**Archivo**: `src/proxy.ts` (modificar)

**Descripción**: Middleware de verificación de licencia, similar a `licenseGuard.js`.

```typescript
// En el proxy, antes de la verificación de auth:
if (!isLicenseActive && !isLicenseDisabled && !isDevelopment && !isLicenseRoute) {
  return NextResponse.redirect(new URL("/license", request.url));
}
```

**Lógica**:
1. Si `LICENSE_DISABLED=true` → pasar
2. Si `NODE_ENV=development` y `FORCE_LICENSE≠true` → pasar  
3. Si ruta empieza con `/license` → pasar
4. Consultar `supabaseAdmin.from("aut_licenses").select(...).eq("is_active", true).maybeSingle()`
5. Si no hay licencia → redirect `/license`
6. Si expirada → redirect `/license?expired=1`

**Riesgo**: **Alto** — modifica el proxy que protege TODAS las rutas. Un error bloquea toda la app. Requiere testing manual cuidadoso.
**Esfuerzo**: **Medio** — ~40 líneas agregadas.

**Dependencias**: Tareas 1 (tabla), 3 (utilidad), 5 (ruta de activación).

---

### Tarea 7 — Banner de licencia próxima a expirar

#### 7a. Dashboard layout `src/app/(dashboard)/layout.tsx` (modificar)

**Descripción**: Mostrar un banner informativo en el dashboard cuando quedan ≤30 días de licencia.

**Enfoque**: Consultar la licencia activa y calcular días restantes en el proxy, pasar como header o cookie, o hacer una consulta client-side.

**Opción recomendada**: Query ligera desde el layout (client-side):
```typescript
const { data } = await supabase
  .from("aut_licenses")
  .select("expires_at")
  .eq("is_active", true)
  .maybeSingle();
if (data) {
  const daysLeft = Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 30) setShowBanner(true);
}
```

**Riesgo**: **Bajo-Medio** — componente visual, no bloqueante.
**Esfuerzo**: **Bajo** — ~30 líneas.

#### 7b. Componente `LicenseBanner` (nuevo)

**Archivo**: `src/components/LicenseBanner.tsx` (nuevo)

**Descripción**: Banner amarillo en el tope del dashboard con días restantes y link a renovar.

**Riesgo**: **Bajo** — componente UI simple.
**Esfuerzo**: **Bajo** — ~25 líneas.

---

### Tarea 8 — Página de administración de licencias (`/admin/licenses`) — Opcional

**Archivo**: `src/app/(dashboard)/admin/licenses/page.tsx` (nuevo)

**Descripción**: Panel admin para ver estado de licencia actual, fecha de expiración, y opción de generar nueva licencia (solo admin, usando `supabaseAdmin`).

**Riesgo**: **Medio** — nueva ruta, solo accesible por admin.
**Esfuerzo**: **Medio** — ~80 líneas.

---

## 4. Resumen de Tareas

| # | Tarea | Riesgo | Esfuerzo | Dependencias |
|---|-------|--------|----------|--------------|
| 1 | Tabla `aut_licenses` en Supabase | Bajo | Bajo | — |
| 2 | Variables de entorno | Bajo | Bajo | — |
| 3 | Utilidad criptográfica `src/lib/license.ts` | Bajo | Bajo | T2 |
| 4 | CLI generador de licencias | Bajo | Bajo | T2 |
| 5a | Página de activación `/license` | Medio | Medio | T1, T3 |
| 5b | API route `/api/license/activate` | Medio | Bajo-Medio | T1, T3, T2 |
| 6 | License guard en `proxy.ts` | **Alto** | Medio | T1, T3, T5 |
| 7a | Banner en dashboard layout | Bajo-Medio | Bajo | T1 |
| 7b | Componente `LicenseBanner` | Bajo | Bajo | T7a |
| 8 | Admin panel (opcional) | Medio | Medio | T1, T3 |

---

## 5. Orden de Implementación Recomendado

```
Fase 1 (base segura, sin tocar proxy):
  T1 → T2 → T3 → T4 → T5b → T5a

Fase 2 (protección):
  T6 ← HITO: probar en desarrollo con FORCE_LICENSE=true

Fase 3 (UX):
  T7a → T7b

Fase 4 (opcional, solo admin):
  T8
```

---

## 6. Pruebas de Humo

| Escenario | Cómo probar |
|-----------|-------------|
| Dev normal | `LICENSE_DISABLED=true` → app funciona sin pedir licencia |
| Dev con licencia forzada | `FORCE_LICENSE=true` → app redirige a `/license` |
| Activar licencia válida | POST a `/api/license/activate` con clave generada por `generate-license.ts` |
| Activar licencia inválida | Enviar clave aleatoria → error visible |
| Licencia expirada | Generar clave con fecha pasada → redirect a `/license?expired=1` |
| Licencia próxima a vencer | Generar clave con ≤30 días → banner visible |

---

## 7. Notas Técnicas

- **Web Crypto API**: El proxy de Next.js corre en edge runtime donde `crypto` (Node) no está disponible. Usar `crypto.subtle` (Web API) en `license.ts`.
- **Servicio Role Key**: La consulta de licencia en el proxy debe usar `supabaseAdmin` (service_role) porque no hay sesión de usuario en las rutas públicas. Ya existe `src/lib/supabase-admin.ts`.
- **RLS**: La tabla `aut_licenses` tiene RLS deshabilitado (como todas las demás), así que las queries funcionan directamente.
- **Vercel Edge**: Si el proxy se deploya en edge, `crypto.subtle` es la única opción. Si se usa Node.js runtime, se puede usar `crypto` de Node. Implementar detección automática o usar Web Crypto API directamente.
