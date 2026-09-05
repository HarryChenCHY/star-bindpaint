import { writeFile } from 'node:fs/promises';

const [port, url, output, width = '390', height = '844'] = process.argv.slice(2);
if (!port || !url || !output) throw new Error('usage: capture-page <port> <url> <output> [width] [height]');

const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
const page = targets.find(target => target.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('No debuggable page found');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let messageId = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data));
  const callback = pending.get(message.id);
  if (!callback) return;
  pending.delete(message.id);
  if (message.error) callback.reject(new Error(message.error.message));
  else callback.resolve(message.result || {});
});

function command(method, params = {}) {
  const id = ++messageId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: Number(width),
  height: Number(height),
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: Number(width),
  screenHeight: Number(height),
});
await command('Page.navigate', { url });
await new Promise(resolve => setTimeout(resolve, 1_800));
const viewport = await command('Runtime.evaluate', { expression: '({width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth})', returnByValue: true });
const screenshot = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
await writeFile(output, Buffer.from(screenshot.data, 'base64'));
socket.close();
process.stdout.write(JSON.stringify(viewport.result.value));
