const fs = require('fs');

try {
  // Buscar la imagen en diferentes ubicaciones
  const possiblePaths = [
    'src/assets/nuevadefondo.png',
    'public/nuevadefondo.png', 
    'src/nuevadefondo.png',
    'nuevadefondo.png'
  ];
  
  let imagePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      imagePath = p;
      break;
    }
  }
  
  if (!imagePath) {
    console.log('❌ Imagen nuevadefondo.png no encontrada en:');
    possiblePaths.forEach(p => console.log('  -', p));
    process.exit(1);
  }
  
  console.log('✅ Imagen encontrada en:', imagePath);
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64String}`;
  
  const outputContent = `// Imagen decorativa de fondo MIRG en Base64
export const MIRG_DECORATIVE_BASE64 = \`${dataUri}\`;`;

  fs.writeFileSync('src/assets/mirg-decorative-base64.ts', outputContent);
  
  console.log('✅ Imagen convertida exitosamente!');
  console.log('📁 Archivo actualizado: src/assets/mirg-decorative-base64.ts');
  console.log('🎨 Tamaño:', Math.round(base64String.length / 1024), 'KB');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
