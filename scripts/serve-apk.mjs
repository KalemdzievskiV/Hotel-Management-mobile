// Serves the latest locally built APK (dist/hotel-management.apk) on the local network, so a
// phone on the same Wi-Fi can download and install it: npm run serve:apk, open the printed URL
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const apk = fileURLToPath(new URL('../dist/hotel-management.apk', import.meta.url));
const port = Number(process.env.PORT) || 8099;

function apkStats() {
  try {
    return statSync(apk);
  } catch {
    return null;
  }
}

if (!apkStats()) {
  console.error('No APK yet. Build one first: npm run build:apk');
  process.exit(1);
}

// Any path downloads the APK, so the URL is easy to type on a phone.
// The file is read per request: rebuilding while this runs serves the new build.
createServer((req, res) => {
  const stats = apkStats();
  if (!stats) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('No APK built yet');
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/vnd.android.package-archive',
    'Content-Length': stats.size,
    'Content-Disposition': 'attachment; filename="hotel-management.apk"',
    'Cache-Control': 'no-store',
  });
  createReadStream(apk).pipe(res);
  console.log(`${new Date().toLocaleTimeString()}  sent APK to ${req.socket.remoteAddress}`);
}).listen(port, () => {
  const built = apkStats().mtime.toLocaleString();
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address)
    // Home Wi-Fi addresses first; Docker/WSL adapters (172.x) are rarely the right one
    .sort((a, b) => Number(a.startsWith('172.')) - Number(b.startsWith('172.')));

  console.log(`APK built ${built}. On a phone on the same Wi-Fi, open:`);
  for (const address of addresses) console.log(`  http://${address}:${port}`);
  console.log('Ctrl+C to stop.');
});
