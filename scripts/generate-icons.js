const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const LOGO = path.join(__dirname, '..', 'public', 'logo.png');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  // Ensure icons dir exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const logo = sharp(LOGO);
  const meta = await logo.metadata();
  console.log(`Source logo: ${meta.width}x${meta.height}`);

  for (const size of sizes) {
    const outPath = path.join(ICONS_DIR, `icon-${size}.png`);
    await sharp(LOGO)
      .resize(size, size, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
      .png()
      .toFile(outPath);
    console.log(`Generated: icon-${size}.png`);
  }

  // Generate apple-touch-icon (180x180)
  await sharp(LOGO)
    .resize(180, 180, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));
  console.log('Generated: apple-touch-icon.png');

  // Generate maskable icon (512 with padding for safe zone)
  const maskableSize = 512;
  const iconSize = Math.round(maskableSize * 0.8); // 80% of canvas = safe zone
  const padding = Math.round((maskableSize - iconSize) / 2);

  const resizedIcon = await sharp(LOGO)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 },
    },
  })
    .composite([{ input: resizedIcon, left: padding, top: padding }])
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-512.png'));
  console.log('Generated: icon-maskable-512.png');

  // Also generate maskable 192
  const maskable192 = 192;
  const icon192Size = Math.round(maskable192 * 0.8);
  const padding192 = Math.round((maskable192 - icon192Size) / 2);

  const resized192 = await sharp(LOGO)
    .resize(icon192Size, icon192Size, { fit: 'contain', background: { r: 18, g: 18, b: 18, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: maskable192,
      height: maskable192,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 },
    },
  })
    .composite([{ input: resized192, left: padding192, top: padding192 }])
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-maskable-192.png'));
  console.log('Generated: icon-maskable-192.png');

  console.log('Done!');
}

generate().catch(console.error);
