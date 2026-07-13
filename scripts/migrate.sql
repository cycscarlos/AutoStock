-- AutoStock — Esquema completo de base de datos
-- Ejecutar una sola vez al crear el proyecto Supabase

-- 1. Tipos ENUM
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'vendedor', 'comprador');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role DEFAULT 'vendedor',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'vendedor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS policies (disabled effectively — public access)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.profiles;
CREATE POLICY "public_access" ON public.profiles FOR ALL USING (true);

-- 5. Fabricantes
CREATE TABLE IF NOT EXISTS public.aut_manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_manufacturers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_manufacturers;
CREATE POLICY "public_access" ON public.aut_manufacturers FOR ALL USING (true);

-- 6. Proveedores
CREATE TABLE IF NOT EXISTS public.aut_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_suppliers;
CREATE POLICY "public_access" ON public.aut_suppliers FOR ALL USING (true);

-- 7. Categorías
CREATE TABLE IF NOT EXISTS public.aut_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_categories;
CREATE POLICY "public_access" ON public.aut_categories FOR ALL USING (true);

-- 8. Ubicaciones
CREATE TABLE IF NOT EXISTS public.aut_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  aisle TEXT NOT NULL,
  rack TEXT NOT NULL,
  shelf TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_locations;
CREATE POLICY "public_access" ON public.aut_locations FOR ALL USING (true);

-- 9. Vehículos
CREATE TABLE IF NOT EXISTS public.aut_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_start INTEGER,
  year_end INTEGER,
  engine TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand, model, engine)
);
ALTER TABLE public.aut_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_vehicles;
CREATE POLICY "public_access" ON public.aut_vehicles FOR ALL USING (true);

-- 10. SKUs / Repuestos
CREATE TABLE IF NOT EXISTS public.aut_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT UNIQUE NOT NULL,
  oem_number TEXT,
  description TEXT NOT NULL,
  manufacturer_id UUID REFERENCES public.aut_manufacturers(id),
  category_id UUID REFERENCES public.aut_categories(id),
  location_id UUID REFERENCES public.aut_locations(id),
  supplier_id UUID REFERENCES public.aut_suppliers(id),
  stock_actual INTEGER DEFAULT 0,
  stock_min INTEGER DEFAULT 5,
  stock_max INTEGER DEFAULT 50,
  unit_type TEXT DEFAULT 'Unidad',
  weight_kg NUMERIC(10,2),
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  lot_number TEXT,
  expiry_date DATE,
  notes TEXT,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_parts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_parts;
CREATE POLICY "public_access" ON public.aut_parts FOR ALL USING (true);

-- 11. Vehículos compatibles por repuesto (M:N)
CREATE TABLE IF NOT EXISTS public.aut_part_vehicles (
  part_id UUID REFERENCES public.aut_parts(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.aut_vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (part_id, vehicle_id)
);
ALTER TABLE public.aut_part_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_part_vehicles;
CREATE POLICY "public_access" ON public.aut_part_vehicles FOR ALL USING (true);

-- 12. Movimientos
CREATE TABLE IF NOT EXISTS public.aut_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID REFERENCES public.aut_parts(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_movements;
CREATE POLICY "public_access" ON public.aut_movements FOR ALL USING (true);

-- 13. Órdenes de Compra
CREATE TABLE IF NOT EXISTS public.aut_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES public.aut_suppliers(id),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'enviada', 'recibida', 'cancelada')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_purchase_orders;
CREATE POLICY "public_access" ON public.aut_purchase_orders FOR ALL USING (true);

-- 14. Items de orden de compra
CREATE TABLE IF NOT EXISTS public.aut_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES public.aut_purchase_orders(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.aut_parts(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_purchase_items;
CREATE POLICY "public_access" ON public.aut_purchase_items FOR ALL USING (true);

-- 15. Órdenes de Venta
CREATE TABLE IF NOT EXISTS public.aut_sale_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_document TEXT,
  client_phone TEXT,
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'reservado', 'despachado', 'entregado', 'cancelado')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_sale_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_sale_orders;
CREATE POLICY "public_access" ON public.aut_sale_orders FOR ALL USING (true);

-- 16. Items de orden de venta
CREATE TABLE IF NOT EXISTS public.aut_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_order_id UUID REFERENCES public.aut_sale_orders(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.aut_parts(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.aut_sale_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_access" ON public.aut_sale_items;
CREATE POLICY "public_access" ON public.aut_sale_items FOR ALL USING (true);

-- Hecho
SELECT 'Migración AutoStock completada exitosamente' AS resultado;
