const fs = require('fs');
const path = require('path');

// Script para convertir decorativa.jpg a Base64
function convertDecorativeImageToBase64() {
  try {
    // Buscar la imagen en diferentes ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, '../decorativa.jpg'),
      path.join(__dirname, '../src/decorativa.jpg'),
      path.join(__dirname, '../src/assets/decorativa.jpg'),
      path.join(__dirname, '../public/decorativa.jpg'),
      path.join(__dirname, '../../decorativa.jpg')
    ];

    let imagePath = null;
    
    for (const checkPath of possiblePaths) {
      if (fs.existsSync(checkPath)) {
        imagePath = checkPath;
        console.log('✅ Imagen encontrada en:', imagePath);
        break;
      }
    }

    if (!imagePath) {
      console.log('⚠️  Imagen decorativa.jpg no encontrada en las ubicaciones:');
      possiblePaths.forEach(p => console.log('   -', p));
      console.log('📁 Por favor, coloque decorativa.jpg en la raíz del proyecto o en src/assets/');
      return;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64String}`;
    
    const outputContent = `// Imagen decorativa MIRG Quality System en Base64 (decorativa.jpg)
export const MIRG_DECORATIVE_BASE64 = \`${dataUri}\`;`;

    const outputPath = path.join(__dirname, '../src/assets/mirg-decorative-base64.ts');
    fs.writeFileSync(outputPath, outputContent);
    
    console.log('✅ Imagen convertida exitosamente!');
    console.log('📁 Archivo generado:', outputPath);
    console.log('🎨 Tamaño de la imagen:', Math.round(base64String.length / 1024), 'KB');
    console.log('📏 Dimensiones: Se detectará automáticamente en el PDF');
    
  } catch (error) {
    console.error('❌ Error al convertir la imagen:', error.message);
  }
}

// Ejecutar la conversión
convertDecorativeImageToBase64();
