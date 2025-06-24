import * as fs from 'fs';
import * as path from 'path';

const dryRun = process.argv.includes('--dry-run');

function replaceNgIf(content: string, filePath: string): string {
  const regex = /<([\w-]+)\s+\*ngIf="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g;

  let hasMatch = false;

  const replaced = content.replace(regex, (_, tag, condition, attributes, inner) => {
    hasMatch = true;
    return `@if (${condition}) {\n  <${tag}${attributes}>${inner}</${tag}>\n}`;
  });

  if (hasMatch) {
    console.log(`${dryRun ? '🔍 DRY-RUN:' : '✔️ Geändert:'} ${filePath}`);
  }

  return replaced;
}

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const updated = replaceNgIf(content, filePath);

  if (!dryRun && content !== updated) {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }
}

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith('.html')) {
      processFile(fullPath);
    }
  }
}

// 🟢 Starte hier
const baseDir = process.argv[2] || __dirname;
walk(baseDir);
