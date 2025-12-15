#!/usr/bin/env node

/**
 * PWA Icon Generator Script for MajuMail
 * 
 * This script creates basic PWA icons from the MajuMail logo.
 * For production, you should replace these with properly designed icons.
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requirements: sharp package
 * Install: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(process.cwd(), 'public', 'icons');
const splashDir = path.join(process.cwd(), 'public', 'splash');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Base SVG for the MajuMail logo (M in gradient box)
const createSvgIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  <text 
    x="50%" 
    y="50%" 
    dominant-baseline="central" 
    text-anchor="middle" 
    fill="white" 
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-weight="bold"
    font-size="${size * 0.5}"
  >M</text>
</svg>
`;

// Create SVG icons for each size
console.log('Generating PWA icons...\n');

iconSizes.forEach((size) => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`  Created: ${filename}`);
});

// Create badge icon (smaller, for notifications)
const badgeSvg = createSvgIcon(72);
fs.writeFileSync(path.join(iconsDir, 'badge-72x72.svg'), badgeSvg);
console.log('  Created: badge-72x72.svg');

// Create shortcut icons
const composeSvg = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="19" fill="#3b82f6"/>
  <path d="M28 68V32h8l12 24 12-24h8v36h-8V48l-8 16h-8l-8-16v20h-8z" fill="white"/>
  <circle cx="72" cy="24" r="16" fill="#10b981"/>
  <path d="M72 16v16M64 24h16" stroke="white" stroke-width="3" stroke-linecap="round"/>
</svg>
`;
fs.writeFileSync(path.join(iconsDir, 'compose-96x96.svg'), composeSvg);
console.log('  Created: compose-96x96.svg');

const inboxSvg = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="19" fill="#3b82f6"/>
  <rect x="20" y="28" width="56" height="40" rx="4" fill="white"/>
  <path d="M20 36l28 20 28-20" stroke="#3b82f6" stroke-width="3" fill="none"/>
</svg>
`;
fs.writeFileSync(path.join(iconsDir, 'inbox-96x96.svg'), inboxSvg);
console.log('  Created: inbox-96x96.svg');

const starSvg = `
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="19" fill="#3b82f6"/>
  <path d="M48 20l8 16 18 3-13 13 3 18-16-8-16 8 3-18-13-13 18-3z" fill="#fbbf24"/>
</svg>
`;
fs.writeFileSync(path.join(iconsDir, 'star-96x96.svg'), starSvg);
console.log('  Created: star-96x96.svg');

console.log('\n✅ SVG icons generated successfully!');
console.log('\n📝 Note: For production, convert these SVG files to PNG format.');
console.log('   You can use tools like:');
console.log('   - Sharp (npm package)');
console.log('   - ImageMagick');
console.log('   - Online converters');
console.log('   - Design tools like Figma\n');

// Create a simple HTML file to preview icons
const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>MajuMail PWA Icons Preview</title>
  <style>
    body { font-family: system-ui; padding: 2rem; background: #f5f5f5; }
    h1 { color: #333; }
    .icons { display: flex; flex-wrap: wrap; gap: 1rem; }
    .icon { background: white; padding: 1rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .icon img { display: block; margin: 0 auto 0.5rem; }
    .icon span { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>MajuMail PWA Icons</h1>
  <div class="icons">
    ${iconSizes.map(size => `
      <div class="icon">
        <img src="icon-${size}x${size}.svg" width="${Math.min(size, 128)}" height="${Math.min(size, 128)}" alt="${size}x${size}">
        <span>${size}x${size}</span>
      </div>
    `).join('')}
  </div>
  <h2 style="margin-top: 2rem;">Shortcut Icons</h2>
  <div class="icons">
    <div class="icon">
      <img src="compose-96x96.svg" width="96" height="96" alt="Compose">
      <span>Compose</span>
    </div>
    <div class="icon">
      <img src="inbox-96x96.svg" width="96" height="96" alt="Inbox">
      <span>Inbox</span>
    </div>
    <div class="icon">
      <img src="star-96x96.svg" width="96" height="96" alt="Star">
      <span>Star</span>
    </div>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(iconsDir, 'preview.html'), previewHtml);
console.log('Created preview.html - open in browser to see all icons\n');