const fs = require('fs');
const path = require('path');

// Función para convertir imagen a Base64
function convertImageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64String = imageBuffer.toString('base64');
    return base64String;
  } catch (error) {
    console.error('Error reading image:', error);
    return null;
  }
}

// Buscar el archivo de logo en diferentes extensiones
const possibleExtensions = ['.png', '.jpg', '.jpeg'];
let logoPath = null;

// Buscar primero en public/
for (const ext of possibleExtensions) {
  const testPath = path.join(__dirname, 'public', `mirg-logo${ext}`);
  if (fs.existsSync(testPath)) {
    logoPath = testPath;
    break;
  }
}

// Si no se encuentra en public/, buscar en la raíz
if (!logoPath) {
  for (const ext of possibleExtensions) {
    const testPath = path.join(__dirname, `mirg-logo${ext}`);
    if (fs.existsSync(testPath)) {
      logoPath = testPath;
      break;
    }
  }
}

if (!logoPath) {
  console.log('Por favor, guarda el logo como "mirg-logo.png" en la carpeta raíz del proyecto');
  process.exit(1);
}

console.log(`Encontrado logo en: ${logoPath}`);

const base64 = convertImageToBase64(logoPath);
if (base64) {
  console.log('Logo convertido exitosamente a Base64');
  console.log('Tamaño del Base64:', base64.length, 'caracteres');
  
  // Guardar en archivo para usar en el código
  const logoConstant = `// Logo MIRG oficial convertido a Base64
export const MIRG_LOGO_BASE64 = 'data:image/png;base64,${base64}';
`;
  
  fs.writeFileSync('src/assets/mirg-logo-base64.ts', logoConstant);
  console.log('✅ Logo guardado en: src/assets/mirg-logo-base64.ts');
  
  // También mostrar solo los primeros caracteres para verificar
  console.log('Primeros 100 caracteres del Base64:');
  console.log(base64.substring(0, 100) + '...');
} else {
  console.log('❌ Error al convertir el logo');
}
