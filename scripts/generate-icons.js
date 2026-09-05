import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const sizes = [192, 512];

async function generate(input, output, size) {
	const svg = await readFile(input);
	await sharp(svg, { density: (size / 512) * 72 })
		.resize(size, size)
		.png()
		.toFile(output);
}

for (const size of sizes) {
	await generate('static/icon.svg', `static/icon-${size}x${size}.png`, size);
}

await generate('static/maskable-icon.svg', 'static/maskable-icon-512x512.png', 512);
await generate('static/icon.svg', 'static/apple-touch-icon.png', 180);

console.log('Icons generated');
