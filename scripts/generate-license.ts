import { createHmac } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf-8");
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    vars[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const SECRET = env.LICENSE_SECRET || process.env.LICENSE_SECRET || "dev_license_secret_insecure";

function generateKey(expiresAt: Date) {
  const yy = String(expiresAt.getUTCFullYear()).slice(2);
  const mm = String(expiresAt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(expiresAt.getUTCDate()).padStart(2, "0");
  const rawDate = yy + mm + dd;

  const hmac = createHmac("sha256", SECRET)
    .update(rawDate)
    .digest("hex")
    .substring(0, 10)
    .toUpperCase();

  const full = rawDate + hmac;
  const groups: string[] = [];
  for (let i = 0; i < full.length; i += 4) {
    groups.push(full.substring(i, i + 4));
  }

  return {
    key: groups.join("-"),
    expires_at: expiresAt.toISOString().split("T")[0],
  };
}

function parseCli() {
  const args = process.argv.slice(2);

  if (args.includes("--test")) {
    const thirtyDays = new Date();
    thirtyDays.setUTCDate(thirtyDays.getUTCDate() + 30);
    return generateKey(thirtyDays);
  }

  const expiresIdx = args.indexOf("--expires");
  if (expiresIdx === -1 || !args[expiresIdx + 1]) {
    console.error("Uso: npx tsx scripts/generate-license.ts --expires YYYY-MM-DD");
    console.error("      npx tsx scripts/generate-license.ts --test");
    process.exit(1);
  }

  const expiresAt = new Date(args[expiresIdx + 1] + "T00:00:00Z");
  if (isNaN(expiresAt.getTime())) {
    console.error("ERROR: Fecha inválida. Use formato YYYY-MM-DD");
    process.exit(1);
  }

  return generateKey(expiresAt);
}

const result = parseCli();

console.log("");
console.log("╔══════════════════════════════════════╗");
console.log("║      LICENCIA GENERADA               ║");
console.log("╠══════════════════════════════════════╣");
console.log(`║ Clave:     ${result.key.padEnd(27)}║`);
console.log(`║ Expira:    ${result.expires_at.padEnd(27)}║`);
console.log("╚══════════════════════════════════════╝");
console.log("");
