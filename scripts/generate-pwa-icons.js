import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const generatedImagePath = path.resolve('src/assets/images/telemoto_app_logo_1790710831952.jpg');
  const svgPath = path.resolve('public/favicon.svg');

  let sourceBuffer;
  if (fs.existsSync(generatedImagePath)) {
    sourceBuffer = fs.readFileSync(generatedImagePath);
    console.log('Using high-res generated logo image as source.');
  } else {
    sourceBuffer = fs.readFileSync(svgPath);
    console.log('Using SVG as source.');
  }

  // 192x192 PNG
  await sharp(sourceBuffer)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile('public/icon-192.png');
  console.log('Generated public/icon-192.png');

  // 512x512 PNG
  await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile('public/icon-512.png');
  console.log('Generated public/icon-512.png');

  // 180x180 Apple Touch Icon PNG
  await sharp(sourceBuffer)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated public/apple-touch-icon.png');

  // 512x512 Maskable Icon
  await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile('public/maskable-icon-512.png');
  console.log('Generated public/maskable-icon-512.png');

  // Save in src/assets/images/logo.png for in-app imports
  await sharp(sourceBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile('src/assets/images/telemoto_app_logo.png');
  console.log('Generated src/assets/images/telemoto_app_logo.png');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
