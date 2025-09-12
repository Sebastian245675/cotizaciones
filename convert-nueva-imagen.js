const fs = require('fs');
const path = require('path');

console.log('🎨 Convirtiendo nueva imagen decorativa...');

try {
  const imagePath = path.join(__dirname, 'src', 'Picsart_25-09-03_16-07-19-557.png');
  
  if (!fs.existsSync(imagePath)) {
    console.log('❌ No se encontró la imagen:', imagePath);
    process.exit(1);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64String}`;
  
  const outputContent = `// Imagen decorativa MIRG Quality System en Base64 (nueva imagen)
export const MIRG_DECORATIVE_BASE64 = \`${dataUri}\`;`;
  
  const outputPath = path.join(__dirname, 'src', 'assets', 'mirg-decorative-base64.ts');
  fs.writeFileSync(outputPath, outputContent);
  
  console.log('✅ Nueva imagen convertida exitosamente!');
  console.log('📁 Archivo actualizado:', outputPath);
  console.log('🎨 Tamaño de la imagen:', Math.round(base64String.length / 1024), 'KB');
  
} catch (error) {
  console.error('❌ Error al convertir la imagen:', error.message);
}
