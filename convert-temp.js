const fs = require('fs');
const path = require('path');

const imagePath = path.join('src', 'assets', 'decorativa.jpg');
const imageBuffer = fs.readFileSync(imagePath);
const base64String = imageBuffer.toString('base64');
const dataUri = `data:image/jpeg;base64,${base64String}`;

const outputContent = `// Imagen decorativa MIRG Quality System en Base64
export const MIRG_DECORATIVE_BASE64 = \`${dataUri}\`;`;

fs.writeFileSync('src/assets/mirg-decorative-base64.ts', outputContent);

console.log('✅ Imagen decorativa convertida exitosamente');
console.log('📏 Tamaño:', Math.round(base64String.length / 1024), 'KB');
