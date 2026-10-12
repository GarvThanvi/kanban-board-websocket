import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src", "generated");
const dest = path.join(root, "dist", "generated");

fs.cpSync(src, dest, { recursive: true });
console.log("Copied generated prisma client into dist/generated");
