# Port del Sistema de Licencias — AutoStock → MedStock

**Fecha**: Jul 26 2026
**Auditoría**: Exploración completa de MedStock completada (task `ses_05f6d2cc6ffe...`)
**Estado**: Pendiente de implementación (postergado hasta verificar expiración en producción de AutoStock)

---

## 1. Proyecto Explorado

**Repositorio**: `C:\Users\zcoder\Documents\CYCSWeb\GitHub\0-Vercel\MedStock`

### Stack detectado

| Componente | MedStock | AutoStock |
|------------|----------|-----------|
| Framework | Next.js 16.2.6 | Next.js 16.2.6 |
| React | 19.2.4 | 19.2.4 |
| Supabase | `@supabase/ssr` + `@supabase/supabase-js` | igual |
| Middleware | `src/proxy.ts` | `src/proxy.ts` |
| Auth | `AuthProvider.tsx` → `{ user, role, loading, signOut }` | igual |
| Roles DB | `admin`, `gerente`, `invitado` | `admin`, `vendedor`, `comprador` |
| CSS | Tailwind v4 + `cn()` | igual |
| Iconos | lucide-react | igual |
| Fuentes | Fraunces, DM Sans, JetBrains Mono | igual |
| Paleta primary | `#0a5c8a` | `#0a5c8a` |
| Cliente browser | `src/lib/supabase.ts` (createBrowserClient) | igual |
| Cliente server | `src/lib/supabase-server.ts` (createClient async) | igual |
| Cliente admin | `src/lib/supabase-admin.ts` (service_role) | igual |
| Feature flags | 7 flags en `.env.local` | no tiene |
| Chatbot | `MedStockChat.tsx` | no tiene |

### Diferencias relevantes para el port

| Aspecto | MedStock | Impacto en el port |
|---------|----------|-------------------|
| Roles | `gerente` e `invitado` (no existen `vendedor` ni `comprador`) | El sidebar y proxy usan `admin` igual que AutoStock → sin cambios |
| Sidebar | Fondo oscuro (`slate-900/800`) | El link "Licencias" se agrega igual, solo cambia el estilo visual |
| Feature flags | Ya existen y se leen en sidebar y proxy | El link "Licencias" respetará el mismo patrón |
| `.env.local` | No tiene `LICENSE_SECRET` | Agregar |
| `scripts/` | No existe directorio `scripts/` | Crear con `generate-license.ts` |
| Tablas Supabase | Mismo proyecto, convención `aut_` | Crear `aut_licenses` igual |

---

## 2. Conclusiones

### Viabilidad: Port directo, riesgo bajo

El port es prácticamente **copiar y pegar con ajustes menores**. Las razones:

1. **Mismo framework, mismas versiones** — Next.js 16.2.6, React 19.2.4, Supabase exactamente igual.
2. **Misma arquitectura de proxy** — ambos usan `src/proxy.ts` con el mismo patrón de cookies `getAll()/setAll()`.
3. **Mismos clientes Supabase** — `browser`, `server`, `admin` son idénticos en estructura.
4. **Mismo sistema de roles** — el rol `admin` existe en ambos proyectos.
5. **Misma paleta, mismas fuentes** — los componentes visuales se ven idénticos.

### Únicos cambios necesarios

- La ruta `/license` debe excluirse del license guard (igual que en AutoStock).
- El sidebar en MedStock es oscuro, el link "Licencias" debe adaptarse visualmente.
- Las exclusiones del proxy en producción (`/api/admin/`) ya existen en el plan.

### Riesgo principal

El license guard en `proxy.ts` es el punto más sensible. Si falla, bloquea toda la app. La implementación debe ser exactamente igual a la de AutoStock, que ya está verificada en producción.

---

## 3. Plan de Implementación Detallado

### Convenciones
- **Riesgo**: probabilidad de romper funcionalidad existente
- **Esfuerzo**: líneas de código relativas
- **Dependencia**: tareas que deben completarse antes

---

### Tarea M1 — Script SQL para `aut_licenses`

| Campo | Valor |
|-------|-------|
| **Archivo** | `scripts/create-aut_licenses.sql` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~15 líneas) |
| **Dependencias** | — |

**Contenido**: Ídem AutoStock. Crear tabla `aut_licenses` con columnas `id`, `license_key`, `activated_at`, `expires_at`, `is_active`, `created_at`.

