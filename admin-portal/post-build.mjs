import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');

function writeBuildVersion() {
  const data = {
    devMode: !isProd,
    buildTime: new Date().toISOString(),
    hash: Math.random().toString(36).substring(2, 10),
  };

  const browserDir = path.join(__dirname, 'www', 'browser');
  const outDir = fs.existsSync(browserDir) ? browserDir : path.join(__dirname, 'www');
  if (fs.existsSync(outDir)) {
    fs.writeFileSync(path.join(outDir, 'build-version.json'), JSON.stringify(data, null, 2));
    console.log(`[post-build] build-version.json → ${path.relative(__dirname, outDir)} (devMode=${data.devMode})`);
  } else if (!isWatch) {
    console.warn('[post-build] www/ not found — skipping build-version.json');
  }
}

if (!isWatch) {
  writeBuildVersion();
} else {
  const watchDir = path.join(__dirname, 'www');

  function startWatching() {
    if (!fs.existsSync(watchDir)) {
      console.log('[post-build] waiting for www/ …');
      setTimeout(startWatching, 2000);
      return;
    }
    writeBuildVersion();
    let debounce;
    console.log(`[post-build] watching ${watchDir} for rebuilds…`);
    fs.watch(watchDir, { recursive: true }, (_event, filename) => {
      if (filename && filename.includes('build-version.json')) return;
      clearTimeout(debounce);
      debounce = setTimeout(writeBuildVersion, 800);
    });
  }

  startWatching();
}
