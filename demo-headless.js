import { BackendFactory } from './packages/terminals/dist/BackendFactory.js';
import { HeadlessSnapshotStrategy } from './packages/terminals/dist/snapshotters/headless.js';

async function main() {
  console.log('Setting up Backend for Ghostty...');
  const backend = BackendFactory.create('Ghostty');

  console.log('Connecting and spawning Ghostty (running htop)...');
  await backend.connect('top', 80, 24);

  console.log("Waiting for 'top' to render (2 seconds)...");
  await new Promise((r) => setTimeout(r, 2000));

  console.log('Capturing headless snapshot directly...');
  const outPath = 'demo-headless-colored.png';
  const strategy = new HeadlessSnapshotStrategy();
  await strategy.capture(outPath, 80, 24, backend.sessionName);

  console.log(`✅ Snapshot saved to ${outPath}`);

  console.log('Closing session...');
  await backend.disconnect();
}

main().catch(console.error);
