// Run: node scripts/generate-icons.js
// Requires: npm install sharp (already installed)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Chrish Flora brand icon: olive background + gold orchid logo
  const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background: brand olive color -->
  <rect width="512" height="512" fill="#C8CC7A" rx="80"/>

  <!-- Outer flower: 4 petals arranged around centre -->
  <!-- Top petal -->
  <ellipse cx="256" cy="165" rx="32" ry="52"
    fill="none" stroke="#C9962A" stroke-width="16" stroke-linecap="round"/>
  <!-- Bottom petal -->
  <ellipse cx="256" cy="305" rx="32" ry="52"
    fill="none" stroke="#C9962A" stroke-width="16" stroke-linecap="round"/>
  <!-- Left petal -->
  <ellipse cx="186" cy="235" rx="52" ry="32"
    fill="none" stroke="#C9962A" stroke-width="16" stroke-linecap="round"/>
  <!-- Right petal -->
  <ellipse cx="326" cy="235" rx="52" ry="32"
    fill="none" stroke="#C9962A" stroke-width="16" stroke-linecap="round"/>

  <!-- Inner swirl petal (diagonal left) -->
  <ellipse cx="210" cy="196" rx="30" ry="18"
    fill="none" stroke="#C9962A" stroke-width="11" stroke-linecap="round"
    transform="rotate(-40 210 196)"/>
  <!-- Inner swirl petal (diagonal right) -->
  <ellipse cx="302" cy="196" rx="30" ry="18"
    fill="none" stroke="#C9962A" stroke-width="11" stroke-linecap="round"
    transform="rotate(40 302 196)"/>

  <!-- Centre circle -->
  <circle cx="256" cy="235" r="26" fill="#C9962A"/>
  <circle cx="256" cy="235" r="14" fill="#C8CC7A"/>

  <!-- CHRISH text -->
  <text x="256" y="388"
    font-family="Georgia, serif"
    font-size="56"
    font-weight="bold"
    fill="#C9962A"
    text-anchor="middle"
    letter-spacing="6">CHRISH</text>

  <!-- FLORA text -->
  <text x="256" y="434"
    font-family="Georgia, serif"
    font-size="30"
    fill="#C9962A"
    text-anchor="middle"
    letter-spacing="14">FLORA</text>
</svg>`;

  const svgBuffer = Buffer.from(svgIcon);

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Apple touch icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'apple-touch-icon.png'));
  console.log('✅ Generated apple-touch-icon.png');

  // Favicon (32x32)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'favicon-32x32.png'));
  console.log('✅ Generated favicon-32x32.png');

  // Favicon 16x16
  await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'favicon-16x16.png'));
  console.log('✅ Generated favicon-16x16.png');

  console.log('\n🌸 All Chrish Flora icons generated!');
}

generateIcons().catch(console.error);
