import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const REGISTRY_DIR = join(import.meta.dirname, '..', 'public', 'r');

const IMPORT_REWRITES = [
  [/from\s+["']\.\/utils["']/g, 'from "@/lib/utils"'],
  [/from\s+["']@\/shared\/components\/ui\/utils["']/g, 'from "@/lib/utils"'],
  [/from\s+["']@\/shared\/components\/ui\/([^"']+)["']/g, 'from "./$1"'],
  [/from\s+["']@\/imports\/([^"']+)["']/g, 'from "@/imports/$1"'],
];

async function transform() {
  const files = await readdir(REGISTRY_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'registry.json');

  let transformed = 0;

  for (const file of jsonFiles) {
    const path = join(REGISTRY_DIR, file);
    const raw = await readFile(path, 'utf-8');
    const item = JSON.parse(raw);

    let changed = false;

    if (item.files) {
      for (const entry of item.files) {
        if (!entry.content) continue;
        let content = entry.content;
        for (const [pattern, replacement] of IMPORT_REWRITES) {
          const before = content;
          content = content.replace(pattern, replacement);
          if (content !== before) changed = true;
        }
        entry.content = content;
      }
    }

    if (changed) {
      await writeFile(path, JSON.stringify(item, null, 2) + '\n');
      transformed++;
    }
  }

  console.log(`Transformed ${transformed}/${jsonFiles.length} registry files.`);
}

transform().catch(err => {
  console.error(err);
  process.exit(1);
});
