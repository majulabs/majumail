#!/usr/bin/env node

/**
 * PWA Icon Generator for MajuMail
 * 
 * This script generates PNG icons from mm-icon.svg for iOS and older browsers.
 * 
 * Usage: 
 *   npm install sharp --save-dev
 *   node scripts/generate-pwa-icons.js
 * 
 * Or use ImageMagick:
 *   convert -background none -resize 192x192 public/mm-icon.svg public/icons/icon-192x192.png
 *   convert -background none -resize 512x512 public/mm-icon.svg public/icons/icon-512x512.png
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('Sharp not installed. Install with: npm install sharp --save-dev');
  console.log('\nAlternatively, use ImageMagick:');
  console.log('  convert -background none -resize 192x192 public/mm-icon.svg public/icons/icon-192x192.png');
  console.log('  convert -background none -resize 512x512 public/mm-icon.svg public/icons/icon-512x512.png');
  console.log('  convert -background none -resize 152x152 public/mm-icon.svg public/icons/icon-152x152.png');
  console.log('  convert -background none -resize 144x144 public/mm-icon.svg public/icons/icon-144x144.png');
  console.log('  convert -background none -resize 128x128 public/mm-icon.svg public/icons/icon-128x128.png');
  console.log('  convert -background none -resize 96x96 public/mm-icon.svg public/icons/icon-96x96.png');
  console.log('  convert -background none -resize 72x72 public/mm-icon.svg public/icons/icon-72x72.png');
  process.exit(0);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(process.cwd(), 'public', 'mm-icon.svg');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'icons');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Check if source SVG exists
  if (!fs.existsSync(INPUT_SVG)) {
    console.error('Error: mm-icon.svg not found at', INPUT_SVG);
    process.exit(1);
  }

  console.log('Generating PWA icons from mm-icon.svg...\n');

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    try {
      await sharp(INPUT_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`  ✓ Created icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`  ✗ Failed to create icon-${size}x${size}.png:`, err.message);
    }
  }

  console.log('\n✅ PWA icons generated successfully!');
  console.log(`   Location: ${OUTPUT_DIR}`);
}

generateIcons().catch(console.error);