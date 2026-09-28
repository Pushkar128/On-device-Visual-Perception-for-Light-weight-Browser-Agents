const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG buffer as a valid fallback PNG image
const pngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAOSURBVFiHY2AYBaNGwAABAARgAAEDkGffAAAAAElFTkSuQmCC',
  'base64'
);

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon48.png'), pngBuffer);
console.log('Icon generated successfully');
