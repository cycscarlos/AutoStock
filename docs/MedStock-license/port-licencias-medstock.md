# Port del Sistema de Licencias — AutoStock → MedStock

**Fecha**: Jul 26 2026
**Auditoría**: Exploración completa de MedStock completada (task `ses_05f6d2cc6ffe...`)
**Estado**: Pendiente de implementación (postergado hasta verificar expiración en producción de AutoStock)

## Contenido de esta carpeta

| Archivo | Descripción |
|---------|-------------|
| `port-licencias-medstock.md` | Este plan |
| `create-aut_licenses.sql` | SQL para crear la tabla en Supabase |
| `license.ts` | `src/lib/license.ts` — funciones verifyLicenseKey y extractExpiry |
| `generate-license.ts` | `scripts/generate-license.ts` — CLI generador de claves |
| `license-page.tsx` | `src/app/license/page.tsx` — formulario de activación |
| `activate-route.ts` | `src/app/api/license/activate/route.ts` — endpoint de activación |
| `admin-licenses-page.tsx` | `src/app/(dashboard)/admin/licenses/page.tsx` — panel admin |
| `admin-generate-route.ts` | `src/app/api/admin/licenses/generate/route.ts` — endpoint generar |
| `LicenseBanner.tsx` | `src/components/LicenseBanner.tsx` — banner de días restantes |
| `proxy-reference.ts` | `src/proxy.ts` de AutoStock (referencia del license guard) |

Los archivos `.ts`/`.tsx` son copias textuales del código fuente de AutoStock. Copiar a las rutas indicadas y ajustar según las notas de cada tarea.

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

**Archivo SQL**: `create-aut_licenses.sql` (en esta carpeta).

**Ejecutar en**: Supabase SQL Editor del proyecto MedStock (`rrngvryilxnzffciioao`).

**Acción**: Abrir el archivo `.sql`, copiar y ejecutar en SQL Editor.

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

**Archivo**: `license.ts` (en esta carpeta). Copiar a `src/lib/license.ts`.

Sin cambios necesarios. Módulo puramente funcional, sin imports del proyecto.

---

### Tarea M4 — `scripts/generate-license.ts`

| Campo | Valor |
|-------|-------|
| **Archivo** | `scripts/generate-license.ts` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~70 líneas) |
| **Dependencias** | M2 |

**Archivo**: `generate-license.ts` (en esta carpeta). Copiar a `scripts/generate-license.ts`.

Sin cambios. Script independiente, solo Node.js y crypto. Crear directorio `scripts/` si no existe.

---

### Tarea M5a — Página `/license`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/license/page.tsx` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Medio (~100 líneas) |
| **Dependencias** | M1, M3 |

**Archivo**: `license-page.tsx` (en esta carpeta). Copiar a `src/app/license/page.tsx`.

**Único cambio requerido**: en el badge del logo, cambiar `<span>AS</span>` por `<span>MS</span>` (línea 83 del archivo, marcado con comentario `CAMBIAR`).

---

### Tarea M5b — API Route `/api/license/activate`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/api/license/activate/route.ts` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Bajo-Medio (~50 líneas) |
| **Dependencias** | M1, M3, M2 |

**Archivo**: `activate-route.ts` (en esta carpeta). Copiar a `src/app/api/license/activate/route.ts`.

Sin cambios necesarios. Verificar que `supabaseAdmin` y `createClient` existen en sus respectivos paths (sí, existen en MedStock).

---

### Tarea M6 — License guard en `proxy.ts`

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/proxy.ts` (modificar) |
| **Riesgo** | **Alto** |
| **Esfuerzo** | Medio (~40 líneas) |
| **Dependencias** | M1, M3, M5a |

**Archivo de referencia**: `proxy-reference.ts` (en esta carpeta). Muestra el license guard completo ya implementado en AutoStock.

**Pasos exactos sobre `src/proxy.ts` de MedStock:**

1. Después de la línea `const { pathname } = request.nextUrl;`, copiar el bloque `LICENSE GUARD` desde `proxy-reference.ts`.
2. En el bloque de auth `if (!user && !isLoginPage)`, agregar `&& !isLicenseRoute` para que usuarios no autenticados puedan acceder a `/license`.
3. Agregar `"/admin/licenses": ["admin"]` al mapa `access` para control de roles.

**Verificación**: Misma lógica que AutoStock, ya probada en producción.

---

### Tarea M7 — LicenseBanner

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/components/LicenseBanner.tsx` (nuevo) |
| **Riesgo** | Bajo |
| **Esfuerzo** | Bajo (~25 líneas) |
| **Dependencias** | M1 |

**Archivo**: `LicenseBanner.tsx` (en esta carpeta). Copiar a `src/components/LicenseBanner.tsx`.

Sin cambios necesarios. Los colores del banner (ámbar) son independientes del sidebar.

---

### Tarea M8 — Admin License Management

| Campo | Valor |
|-------|-------|
| **Archivo** | `src/app/(dashboard)/admin/licenses/page.tsx` (nuevo) |
| **Riesgo** | Medio |
| **Esfuerzo** | Medio (~200 líneas) |
| **Dependencias** | M1, M3 |

**Archivos**:
- `admin-licenses-page.tsx` (en esta carpeta) → `src/app/(dashboard)/admin/licenses/page.tsx`
- `admin-generate-route.ts` (en esta carpeta) → `src/app/api/admin/licenses/generate/route.ts`

Sin cambios necesarios.

**Además**:
- Agregar `"/admin/licenses": ["admin"]` al mapa `access` en `proxy.ts`.
- En `Sidebar.tsx`, agregar link "Licencias" solo en dev (mismo patrón que AutoStock: `...(process.env.NODE_ENV === "development" ? [{...}] : [])`).

---

## 4. Resumen de Archivos

| # | Archivo destino | Acción | Archivo en carpeta |
|---|-----------------|--------|-------------------|
| M1 | (SQL Editor) | Crear tabla | `create-aut_licenses.sql` |
| M2 | `.env.local` | Modificar | — (agregar LICENSE_SECRET) |
| M3 | `src/lib/license.ts` | Crear | `license.ts` |
| M4 | `scripts/generate-license.ts` | Crear | `generate-license.ts` |
| M5a | `src/app/license/page.tsx` | Crear | `license-page.tsx` (ajustar badge MS) |
| M5b | `src/app/api/license/activate/route.ts` | Crear | `activate-route.ts` |
| M6 | `src/proxy.ts` | Modificar | `proxy-reference.ts` (referencia) |
| M7 | `src/components/LicenseBanner.tsx` | Crear | `LicenseBanner.tsx` |
| M8a | `src/app/(dashboard)/admin/licenses/page.tsx` | Crear | `admin-licenses-page.tsx` |
| M8b | `src/app/api/admin/licenses/generate/route.ts` | Crear | `admin-generate-route.ts` |
| M8c | `src/components/Sidebar.tsx` | Modificar | — (agregar link) |
| — | `src/app/(dashboard)/layout.tsx` | Modificar | — (agregar LicenseBanner) |

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
