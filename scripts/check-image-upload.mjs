// Run against a local app and an isolated Chrome with --remote-debugging-port=9222.
// Usage: node scripts/check-image-upload.mjs [app-url] [debug-port]
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const [baseUrl = 'http://localhost:3001', port = '9222'] = process.argv.slice(2);
const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json());
const target = targets.find(page => page.type === 'page');
if (!target) throw new Error('No debuggable Chrome page found');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let id = 0;
const pending = new Map();
const exceptions = [];
const requests = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(String(event.data));
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
  if (message.method === 'Network.requestWillBeSent') requests.push(message.params.request);
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id);
  clearTimeout(call.timer);
  if (message.error) call.reject(new Error(message.error.message));
  else call.resolve(message.result || {});
});

function command(method, params = {}) {
  const requestId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`Timeout: ${method} ${params.expression?.slice(0, 180) || ''}`));
    }, 30_000);
    pending.set(requestId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}

async function evaluate(fn, ...args) {
  const result = await command('Runtime.evaluate', {
    expression: `(${fn.toString()})(...${JSON.stringify(args)})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function waitFor(fn, label) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await evaluate(fn)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function click(text) {
  assert.ok(await evaluate(label => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.includes(label));
    button?.click();
    return !!button;
  }, text), `Missing button: ${text}`);
}

async function openUpload() {
  await command('Page.navigate', { url: `${baseUrl}/create` });
  await waitFor(() => !!document.querySelector('[role="tab"]'), 'create page');
  // Wait for React hydration before clicking the server-rendered tab.
  await waitFor(() => [...document.querySelectorAll('[role="tab"]')].some(b => Object.keys(b).some(k => k.startsWith('__reactProps'))), 'hydration');
  await click('上传图片');
  await waitFor(() => !!document.querySelector('input[type="file"]'), 'upload tab');
}

async function upload({ name = '参考.png', type = 'image/png', size = 0, mode = 'drop', corrupt = false, count = 1, blank = false } = {}) {
  await evaluate(async options => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (options.blank) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 240, 160);
    } else {
      ctx.fillStyle = '#6558D9';
      ctx.fillRect(40, 30, 130, 90);
      ctx.fillStyle = '#FFD166';
      ctx.beginPath();
      ctx.arc(170, 65, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    const encoded = canvas.toDataURL(options.type || 'image/png').split(',')[1];
    const blob = new Blob([Uint8Array.from(atob(encoded), character => character.charCodeAt(0))]);
    const data = options.corrupt ? ['invalid image data'] : [blob, new Uint8Array(Math.max(0, options.size - blob.size))];
    const transfer = new DataTransfer();
    for (let i = 0; i < options.count; i++) transfer.items.add(new File(data, options.name, { type: options.type }));
    if (options.mode === 'drop') {
      const zone = document.querySelector('button[aria-describedby]');
      zone.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      zone.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      zone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    } else {
      const input = document.querySelector('input[type="file"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { name, type, size, mode, corrupt, count, blank });
}

async function expectError(text) {
  await waitFor(() => !!document.querySelector('[role="alert"]'), 'validation error');
  assert.ok((await evaluate(() => document.querySelector('[role="alert"]').textContent)).includes(text));
}

async function screenshot(name) {
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(`/private/tmp/startrace-${name}.png`, Buffer.from(result.data, 'base64'));
}

try {
  await command('Page.enable');
  await command('Page.bringToFront');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await openUpload();
  await evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

  // Exercise the real file-input path using an existing local JPEG fixture.
  await command('Page.setInterceptFileChooserDialog', { enabled: true });
  await click('选择本地图片');
  const { root } = await command('DOM.getDocument');
  const { nodeId } = await command('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"]' });
  await command('DOM.setFileInputFiles', { nodeId, files: [`${process.cwd()}/public/masterworks/gauguin/martinique.jpg`] });
  await command('Page.setInterceptFileChooserDialog', { enabled: false });
  await waitFor(() => document.querySelector('aside')?.textContent.includes('martinique.jpg'), 'local JPEG preview');
  console.log('PASS: click-to-select local JPEG');

  await upload({ name: '透明参考.png', size: 20 * 1024 * 1024 - 1 });
  console.log('Checking large PNG preview and cached pixels…');
  await waitFor(() => document.querySelector('aside')?.textContent.includes('透明参考.png'), 'large PNG preview');
  await waitFor(() => document.querySelector('aside img')?.complete, 'decoded PNG preview');
  const corner = await evaluate(() => {
    const img = document.querySelector('aside img');
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  });
  assert.ok(corner.slice(0, 3).every(channel => channel > 245), 'Transparent pixels must become white');
  const previousSource = await evaluate(() => sessionStorage.getItem('star-bindpaint-source'));
  await click('上传图片');
  assert.ok(await evaluate(() => document.querySelector('aside').textContent.includes('透明参考.png')));
  console.log('PASS: drag/drop below 20 MB, transparent PNG, same-tab selection preserved');

  await upload({ size: 20 * 1024 * 1024 });
  await expectError('小于 20 MB');
  await upload({ type: 'text/plain', name: 'notes.txt', corrupt: true });
  await expectError('请选择 JPG');
  await upload({ corrupt: true });
  await expectError('无法读取');
  await upload({ count: 2 });
  await expectError('每次请选择一张');
  await evaluate(() => {
    const input = document.querySelector('input[type="file"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([], 'empty.png', { type: 'image/png' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expectError('空文件');
  assert.equal(await evaluate(() => sessionStorage.getItem('star-bindpaint-source')), previousSource);
  console.log('PASS: size/type/corruption/multiple-file rejection retains valid source');

  await upload({ name: '浏览器未提供类型.PNG', type: '', mode: 'input' });
  await waitFor(() => document.querySelector('aside')?.textContent.includes('浏览器未提供类型.PNG'), 'extension fallback');
  await upload({ name: '我的很长的本地图片文件名'.repeat(8) + '.webp', type: 'image/webp' });
  await waitFor(() => document.querySelector('aside')?.textContent.includes('.webp'), 'WebP replacement');
  assert.equal(await evaluate(() => sessionStorage.getItem('star-bindpaint-master')), null);
  await evaluate(() => document.querySelector('button[aria-describedby]').scrollIntoView({ block: 'center' }));
  await screenshot('upload-desktop');
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Upload layout overflows on mobile');
  await evaluate(() => document.querySelector('button[aria-describedby]').scrollIntoView({ block: 'center' }));
  await screenshot('upload-zone-mobile');
  await evaluate(() => document.querySelector('aside').scrollIntoView({ block: 'start' }));
  await screenshot('upload-mobile');
  console.log('PASS: format fallback, WebP replacement, long filenames, 390px layout');

  await click('适度引导');
  await click('大笔概括');
  await click('生成星迹并开始');
  await waitFor(() => !!document.querySelector('canvas') && document.body.textContent.includes('沿星迹绘画'), 'stroke decomposition and paint canvas');
  assert.equal(await evaluate(() => sessionStorage.getItem('startrace-guidance-level')), 'balanced');
  assert.equal(await evaluate(() => sessionStorage.getItem('star-bindpaint-roughness')), '3');
  assert.equal(await evaluate(() => sessionStorage.getItem('startrace-entry-mode')), 'upload');
  const paintedCanvases = await evaluate(() => [...document.querySelectorAll('canvas')].filter(canvas => {
    const ctx = canvas.getContext('2d');
    return ctx && ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((channel, i) => i % 4 === 3 && channel > 0);
  }).length);
  assert.ok(paintedCanvases >= 2, 'Expected drawing surface and rendered guide overlay');
  const aspectError = await evaluate(() => {
    const canvas = document.querySelector('canvas');
    const bounds = canvas.getBoundingClientRect();
    return Math.abs(bounds.width / bounds.height - canvas.width / canvas.height);
  });
  assert.ok(aspectError < 0.02, 'Reference and guide must preserve the original aspect ratio');
  assert.ok(await evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Paint layout overflows on mobile');
  await screenshot('paint-mobile');
  await click('完整');
  await waitFor(() => sessionStorage.getItem('startrace-guidance-level') === 'full', 'full guidance');
  await click('起点');
  await waitFor(() => sessionStorage.getItem('startrace-guidance-level') === 'light', 'light guidance');
  console.log('PASS: custom image decomposition, guide overlay, guidance/roughness settings');

  await openUpload();
  await upload({ blank: true });
  await waitFor(() => document.querySelector('aside')?.textContent.includes('参考.png'), 'blank preview');
  await click('生成星迹并开始');
  await expectError('没有可跟随的笔触');
  await click('返回选择图片');
  await waitFor(() => !!document.querySelector('[role="tab"]'), 'error recovery');
  await evaluate(() => sessionStorage.setItem('star-bindpaint-source', 'data:image/png;base64,broken'));
  await command('Page.navigate', { url: `${baseUrl}/paint` });
  await expectError('参考图无法读取');
  console.log('PASS: empty decomposition and corrupted cached image recover without endless loading');

  assert.deepEqual(exceptions, [], 'Uncaught browser exception');
  assert.equal(requests.filter(request => request.method === 'POST').length, 0, 'Reference flow should stay local');
  console.log('All image upload checks passed. Screenshots: /private/tmp/startrace-*.png');
} finally {
  socket.close();
}
