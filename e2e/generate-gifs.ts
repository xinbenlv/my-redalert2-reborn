import * as fs from 'fs';
import * as path from 'path';
import { createGif } from './utils/create-gif';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'demo-gifs');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    console.error(`Screenshot directory not found: ${SCREENSHOT_DIR}`);
    console.error('Run "npm run test:e2e" first to capture screenshots.');
    process.exit(1);
  }

  const pngFiles = fs
    .readdirSync(SCREENSHOT_DIR)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => path.join(SCREENSHOT_DIR, f));

  if (pngFiles.length === 0) {
    console.error('No PNG screenshots found. Run "npm run test:e2e" first.');
    process.exit(1);
  }

  console.log(`Found ${pngFiles.length} screenshots`);
  await createGif(pngFiles, path.join(OUTPUT_DIR, 'gameplay.gif'), 800);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
