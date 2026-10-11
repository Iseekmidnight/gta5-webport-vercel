// Packs public/ into one file and compiles desktop/launcher.js into a single Windows .exe with Bun.
import {readdir, stat, writeFile, mkdir} from 'node:fs/promises';
import {openSync, writeSync, closeSync, readFileSync} from 'node:fs';
import {join, relative, sep} from 'node:path';
import {spawnSync} from 'node:child_process';

const root = join(import.meta.dirname, '..');
const publicRoot = join(root, 'public');
async function walk(dir) {
  const entries = await readdir(dir, {withFileTypes:true});
  const files = await Promise.all(entries.map(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  return files.flat();
}
const files = (await walk(publicRoot)).filter(f => !f.endsWith(sep + 'deployment-status.json')).sort();
const index = {};
const out = openSync(join(import.meta.dirname, 'site.pack'), 'w');
let offset = 0;
for (const file of files) {
  const size = (await stat(file)).size;
  index[relative(publicRoot, file).split(sep).join('/')] = [offset, size];
  if (size) writeSync(out, readFileSync(file));
  offset += size;
}
closeSync(out);
await writeFile(join(import.meta.dirname, 'site-index.json'), JSON.stringify(index));
console.log(`Packed ${files.length} site files (${(offset / 2 ** 20).toFixed(0)} MiB).`);

await mkdir(join(root, 'dist'), {recursive:true});
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['bun-windows-x64'];
for (const target of targets) {
  const outfile = join(root, 'dist', target.includes('windows') ? 'GTA5-Webport.exe' : 'GTA5-Webport-' + target.replace('bun-', ''));
  const args = ['build', '--compile', '--minify', `--target=${target}`, join(import.meta.dirname, 'launcher.js'), '--outfile', outfile];
  const result = spawnSync(process.execPath, args, {stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status ?? 1);
}
