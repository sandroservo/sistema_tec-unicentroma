// server-only: usa node:fs/crypto — nunca importar em componente client.
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";

// Lazy: evita chamar process.cwd() no topo do módulo (que faz o Turbopack tracear o projeto todo).
function baseDir(): string {
  return process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");
}

/** Resolve relPath dentro do BASE_DIR, bloqueando path traversal. */
function resolveSafe(relPath: string): string {
  const base = path.resolve(baseDir());
  const full = path.resolve(base, relPath);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error("Caminho inválido");
  }
  return full;
}

/** Grava buffer com nome único em subpasta ano/mês. Retorna path relativo ao BASE_DIR. */
export async function saveFile(
  buffer: Buffer,
  originalName: string,
): Promise<{ path: string }> {
  const now = new Date();
  const sub = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ext = path.extname(originalName);
  const relPath = path.join(sub, `${randomUUID()}${ext}`);
  const full = resolveSafe(relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return { path: relPath };
}

export async function readFile(relPath: string): Promise<Buffer> {
  return fs.readFile(resolveSafe(relPath));
}

export async function deleteFile(relPath: string): Promise<void> {
  await fs.rm(resolveSafe(relPath), { force: true });
}
