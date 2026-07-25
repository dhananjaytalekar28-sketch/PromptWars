import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const BUILD_DIR = path.resolve(".next");
const APP_DIR = path.join(BUILD_DIR, "server", "app");
const STATIC_DIR = path.join(BUILD_DIR, "static");

const SHARED_BUDGET_BYTES = 422_134;
const ROUTE_BUDGET_BYTES = {
  "/": 450_962,
  "/caregiver": 458_009,
  "/intervene": 455_705,
  "/learn": 458_212,
  "/person": 453_166,
  "/safety": 453_455,
  "/scripts": 457_192,
};

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function parseClientManifest(file) {
  const source = readFileSync(file, "utf8");
  const assignment = source.lastIndexOf(" = ");
  const terminator = source.lastIndexOf(";");
  if (assignment < 0 || terminator <= assignment) {
    throw new Error(`Cannot parse client reference manifest: ${path.relative(".", file)}`);
  }
  return JSON.parse(source.slice(assignment + 3, terminator));
}

function bytesFor(files) {
  return [...new Set(files)].reduce((total, file) => {
    const relative = file.replace(/^\/_next\//, "");
    const absolute = path.join(BUILD_DIR, relative);
    if (!existsSync(absolute)) {
      throw new Error(`Manifest references missing client file: ${relative}`);
    }
    return total + statSync(absolute).size;
  }, 0);
}

function routeFromManifest(file) {
  const relative = path.relative(APP_DIR, file).replaceAll("\\", "/");
  const suffix = "/page_client-reference-manifest.js";
  if (relative === "page_client-reference-manifest.js") return "/";
  return `/${relative.slice(0, -suffix.length)}`;
}

if (!existsSync(APP_DIR) || !existsSync(STATIC_DIR)) {
  throw new Error("Missing .next production output; run `npm run build` first.");
}

const clientManifests = walk(APP_DIR).filter((file) =>
  file.endsWith("page_client-reference-manifest.js"),
);
if (clientManifests.length === 0) {
  throw new Error("No App Router client reference manifests found.");
}

const forbiddenPatterns = [
  "@google/genai",
  "google/genai",
  "node_modules_@google_genai",
  "GoogleGenAI",
];
const clientOutputFiles = [
  ...walk(STATIC_DIR).filter((file) => /\.(?:js|css|map)$/.test(file)),
  ...clientManifests,
];
for (const file of clientOutputFiles) {
  const content = readFileSync(file, "utf8");
  const match = forbiddenPatterns.find((pattern) => content.includes(pattern));
  if (match) {
    throw new Error(
      `Server-only Gemini SDK marker "${match}" found in client output: ${path.relative(".", file)}`,
    );
  }
}

const routeSizes = new Map();
let sharedBytes;
for (const file of clientManifests) {
  const route = routeFromManifest(file);
  const manifest = parseClientManifest(file);
  const entryFiles = Object.values(manifest.entryJSFiles ?? {}).flat();
  if (route === "/") {
    const layoutEntry = Object.entries(manifest.entryJSFiles ?? {}).find(([key]) =>
      key.replaceAll("\\", "/").endsWith("/src/app/layout"),
    );
    if (!layoutEntry) throw new Error("Root client manifest has no app layout entry.");
    sharedBytes = bytesFor(layoutEntry[1]);
  }
  if (route in ROUTE_BUDGET_BYTES) {
    routeSizes.set(route, bytesFor(entryFiles));
  }
}

if (sharedBytes === undefined) throw new Error("Could not measure shared layout client JS.");
if (sharedBytes > SHARED_BUDGET_BYTES) {
  throw new Error(`Shared client JS is ${sharedBytes} bytes; budget is ${SHARED_BUDGET_BYTES}.`);
}

for (const [route, budget] of Object.entries(ROUTE_BUDGET_BYTES)) {
  const actual = routeSizes.get(route);
  if (actual === undefined) throw new Error(`Missing client manifest for budgeted route ${route}.`);
  if (actual > budget) {
    throw new Error(`Route ${route} client JS is ${actual} bytes; budget is ${budget}.`);
  }
}

console.log(`Bundle budget passed: shared ${sharedBytes}/${SHARED_BUDGET_BYTES} bytes.`);
for (const [route, budget] of Object.entries(ROUTE_BUDGET_BYTES)) {
  console.log(`  ${route}: ${routeSizes.get(route)}/${budget} bytes`);
}
console.log(`Gemini SDK absent from ${clientOutputFiles.length} client output files.`);
