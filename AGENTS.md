<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack
- Next.js 16.2.6, React 19.2.4, Tailwind CSS v4, Supabase (RLS disabled), lucide-react icons
- No auth — RLS disabled on all tables, direct client-side Supabase queries

## Palette & Conventions
- `bg-white text-slate-900 placeholder:text-slate-400` on all inputs (dark mode fix)
- Tailwind v4 uses OKLCH — amber-600 is lighter than v3 (use blue-600 for strong contrast)
- Cards: `bg-white rounded-xl shadow-sm border border-slate-100`
- Buttons: `bg-blue-600 hover:bg-blue-700 text-white` for accent actions

## Roles
- admin, vendedor, comprador