**Ejecutar en**: Supabase SQL Editor del proyecto MedStock (`rrngvryilxnzffciioao`).

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

**Acción**: Copiar y ejecutar en SQL Editor de Supabase.

---

### Tarea M2 — Variables de entorno

| Campo | Valor |
|-------|-------|
| **Archivo** | `.env.local` (modificar) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (1 línea) |
| **Dependencias** | — |

Agregar en `.env.local` de MedStock:

```env
LICENSE_SECRET=2103d05324d2521e4d2e591bb8fc2c62d558480b71f9d46fd5d81f557c84dff4
```

**Importante**: Usar el MISMO `LICENSE_SECRET` que en AutoStock para que las claves generadas desde la CLI sean válidas en ambos proyectos.

También agregar en Vercel (production) la misma variable.

---

### Tarea M3 — `src/lib/license.ts`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/lib/license.ts` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~40 líneas) |
| **Dependencias** | M2 |

**Contenido**: Copia exacta de `src/lib/license.ts` de AutoStock.

Funciones:
- `verifyLicenseKey(key: string, secret: string): boolean`
- `extractExpiry(key: string): Date | null`

Sin cambios necesarios. El módulo es puramente funcional, sin imports del proyecto.

---

### Tarea M4 — `scripts/generate-license.ts`

| Campo | Valor |
|-------|-------|
| **Archivo** | `scripts/generate-license.ts` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~70 líneas) |
| **Dependencias** | M2 |

**Contenido**: Copia exacta de `scripts/generate-license.ts` de AutoStock.

Sin cambios. Script independiente, solo Node.js y crypto.

**Crear directorio** `scripts/` si no existe.

---

### Tarea M5a — Página `/license`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/license/page.tsx` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Medio (~100 líneas) |
| **Dependencias** | M1, M3 |

**Contenido**: Copia de `src/app/license/page.tsx` de AutoStock con estos ajustes:

- **Import de Supabase**: Cambiar de `@/lib/supabase` (ya existe igual en MedStock) → **sin cambios**.
- **Remove LicenciaBanner**: AutoStock lo importa, MedStock no lo tiene todavía. Si se incluye, crear en T7.
- **Estilos**: La paleta es idéntica (`bg-white text-slate-900`, etc.) → **sin cambios**.
- **Mensajes**: Cambiar referencias a "AutoStock" por "MedStock" en textos si los hay.

---

### Tarea M5b — API Route `/api/license/activate`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/api/license/activate/route.ts` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Bajo-Medio (~50 líneas) |
| **Dependencias** | M1, M3, M2 |

**Contenido**: Copia exacta de AutoStock.

Verificar:
- `supabaseAdmin` importado desde `@/lib/supabase-admin` → existe en MedStock.
- `createClient` desde `@/lib/supabase-server` → existe en MedStock.
- Tabla `aut_licenses` → creada en M1.

**Sin cambios necesarios**.

---

### Tarea M6 — License guard en `proxy.ts`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/proxy.ts` (modificar) |
| **Riesgo** | **Alto** |
| **Esfuerzo** | Medio (~40 líneas) |
| **Dependencias** | M1, M3, M5a |

**Descripción**: Insertar el license guard antes del bloque de auth, igual que en AutoStock.

**Pasos exactos:**

1. Después de `const { pathname } = request.nextUrl;`, agregar:

```typescript
const isProduction = process.env.NODE_ENV === "production";
const isLicenseRoute = pathname.startsWith("/license") || pathname.startsWith("/api/license/");

if (isProduction) {
  if (pathname.startsWith("/admin/licenses") || pathname.startsWith("/api/admin/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!isLicenseRoute && pathname !== "/login") {
    // license guard: consultar aut_licenses activa
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: licencias } = await adminClient
        .from("aut_licenses")
        .select("expires_at")
        .eq("is_active", true)
        .order("id", { ascending: false })
        .limit(1);
      if (!licencias || licencias.length === 0) {
        return NextResponse.redirect(new URL("/license", request.url));
      }
      const expiresAt = new Date(licencias[0].expires_at);
      if (expiresAt <= new Date()) {
        return NextResponse.redirect(new URL("/license?expired=1", request.url));
      }
    } catch (err) {
      console.error("License guard error:", err);
    }
  }
}
```

2. En el bloque de feature flags existente agregar `/license`:

```typescript
const featureFlags: Record<string, string> = {
  // ... existentes ...
  "/license": "FEATURE_LICENSE",
};
```

