import { createClient } from "@supabase/supabase-js";
import { faker } from "@faker-js/faker";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(import.meta.dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Helpers ──
function slug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Static data ──

const MANUFACTURERS_DATA = [
  { name: "Bosch", country: "Alemania" },
  { name: "Denso", country: "Japón" },
  { name: "Delphi", country: "Reino Unido" },
  { name: "Magneti Marelli", country: "Italia" },
  { name: "Valeo", country: "Francia" },
  { name: "Continental", country: "Alemania" },
  { name: "Hella", country: "Alemania" },
  { name: "NGK", country: "Japón" },
  { name: "SKF", country: "Suecia" },
  { name: "TRW", country: "EE.UU." },
  { name: "Febi Bilstein", country: "Alemania" },
  { name: "Mann-Filter", country: "Alemania" },
  { name: "Dayco", country: "EE.UU." },
  { name: "Gates", country: "EE.UU." },
  { name: "KYB", country: "Japón" },
  { name: "Monroe", country: "Bélgica" },
  { name: "Brembo", country: "Italia" },
  { name: "Textar", country: "Alemania" },
  { name: "Sachs", country: "Alemania" },
  { name: "Mahle", country: "Alemania" },
];

const CATEGORIES_DATA = [
  { name: "Frenos", description: "Pastillas, discos, bombines y componentes del sistema de frenado" },
  { name: "Motor", description: "Partes internas y externas del motor" },
  { name: "Suspensión", description: "Amortiguadores, resortes, brazos y componentes de suspensión" },
  { name: "Dirección", description: "Cremalleras, terminales, bombas y componentes de dirección" },
  { name: "Eléctrico", description: "Alternadores, arranques, sensores y componentes eléctricos" },
  { name: "Transmisión", description: "Embragues, cajas, juntas homocinéticas y transmisión" },
  { name: "Escape", description: "Tubos, silenciadores, catalizadores y componentes de escape" },
  { name: "Refrigeración", description: "Radiadores, termostatos, mangueras y sistema de enfriamiento" },
  { name: "Filtros", description: "Filtros de aceite, aire, combustible y habitáculo" },
  { name: "Carrocería", description: "Faros, espejos, manijas y partes exteriores" },
  { name: "Sistema de Combustible", description: "Bombas de gasolina, inyectores y líneas de combustible" },
  { name: "Lubricantes y Fluidos", description: "Aceites, refrigerantes y líquidos hidráulicos" },
];

const VEHICLES_DATA = [
  { brand: "Toyota", model: "Corolla", years: [1990, 2025], engines: ["1.8L 2ZR-FE", "2.0L 3ZR-FE", "1.6L 1ZR-FE"] },
  { brand: "Toyota", model: "Hilux", years: [2000, 2025], engines: ["2.8L 1GD-FTV", "3.0L 5L-E", "2.5L 2KD-FTV"] },
  { brand: "Toyota", model: "Yaris", years: [2005, 2025], engines: ["1.5L 2NZ-FE", "1.3L 1NZ-FE", "1.5L 1NZ-FE"] },
  { brand: "Honda", model: "Civic", years: [1995, 2025], engines: ["1.8L R18A", "2.0L K20A", "1.6L D16"] },
  { brand: "Honda", model: "CR-V", years: [2000, 2025], engines: ["2.4L K24A", "2.0L R20A", "1.5L L15B"] },
  { brand: "Volkswagen", model: "Golf", years: [1995, 2025], engines: ["1.4L TSI", "2.0L TDI", "1.6L MPI"] },
  { brand: "Volkswagen", model: "Amarok", years: [2010, 2025], engines: ["2.0L TDI", "3.0L V6 TDI"] },
  { brand: "Volkswagen", model: "Jetta", years: [2000, 2025], engines: ["1.4L TSI", "2.0L TDI", "2.5L MPI"] },
  { brand: "Ford", model: "Ranger", years: [2005, 2025], engines: ["2.2L Duratorq", "3.2L Duratorq", "2.0L EcoBlue"] },
  { brand: "Ford", model: "Focus", years: [2000, 2025], engines: ["2.0L Duratec", "1.6L Sigma", "1.0L EcoBoost"] },
  { brand: "Ford", model: "Ecosport", years: [2010, 2025], engines: ["1.6L Sigma", "2.0L Duratec"] },
  { brand: "Chevrolet", model: "Onix", years: [2015, 2025], engines: ["1.4L L4", "1.0L Turbo"] },
  { brand: "Chevrolet", model: "Cruze", years: [2010, 2025], engines: ["1.4L Turbo", "1.8L Ecotec", "2.0L Diesel"] },
  { brand: "Chevrolet", model: "S10", years: [2005, 2025], engines: ["2.8L Duramax", "2.4L Ecotec"] },
  { brand: "Nissan", model: "Sentra", years: [2000, 2025], engines: ["1.8L MR18", "2.0L MR20", "1.6L GA16"] },
  { brand: "Nissan", model: "Frontier", years: [2005, 2025], engines: ["2.5L QR25", "3.0L V6", "2.8L Diesel"] },
  { brand: "Nissan", model: "Versa", years: [2010, 2025], engines: ["1.6L HR16", "1.8L MR18"] },
  { brand: "Hyundai", model: "Tucson", years: [2005, 2025], engines: ["2.0L G4GC", "2.4L G4KE", "1.6L T-GDI"] },
  { brand: "Hyundai", model: "Elantra", years: [2000, 2025], engines: ["1.8L G4NB", "2.0L G4NC", "1.6L G4FC"] },
  { brand: "Hyundai", model: "Santa Fe", years: [2005, 2025], engines: ["2.2L CRDi", "3.3L Lambda", "2.4L G4KE"] },
  { brand: "Kia", model: "Sportage", years: [2005, 2025], engines: ["2.0L G4GC", "2.4L G4KE", "1.6L T-GDI"] },
  { brand: "Kia", model: "Cerato", years: [2005, 2025], engines: ["1.6L G4FC", "2.0L G4NC"] },
  { brand: "Mazda", model: "3", years: [2005, 2025], engines: ["2.0L Skyactiv-G", "2.5L Skyactiv-G"] },
  { brand: "Mazda", model: "CX-5", years: [2015, 2025], engines: ["2.0L Skyactiv-G", "2.5L Skyactiv-G", "2.2L Skyactiv-D"] },
  { brand: "Suzuki", model: "Swift", years: [2005, 2025], engines: ["1.2L K12", "1.4L Boosterjet"] },
  { brand: "Suzuki", model: "Vitara", years: [2010, 2025], engines: ["1.4L Boosterjet", "1.6L M16A"] },
  { brand: "Mitsubishi", model: "L200", years: [2005, 2025], engines: ["2.4L 4D56", "2.5L 4D56", "2.4L MIVEC"] },
  { brand: "Peugeot", model: "208", years: [2010, 2025], engines: ["1.2L PureTech", "1.6L THP"] },
  { brand: "Renault", model: "Sandero", years: [2010, 2025], engines: ["1.2L TCe", "1.6L K4M"] },
  { brand: "Renault", model: "Duster", years: [2015, 2025], engines: ["1.6L K4M", "2.0L F4R", "1.3L TCe"] },
];

const SUPPLIER_CONTACTS = [
  { name: "Autorepuestos del Centro S.A.", city: "Buenos Aires" },
  { name: "Distribuidora González", city: "Córdoba" },
  { name: "Importadora López", city: "Rosario" },
  { name: "Repuestos Martínez", city: "Mendoza" },
  { name: "Suministros Automotrices Pérez", city: "La Plata" },
  { name: "Distribuidora Castillo", city: "San Miguel de Tucumán" },
  { name: "AutoPartes del Norte", city: "Salta" },
  { name: "Comercial Rodríguez", city: "Santa Fe" },
  { name: "Proveedora Sánchez", city: "Mar del Plata" },
  { name: "Mayorista de Autopartes Ramírez", city: "Quilmes" },
];

// ── Main ──

async function main() {
  console.log("🚀 Iniciando seed de AutoStock...\n");

  // 0. Clean existing seed data (FK-safe order — reverse dependency)
  console.log("🧹 Limpiando datos existentes...");
  for (const table of [
    "aut_sale_items",
    "aut_sale_orders",
    "aut_purchase_items",
    "aut_purchase_orders",
    "aut_movements",
    "aut_part_vehicles",
    "aut_parts",
    "aut_vehicles",
    "aut_locations",
    "aut_categories",
    "aut_suppliers",
    "aut_manufacturers",
  ]) {
    await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
  console.log("  ✓ Datos limpiados\n");

  // 1. Profiles — preserve existing admin
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "admin@autostock.com")
    .single();

  const adminId = existingProfile?.id;
  console.log(`  ✓ Admin existente: ${adminId}`);

  const profilesToCreate = [
    { email: "vendedor1@autostock.com", role: "vendedor" as const, password: "AutoStock2026!" },
    { email: "vendedor2@autostock.com", role: "vendedor" as const, password: "AutoStock2026!" },
    { email: "comprador1@autostock.com", role: "comprador" as const, password: "AutoStock2026!" },
    { email: "comprador2@autostock.com", role: "comprador" as const, password: "AutoStock2026!" },
  ];

  const profileIds: string[] = [adminId!];
  let createdCount = 0;

  for (const p of profilesToCreate) {
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: p.email,
      password: p.password,
      email_confirm: true,
      user_metadata: { role: p.role },
    });

    if (createError) {
      console.warn(`  ⚠ No se pudo crear ${p.email}: ${createError.message}`);
      continue;
    }

    const userId = userData!.user.id;
    await supabase.from("profiles").update({ role: p.role }).eq("id", userId);
    profileIds.push(userId);
    createdCount++;
  }
  console.log(`  ✓ ${createdCount} perfiles adicionales creados\n`);

  // 2. Manufacturers
  const { data: manufacturers } = await supabase
    .from("aut_manufacturers")
    .insert(MANUFACTURERS_DATA.map((m) => ({ name: m.name, country: m.country })))
    .select("id, name");
  const manufacturerMap = new Map(manufacturers!.map((m: any) => [m.name, m.id]));
  console.log(`  ✓ ${manufacturers!.length} fabricantes\n`);

  // 3. Suppliers
  const suppliersData = SUPPLIER_CONTACTS.map((s) => ({
    name: s.name,
    contact_person: faker.person.fullName(),
    phone: faker.phone.number({ style: "international" }),
    email: faker.internet.email({ provider: "gmail.com" }).toLowerCase(),
    address: `${faker.location.streetAddress()}, ${s.city}, Argentina`,
  }));
  const { data: suppliers } = await supabase
    .from("aut_suppliers")
    .insert(suppliersData)
    .select("id, name");
  const supplierIds = suppliers!.map((s: any) => s.id);
  console.log(`  ✓ ${suppliers!.length} proveedores\n`);

  // 4. Categories
  const { data: categories } = await supabase
    .from("aut_categories")
    .insert(CATEGORIES_DATA.map((c) => ({ name: c.name, slug: slug(c.name), description: c.description })))
    .select("id, name");
  const categoryMap = new Map(categories!.map((c: any) => [c.name, c.id]));
  console.log(`  ✓ ${categories!.length} categorías\n`);

  // 5. Locations — 4 aisles × 3 racks × 2 shelves = 24 locations
  const locationsData: any[] = [];
  const aisles = ["A", "B", "C", "D"];
  for (const aisle of aisles) {
    for (let rack = 1; rack <= 3; rack++) {
      for (let shelf = 1; shelf <= 2; shelf++) {
        const code = `${aisle}-${String(rack).padStart(2, "0")}-${String(shelf).padStart(2, "0")}`;
        locationsData.push({
          code,
          aisle,
          rack: String(rack),
          shelf: String(shelf),
          description: `Pasillo ${aisle}, Rack ${rack}, Estante ${shelf}`,
        });
      }
    }
  }
  const { data: locations } = await supabase
    .from("aut_locations")
    .insert(locationsData)
    .select("id, code");
  const locationIds = locations!.map((l: any) => l.id);
  console.log(`  ✓ ${locations!.length} ubicaciones\n`);

  // 6. Vehicles
  const vehiclesData: any[] = [];
  for (const v of VEHICLES_DATA) {
    for (const engine of v.engines) {
      const yearStart = faker.number.int({ min: v.years[0], max: Math.min(v.years[0] + 10, v.years[1]) });
      const yearEnd = yearStart + 3 <= v.years[1]
        ? (faker.helpers.maybe(() => faker.number.int({ min: yearStart + 3, max: v.years[1] }), { probability: 0.6 }) ?? null)
        : null;
      vehiclesData.push({
        brand: v.brand,
        model: v.model,
        year_start: yearStart,
        year_end: yearEnd,
        engine,
        notes: faker.helpers.maybe(() => `Variante ${engine.replace(/\s/g, "")}`) ?? null,
      });
    }
  }
  const { data: vehicles } = await supabase
    .from("aut_vehicles")
    .insert(vehiclesData)
    .select("id, brand, model, engine");
  const vehicleIds = vehicles!.map((v: any) => v.id);
  console.log(`  ✓ ${vehicles!.length} vehículos\n`);

  // 7. Parts — 120-150 repuestos realistas
  const CATEGORY_NAMES = CATEGORIES_DATA.map((c) => c.name);
  const PART_TEMPLATES: Record<string, { prefix: string; templates: string[]; unit: string }> = {
    Frenos: {
      prefix: "FR",
      templates: [
        "Pastilla de freno {material} para {brand} {model}",
        "Disco de freno {type} {diam}mm",
        "Bombín de freno trasero",
        "Cilindro maestro de freno",
        "Kit de zapatas traseras",
        "Sensor ABS delantero",
        "Manguera de freno de goma",
        "Líquido de frenos DOT {dot} 1L",
      ],
      unit: "Unidad",
    },
    Motor: {
      prefix: "MO",
      templates: [
        "Bujía de precalentamiento {brand}",
        "Sensor de oxígeno universal",
        "Correa de distribución {dientes} dientes",
        "Tensador de correa de distribución",
        "Bomba de aceite {type}",
        "Junta de culata {material}",
        "Kit de reparación de motor",
        "Válvula PCV",
      ],
      unit: "Unidad",
    },
    Suspensión: {
      prefix: "SU",
      templates: [
        "Amortiguador delantero {brand}",
        "Amortiguador trasero {brand}",
        "Resorte helicoidal {type}",
        "Brazo de suspensión inferior",
        "Barra estabilizadora {diam}mm",
        "Buje de suspensión {material}",
        "Fuelles de amortiguador",
        "Kit de suspensión completa",
      ],
      unit: "Unidad",
    },
    Dirección: {
      prefix: "DI",
      templates: [
        "Terminal de dirección {type}",
        "Cremallera de dirección {brand}",
        "Bomba de dirección hidráulica",
        "Manguera de dirección {material}",
        "Kit de reparación de dirección",
        "Junta homocinética {type}",
        "Fuelles de junta homocinética",
      ],
      unit: "Unidad",
    },
    Eléctrico: {
      prefix: "EL",
      templates: [
        "Alternador {amps}A para {brand} {model}",
        "Motor de arranque {kw}kW",
        "Sensor de temperatura {type}",
        "Sensor MAP universal",
        "Bobina de encendido {cyl}cil",
        "Cable de bujía set {pcs} pzs",
        "Batería {ah}Ah {type}",
        "Fusible {amps}A tipo cuchilla",
        "Relé multifunción 12V",
      ],
      unit: "Unidad",
    },
    Transmisión: {
      prefix: "TR",
      templates: [
        "Kit de embrague {brand}",
        "Disco de embrague {diam}mm",
        "Volante bimasa {brand}",
        "Soporte de transmisión {material}",
        "Aceite de transmisión {type} 1L",
        "Junta homocinética completa",
        "Selector de cambios {brand}",
      ],
      unit: "Unidad",
    },
    Escape: {
      prefix: "ES",
      templates: [
        "Tubo de escape {diam}mm {type}",
        "Silenciador trasero universal",
        "Catalizador universal {ce}ce",
        "Sonda lambda universal",
        "Abrazadera de escape {diam}mm",
        "Junta de escape {material}",
        "Kit de montaje de escape",
      ],
      unit: "Unidad",
    },
    Refrigeración: {
      prefix: "RF",
      templates: [
        "Radiador {type} para {brand} {model}",
        "Termostato {temp}°C",
        "Manguera superior {diam}mm",
        "Manguera inferior {diam}mm",
        "Ventilador de radiador {diam}mm",
        "Depósito de expansión {cap}L",
        "Líquido refrigerante concentrado 1L",
      ],
      unit: "Unidad",
    },
    Filtros: {
      prefix: "FI",
      templates: [
        "Filtro de aceite {brand}",
        "Filtro de aire {type}",
        "Filtro de combustible {brand}",
        "Filtro de habitáculo carbón activado",
        "Filtro de aceite {brand} premium",
      ],
      unit: "Unidad",
    },
    Carrocería: {
      prefix: "CA",
      templates: [
        "Faros delanteros {type} {brand}",
        "Faros traseros {type} {brand}",
        "Espejo lateral {type}",
        "Manija de puerta exterior",
        "Limpiaparabrisas set {pcs}pzs {size}",
        "Bombilla LED {type} 12V",
      ],
      unit: "Unidad",
    },
    "Sistema de Combustible": {
      prefix: "SC",
      templates: [
        "Bomba de combustible {type} {brand}",
        "Inyector de combustible {brand}",
        "Kit de inyectores {pcs}pzs",
        "Regulador de presión {bar}bar",
        "Línea de combustible {material} {diam}mm",
      ],
      unit: "Unidad",
    },
    "Lubricantes y Fluidos": {
      prefix: "LU",
      templates: [
        "Aceite de motor {grade} 5L",
        "Aceite de motor {grade} 1L",
        "Líquido de frenos DOT {dot} 1L",
        "Aceite de transmisión {type} 1L",
        "Refrigerante concentrado verde 1L",
        "Refrigerante concentrado rojo 1L",
      ],
      unit: "Unidad",
    },
  };

  const partBrands = ["Bosch", "Denso", "Delphi", "Valeo", "Febi", "NGK", "SKF", "TRW", "Hella", "Mann"];

  const partsData: any[] = [];
  let partCounter = 1;

  for (const catName of CATEGORY_NAMES) {
    const catId = categoryMap.get(catName);
    const catTemplate = PART_TEMPLATES[catName];
    if (!catId || !catTemplate) continue;

    const numParts = faker.number.int({ min: 8, max: 14 });

    for (let i = 0; i < numParts; i++) {
      const tpl = faker.helpers.arrayElement(catTemplate.templates);
      const brand = faker.helpers.arrayElement(partBrands);
      const vehicle = faker.helpers.arrayElement(VEHICLES_DATA);
      const partNumber = `${catTemplate.prefix}-${String(partCounter).padStart(5, "0")}`;
      partCounter++;

      const replacements: Record<string, () => string> = {
        brand: () => brand,
        model: () => vehicle.model,
        material: () => faker.helpers.arrayElement(["caucho", "silicón", "acero", "aluminio"]),
        type: () => faker.helpers.arrayElement(["estándar", "premium", "económico", "reforzado", "ventilado"]),
        diam: () => String(faker.helpers.arrayElement([256, 280, 300, 320, 340, 355])),
        amps: () => String(faker.helpers.arrayElement([70, 80, 90, 100, 120, 140])),
        kw: () => String(faker.helpers.arrayElement([1.0, 1.2, 1.4, 1.6, 1.8, 2.0])),
        ah: () => String(faker.helpers.arrayElement([45, 55, 60, 65, 70, 75, 80, 100])),
        cyl: () => String(faker.helpers.arrayElement([4, 6])),
        pcs: () => String(faker.helpers.arrayElement([2, 4, 6])),
        dientes: () => String(faker.helpers.arrayElement([114, 120, 126, 130, 134, 140, 148])),
        dot: () => faker.helpers.arrayElement(["3", "4", "5.1"]),
        temp: () => String(faker.helpers.arrayElement([82, 85, 88, 90, 92, 95])),
        bar: () => String(faker.helpers.arrayElement([3.0, 3.5, 4.0, 4.5])),
        grade: () => faker.helpers.arrayElement(["5W-30", "10W-40", "15W-40", "20W-50", "5W-40"]),
        ce: () => String(faker.helpers.arrayElement([400, 500, 600, 700, 800])),
        cap: () => String(faker.helpers.arrayElement([1.5, 2.0, 2.5, 3.0])),
        size: () => faker.helpers.arrayElement(["26+14", "28+16", "30+18"]),
      };

      const description = tpl.replace(/\{(\w+)\}/g, (_, key) => {
        const fn = replacements[key];
        return fn ? fn() : key;
      });

      const minS = faker.number.int({ min: 2, max: 10 });
      const maxS = minS + faker.number.int({ min: 20, max: 100 });
      const actualS = faker.number.int({ min: 0, max: maxS + 20 });

      partsData.push({
        part_number: partNumber,
        oem_number: faker.helpers.maybe(() => faker.string.alphanumeric({ length: 10, casing: "upper" })) ?? null,
        description,
        manufacturer_id: faker.helpers.arrayElement([...manufacturerMap.values()]),
        category_id: catId,
        location_id: faker.helpers.arrayElement(locationIds),
        supplier_id: faker.helpers.arrayElement(supplierIds),
        stock_actual: actualS,
        stock_min: minS,
        stock_max: maxS,
        unit_type: catTemplate.unit,
        weight_kg: faker.number.float({ min: 0.1, max: 15, fractionDigits: 2 }),
        length_cm: faker.number.float({ min: 5, max: 100, fractionDigits: 1 }),
        width_cm: faker.number.float({ min: 3, max: 60, fractionDigits: 1 }),
        height_cm: faker.number.float({ min: 2, max: 50, fractionDigits: 1 }),
        lot_number: faker.helpers.maybe(() => `LOT-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`) ?? null,
        expiry_date: faker.helpers.maybe(() => faker.date.future({ years: 2 }).toISOString().split("T")[0]) ?? null,
        notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
        barcode: faker.helpers.maybe(() => faker.string.numeric({ length: 13 })) ?? null,
        is_active: true,
      });
    }
  }

  // Batch insert parts
  const BATCH_SIZE = 50;
  let allParts: any[] = [];
  for (let i = 0; i < partsData.length; i += BATCH_SIZE) {
    const batch = partsData.slice(i, i + BATCH_SIZE);
    const { data: inserted } = await supabase.from("aut_parts").insert(batch).select("id, part_number");
    allParts.push(...(inserted ?? []));
  }
  console.log(`  ✓ ${allParts.length} repuestos\n`);

  // 8. Part-Vehicles compatibility (M:N)
  const partVehiclePairs = new Set<string>();
  const partVehicleData: any[] = [];

  for (const part of allParts) {
    const numVehicles = faker.number.int({ min: 1, max: 4 });
    const shuffled = faker.helpers.shuffle(vehicleIds);
    for (let i = 0; i < numVehicles && i < shuffled.length; i++) {
      const key = `${part.id}:${shuffled[i]}`;
      if (!partVehiclePairs.has(key)) {
        partVehiclePairs.add(key);
        partVehicleData.push({ part_id: part.id, vehicle_id: shuffled[i] });
      }
    }
  }

  for (let i = 0; i < partVehicleData.length; i += BATCH_SIZE) {
    await supabase.from("aut_part_vehicles").insert(partVehicleData.slice(i, i + BATCH_SIZE));
  }
  console.log(`  ✓ ${partVehicleData.length} compatibilidades vehículo-repuesto\n`);

  // 9. Movements (entrada/salida/ajuste) — historical
  const movementTypes = ["entrada", "salida", "ajuste"] as const;
  const movementsData: any[] = [];

  for (const part of allParts) {
    const numMovements = faker.number.int({ min: 1, max: 4 });
    for (let m = 0; m < numMovements; m++) {
      const type = faker.helpers.arrayElement(movementTypes);
      const qty = type === "entrada"
        ? faker.number.int({ min: 5, max: 50 })
        : type === "salida"
        ? faker.number.int({ min: 1, max: 20 })
        : faker.number.int({ min: -10, max: 10 });

      if (qty === 0) continue;

      movementsData.push({
        part_id: part.id,
        type,
        quantity: qty,
        reference_type: faker.helpers.arrayElement(["purchase_order", "sale_order", null]),
        notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
        created_by: faker.helpers.arrayElement(profileIds),
        created_at: faker.date.between({ from: "2025-01-01", to: "2026-07-25" }).toISOString(),
      });
    }
  }

  for (let i = 0; i < movementsData.length; i += BATCH_SIZE) {
    await supabase.from("aut_movements").insert(movementsData.slice(i, i + BATCH_SIZE));
  }
  console.log(`  ✓ ${movementsData.length} movimientos de stock\n`);

  // 10. Purchase Orders + Items
  const poStatuses = ["pendiente", "enviada", "recibida", "cancelada"] as const;
  const purchaseOrdersData: any[] = [];
  const purchaseItemsData: any[] = [];

  for (let po = 0; po < 25; po++) {
    const status = faker.helpers.arrayElement(poStatuses);
    const supplierId = faker.helpers.arrayElement(supplierIds);
    const poNumber = `OC-${String(po + 1).padStart(5, "0")}`;

    const { data: poInserted } = await supabase
      .from("aut_purchase_orders")
      .insert({
        order_number: poNumber,
        supplier_id: supplierId,
        status,
        notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
        created_by: faker.helpers.arrayElement(profileIds),
        received_at: status === "recibida"
          ? faker.date.between({ from: "2025-06-01", to: "2026-07-25" }).toISOString()
          : null,
        created_at: faker.date.between({ from: "2025-06-01", to: "2026-07-25" }).toISOString(),
      })
      .select("id");

    const poId = poInserted![0].id;
    purchaseOrdersData.push(poInserted![0]);

    const numItems = faker.number.int({ min: 2, max: 5 });
    const selectedParts = faker.helpers.shuffle(allParts).slice(0, numItems);
    for (const part of selectedParts) {
      const ordered = faker.number.int({ min: 5, max: 100 });
      purchaseItemsData.push({
        purchase_order_id: poId,
        part_id: part.id,
        quantity_ordered: ordered,
        quantity_received: status === "recibida" ? ordered : status === "enviada" ? faker.number.int({ min: 0, max: ordered }) : 0,
        unit_cost: faker.number.float({ min: 5, max: 500, fractionDigits: 2 }),
      });
    }
  }

  for (let i = 0; i < purchaseItemsData.length; i += BATCH_SIZE) {
    await supabase.from("aut_purchase_items").insert(purchaseItemsData.slice(i, i + BATCH_SIZE));
  }
  console.log(`  ✓ ${purchaseOrdersData.length} órdenes de compra con ${purchaseItemsData.length} items\n`);

  // 11. Sale Orders + Items
  const soStatuses = ["pendiente", "reservado", "despachado", "entregado", "cancelado"] as const;

  for (let so = 0; so < 35; so++) {
    const status = faker.helpers.arrayElement(soStatuses);
    const soNumber = `OV-${String(so + 1).padStart(5, "0")}`;

    const { data: soInserted } = await supabase
      .from("aut_sale_orders")
      .insert({
        order_number: soNumber,
        client_name: faker.person.fullName(),
        client_document: faker.helpers.arrayElement([
          `${faker.number.int({ min: 10000000, max: 99999999 })}`,
          `${faker.number.int({ min: 20, max: 99 })}-${faker.number.int({ min: 1000000, max: 9999999 })}-${faker.number.int({ min: 0, max: 9 })}`,
        ]),
        client_phone: faker.phone.number({ style: "international" }),
        status,
        notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null,
        created_by: faker.helpers.arrayElement(profileIds),
        delivered_at: status === "entregado"
          ? faker.date.between({ from: "2025-07-01", to: "2026-07-25" }).toISOString()
          : null,
        created_at: faker.date.between({ from: "2025-07-01", to: "2026-07-25" }).toISOString(),
      })
      .select("id");

    const soId = soInserted![0].id;

    const numItems = faker.number.int({ min: 1, max: 4 });
    const selectedParts = faker.helpers.shuffle(allParts).slice(0, numItems);
    const saleItems: any[] = selectedParts.map((part) => ({
      sale_order_id: soId,
      part_id: part.id,
      quantity: faker.number.int({ min: 1, max: 10 }),
      unit_price: faker.number.float({ min: 10, max: 800, fractionDigits: 2 }),
    }));

    await supabase.from("aut_sale_items").insert(saleItems);
  }
  console.log(`  ✓ 35 órdenes de venta generadas\n`);

  // ── Summary ──
  console.log("═══════════════════════════════════════");
  console.log("  RESUME DEL SEED COMPLETADO");
  console.log("═══════════════════════════════════════");
  console.log(`  Profiles:         ${profileIds.length} (1 admin + ${profilesToCreate.length})`);
  console.log(`  Manufacturers:    ${manufacturers!.length}`);
  console.log(`  Suppliers:        ${suppliers!.length}`);
  console.log(`  Categories:       ${categories!.length}`);
  console.log(`  Locations:        ${locations!.length}`);
  console.log(`  Vehicles:         ${vehicles!.length}`);
  console.log(`  Parts:            ${allParts.length}`);
  console.log(`  Part-Vehicles:    ${partVehicleData.length}`);
  console.log(`  Movements:        ${movementsData.length}`);
  console.log(`  Purchase Orders:  ${purchaseOrdersData.length} (${purchaseItemsData.length} items)`);
  console.log(`  Sale Orders:      35`);
  console.log("═══════════════════════════════════════\n");
  console.log("✅ Seed completado exitosamente!");
}

main().catch((err) => {
  console.error("❌ Error durante el seed:", err);
  process.exit(1);
});
