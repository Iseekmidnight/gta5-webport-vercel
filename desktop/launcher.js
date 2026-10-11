import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createDataServer, parseRange} from '../server.js';
import gameIndex from '../asset-index.json';
import siteIndex from './site-index.json';
import sitePackPath from './site.pack' with {type:'file'};

const sitePack = Bun.file(sitePackPath);
const data = createDataServer(gameIndex);
const SECURITY = {'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Resource-Policy':'same-origin'};
const TYPES = {html:'text/html; charset=utf-8',js:'text/javascript',wasm:'application/wasm',json:'application/json',png:'image/png',
  webp:'image/webp',woff:'font/woff',ico:'image/x-icon',txt:'text/plain; charset=utf-8',xml:'application/xml',wgsl:'text/plain; charset=utf-8'};

function staticFile(request, pathname) {
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  const record = Object.hasOwn(siteIndex, name) ? siteIndex[name] : null;
  if (!record || !['GET','HEAD'].includes(request.method)) return null;
  const [offset, size] = record;
  const headers = {...SECURITY,'Accept-Ranges':'bytes','Content-Type':TYPES[name.split('.').at(-1).toLowerCase()] || 'application/octet-stream'};
  if (name.startsWith('b/') || name.startsWith('data/batchc/')) headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  else headers['Cache-Control'] = 'no-cache';
  const range = request.headers.get('Range');
  let start = 0, end = size - 1;
  if (range && size > 0) {
    try { [start, end] = parseRange(range, size); }
    catch { return new Response('Invalid range', {status:416,headers:{...headers,'Content-Range':`bytes */${size}`}}); }
    headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length'] = String(size ? end - start + 1 : 0);
  const body = request.method === 'HEAD' || !size ? null : sitePack.slice(offset + start, offset + end + 1);
  return new Response(body, {status:range && size ? 206 : 200, headers});
}

async function handle(request) {
  const url = new URL(request.url);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Invalid path', {status:400,headers:SECURITY}); }
  if (pathname === '/deployment-status.json') return Response.json({ready:true}, {headers:{...SECURITY,'Cache-Control':'no-store'}});
  if (pathname === '/log') return new Response(null, {status:204,headers:SECURITY});
  const file = staticFile(request, pathname);
  if (file) return file;
  if (!pathname.startsWith('/data/')) return new Response('Not found', {status:404,headers:SECURITY});
  const response = await data(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY)) headers.set(key, value);
  return new Response(response.body, {status:response.status, headers});
}

function listen() {
  for (let port = 8127; port < 8147; port++) {
    try { return Bun.serve({hostname:'127.0.0.1', port, fetch:handle, idleTimeout:0, maxRequestBodySize:2 * 1024 * 1024}); }
    catch {}
  }
  return Bun.serve({hostname:'127.0.0.1', port:0, fetch:handle, idleTimeout:0, maxRequestBodySize:2 * 1024 * 1024});
}

function findBrowser() {
  if (process.env.GTA5_BROWSER) return process.env.GTA5_BROWSER;
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean);
  const candidates = process.platform === 'win32'
    ? roots.flatMap(root => [join(root,'Microsoft','Edge','Application','msedge.exe'), join(root,'Google','Chrome','Application','chrome.exe')])
    : ['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/microsoft-edge','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return candidates.find(path => existsSync(path));
}

const server = listen();
const address = `http://127.0.0.1:${server.port}/`;
// Performance mode by default (low settings, 70 % render scale, 30 fps cap) for laptops; `--high` runs the page's normal settings.
const gameUrl = address + (process.argv.includes('--high') ? '' : '?low=1&scale=0.7&fps=30');
console.log('GTA V Webport is running at ' + address);
console.log('Keep this window open while you play. Close it to stop the game.\n');

const browser = findBrowser();
if (browser) {
  const home = process.env.LOCALAPPDATA || process.env.HOME || '.';
  const profile = join(home, 'GTA5Webport', 'browser-profile');
  mkdirSync(profile, {recursive:true});
  const child = spawn(browser, ['--app=' + gameUrl, '--user-data-dir=' + profile, '--start-maximized', '--no-first-run',
    '--no-default-browser-check', '--enable-features=SharedArrayBuffer'], {stdio:'ignore'});
  child.on('exit', () => { console.log('Game window closed.'); server.stop(true); process.exit(0); });
  child.on('error', () => openDefault());
} else openDefault();

function openDefault() {
  console.log('Microsoft Edge or Google Chrome was not found. Opening your default browser (it must support WebGPU).');
  const command = process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler',gameUrl]] : process.platform === 'darwin' ? ['open',[gameUrl]] : ['xdg-open',[gameUrl]];
  spawn(command[0], command[1], {stdio:'ignore', detached:true}).unref();
}
