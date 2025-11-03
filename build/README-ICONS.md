# Iconos para la Aplicación Electron

Para que la aplicación tenga un icono personalizado, necesitas agregar los siguientes archivos en esta carpeta:

## Windows
- **icon.ico** - Icono para Windows (256x256 o mayor, formato .ico)
  - Debe contener múltiples resoluciones: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256

## macOS
- **icon.icns** - Icono para macOS (formato .icns)
  - Debe contener múltiples resoluciones desde 16x16 hasta 1024x1024

## Linux
- **icon.png** - Icono para Linux (512x512 o mayor, formato .png)

## Cómo crear los iconos

### Opción 1: Usar un servicio en línea
1. Ve a https://www.icoconverter.com/ o https://cloudconvert.com/
2. Sube una imagen PNG de alta resolución (512x512 o mayor)
3. Convierte a los formatos necesarios (.ico, .icns, .png)

### Opción 2: Usar herramientas locales
- **Windows**: Usa Electron Icon Maker o GIMP
- **macOS**: Usa iconutil (herramienta nativa)
- **Linux**: Usa ImageMagick

### Opción 3: Usar electron-icon-builder
```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./icon.png --output=./build
```

## Mientras tanto

Si no agregas iconos personalizados, Electron usará el icono predeterminado.
La aplicación funcionará perfectamente, pero no tendrá una identidad visual personalizada.

## Archivo de ejemplo

Coloca tu imagen base (logo.png de 1024x1024) en esta carpeta y ejecuta:

```powershell
# Desde la raíz del proyecto
npm install -g electron-icon-builder
electron-icon-builder --input=./build/logo.png --output=./build --flatten
```

Esto generará automáticamente todos los formatos necesarios.
