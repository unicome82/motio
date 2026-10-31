import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = readdirSync(new URL('../tests/', import.meta.url)).filter(name => name.endsWith('.mjs') && name !== 'helpers.mjs').sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ['tests/'+file], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS: ${files.length} test files. No downloads or npm installation required.`);
