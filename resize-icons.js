import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sourceIcon = './ios/App/App/Assets.xcassets/AppIcon.appiconset/AS2.png';

const androidSizes = [
  { size: 48, path: './android/app/src/main/res/mipmap-mdpi/ic_launcher.png' },
  { size: 48, path: './android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png' },
  { size: 48, path: './android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png' },
  { size: 72, path: './android/app/src/main/res/mipmap-hdpi/ic_launcher.png' },
  { size: 72, path: './android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png' },
  { size: 72, path: './android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png' },
  { size: 96, path: './android/app/src/main/res/mipmap-xhdpi/ic_launcher.png' },
  { size: 96, path: './android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png' },
  { size: 96, path: './android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png' },
  { size: 144, path: './android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png' },
  { size: 144, path: './android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png' },
  { size: 144, path: './android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png' },
  { size: 192, path: './android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' },
  { size: 192, path: './android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png' },
  { size: 192, path: './android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png' },
];

const iosSizes = [
  { size: 1024, path: './ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' },
];

const pwaSizes = [
  { size: 64, path: './public/pwa-64x64.png' },
  { size: 192, path: './public/pwa-192x192.png' },
  { size: 192, path: './public/maskable-icon-512x512.png' },
  { size: 512, path: './public/pwa-512x512.png' },
];

const splashSizes = [
  { width: 2732, height: 2732, path: './ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png' },
  { width: 2732, height: 2732, path: './ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png' },
  { width: 2732, height: 2732, path: './ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png' },
];

async function resizeIcons() {
  console.log('🎨 Starting icon resizing...\n');

  try {
    const sourceBuffer = readFileSync(sourceIcon);

    console.log('📱 Resizing Android icons...');
    for (const { size, path } of androidSizes) {
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path);
      console.log(`  ✓ ${path} (${size}x${size})`);
    }

    console.log('\n🍎 Resizing iOS icons...');
    for (const { size, path } of iosSizes) {
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path);
      console.log(`  ✓ ${path} (${size}x${size})`);
    }

    console.log('\n🌐 Resizing PWA icons...');
    for (const { size, path } of pwaSizes) {
      await sharp(sourceBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toFile(path);
      console.log(`  ✓ ${path} (${size}x${size})`);
    }

    console.log('\n💦 Resizing splash screens...');
    const splashSource = './public/logos/logoas.png';
    const splashBuffer = readFileSync(splashSource);
    for (const { width, height, path } of splashSizes) {
      await sharp(splashBuffer)
        .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .png()
        .toFile(path);
      console.log(`  ✓ ${path} (${width}x${height})`);
    }

    console.log('\n✨ All icons resized successfully!');
  } catch (error) {
    console.error('❌ Error resizing icons:', error);
    process.exit(1);
  }
}

resizeIcons();
