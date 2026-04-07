import GIFEncoder from 'gif-encoder-2';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

export async function createGif(
  pngPaths: string[],
  outputPath: string,
  frameDelay = 800,
): Promise<void> {
  if (pngPaths.length === 0) {
    console.warn('No PNG files provided, skipping GIF creation');
    return;
  }

  // Read first image to get dimensions
  const firstPng = PNG.sync.read(fs.readFileSync(pngPaths[0]));
  const { width, height } = firstPng;

  const encoder = new GIFEncoder(width, height, 'neuquant', false);
  encoder.setDelay(frameDelay);
  encoder.setRepeat(0); // loop forever
  encoder.setQuality(10);
  encoder.start();

  for (const pngPath of pngPaths) {
    try {
      const png = PNG.sync.read(fs.readFileSync(pngPath));
      encoder.addFrame(png.data as unknown as Buffer);
    } catch (err) {
      console.warn(`Skipping frame ${pngPath}: ${err}`);
    }
  }

  encoder.finish();

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, encoder.out.getData());
  console.log(`GIF created: ${outputPath} (${pngPaths.length} frames)`);
}