(Opcional, solo para mantener consistencia)

3. En el bloque de auth (`if (!user && !isLoginPage)`), agregar `&& !isLicenseRoute`:

```typescript
if (!user && !isLoginPage && !isLicenseRoute) {
```

Esto permite que usuarios no autenticados accedan a `/license`.

**Verificación**: Misma lógica que AutoStock, ya probada en producción de AutoStock.

---

### Tarea M7 — LicenseBanner

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/components/LicenseBanner.tsx` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~25 líneas) |
| **Dependencias** | M1 |

**Contenido**: Copia exacta de AutoStock, adaptar colores al sidebar oscuro si es necesario.

---

### Tarea M8 — Admin License Management

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/(dashboard)/admin/licenses/page.tsx` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Medio (~200 líneas) |
| **Dependencias** | M1, M3 |

**Contenido**: Copia exacta de AutoStock.

- Agregar ruta en `proxy.ts` access map: `"/admin/licenses": ["admin"]`
- Agregar en Sidebar: link "Licencias" solo en dev.
- API route `src/app/api/admin/licenses/generate/route.ts` (nuevo, copia exacta).

---

## 4. Resumen de Archivos

| # | Archivo | Acción | Copia exacta |
|---|---------|--------|-------------|
| M1 | `scripts/create-aut_licenses.sql` | Crear | ✅ Sí |
| M2 | `.env.local` | Modificar | Agregar LICENSE_SECRET |
| M3 | `src/lib/license.ts` | Crear | ✅ Sí |
| M4 | `scripts/generate-license.ts` | Crear | ✅ Sí |
| M5a | `src/app/license/page.tsx` | Crear | ✅ Sí (casi) |
| M5b | `src/app/api/license/activate/route.ts` | Crear | ✅ Sí |
| M6 | `src/proxy.ts` | Modificar | Adaptar (misma lógica) |
| M7 | `src/components/LicenseBanner.tsx` | Crear | ✅ Sí |
| M8a | `src/app/(dashboard)/admin/licenses/page.tsx` | Crear | ✅ Sí |
| M8b | `src/app/api/admin/licenses/generate/route.ts` | Crear | ✅ Sí |
| M8c | `src/components/Sidebar.tsx` | Modificar | Agregar link |
| — | `src/app/(dashboard)/layout.tsx` | Modificar | Agregar LicenseBanner |

Total: **12 archivos** (8 nuevos, 3 modificados, 1 SQL).

---

## 5. Orden de Implementación

```
Fase 1 — Base de datos y configuración
  M1 (SQL) → M2 (env)

Fase 2 — Núcleo criptográfico
  M3 (license.ts) → M4 (CLI)

Fase 3 — Activación
  M5b (API activate) → M5a (página /license)

Fase 4 — Protección
  M6 (proxy.ts) ← HITO: probar local con producción simulada

Fase 5 — UX
  M7 (LicenseBanner) → layout.tsx

Fase 6 — Admin
  M8a (admin page) → M8b (API generate) → M8c (sidebar)
```

---

## 6. Pruebas de Humo (pospuesta)

| Escenario | Procedimiento |
|-----------|---------------|
| Port completo | `npm run build` → exitoso |
| Dev sin licencia | Ir a `/dashboard` → carga normal |
| Activar licencia | Ir a `/license`, pegar clave generada desde CLI |
| Licencia expirada | Generar clave con fecha pasada → redirect a `/license?expired=1` |
| Admin panel (dev) | Ir a `/admin/licenses` → mostrar formulario |
| Sidebar (dev) | Ver link "Licencias" visible solo en dev |
| Sidebar (prod simulado) | Cambiar `NODE_ENV` a production → link oculto |

---

## 7. Notas Técnicas

- `LICENSE_SECRET` debe ser **el mismo** en AutoStock y MedStock para que las claves generadas desde la CLI funcionen en ambos proyectos. Esto es intencional: el admin genera claves desde AutoStock (que tiene el panel) y las activa en MedStock.
- El Supabase Admin Client (`supabaseAdmin`) ya existe en MedStock con la misma firma.
- `cookies()` es async en Next.js 16: `await cookies()` — ya implementado en `supabase-server.ts` de MedStock.
- El proxy de MedStock no tiene `/login` como ruta de auth (es `isLoginPage = pathname === "/login"`), igual que AutoStock.
