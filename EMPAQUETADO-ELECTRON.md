# 📦 Guía de Empaquetado Electron - CovenantPOS

## 🚀 Requisitos Previos

- Node.js 16 o superior
- npm 8 o superior
- Windows 10 o superior (para compilar para Windows)

## 📋 Preparación

### 1. Instalar Dependencias

```powershell
# Instalar dependencias del proyecto principal
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..
```

## 🔨 Comandos de Construcción

### Construcción Rápida (solo compilar frontend)

```powershell
npm run build
```

### Empaquetado Windows (Recomendado)

```powershell
# Usando el script automatizado
.\build-electron.ps1

# O manualmente
npm run build:executable
```

### Empaquetado para Diferentes Plataformas

```powershell
# Solo Windows (NSIS + Portable)
npm run dist:win

# Solo macOS (requiere estar en Mac)
npm run dist:mac

# Solo Linux
npm run dist:linux

# Todas las plataformas
npm run dist
```

## 📁 Estructura de Archivos Empaquetados

Después de la compilación, encontrarás los archivos en la carpeta `builds/`:

```
builds/
├── CovenantPOS-Setup-1.0.0.exe      # Instalador NSIS
├── CovenantPOS-Portable.exe          # Versión portable
└── win-unpacked/                     # Archivos sin empaquetar (para debug)
```

## 🎨 Agregar Iconos Personalizados

1. Coloca tus iconos en la carpeta `build/`:
   - `icon.ico` para Windows (256x256 o mayor)
   - `icon.icns` para macOS
   - `icon.png` para Linux (512x512 o mayor)

2. Usa herramientas como:
   - https://www.icoconverter.com/
   - https://cloudconvert.com/
   - `electron-icon-builder` (npm)

Ver `build/README-ICONS.md` para más detalles.

## 🔧 Configuración

### package.json - Scripts Disponibles

- `npm run build` - Compila el frontend con Vite
- `npm run build:dev` - Compila en modo desarrollo
- `npm run electron` - Ejecuta Electron (requiere build previo)
- `npm run electron:dev` - Build + Electron
- `npm run dist` - Empaqueta para todas las plataformas
- `npm run dist:win` - Empaqueta solo para Windows
- `npm run build:executable` - Build + Empaquetado Windows

### electron-builder.yml

Configuración principal de empaquetado. Puedes modificar:
- Targets de compilación
- Rutas de archivos incluidos
- Opciones de instalador
- Configuración por plataforma

## 📦 Tipos de Paquetes

### NSIS (Instalador)
- Instalador completo con wizard
- Se instala en `C:\Program Files\CovenantPOS\`
- Crea accesos directos en escritorio y menú inicio
- Incluye desinstalador

### Portable
- Ejecutable único sin instalación
- Se puede ejecutar desde USB
- No requiere permisos de administrador
- Ideal para pruebas rápidas

## 🐛 Solución de Problemas

### Error: "Cannot find module"

```powershell
# Limpiar y reinstalar dependencias
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force backend/node_modules
npm install
cd backend
npm install
cd ..
```

### Error: "index.html not found"

```powershell
# Asegúrate de compilar el frontend primero
npm run build

# Verifica que la carpeta dist existe
dir dist
```

### Error: "electron-builder not found"

```powershell
# Instalar electron-builder globalmente
npm install -g electron-builder

# O usar localmente
npx electron-builder
```

### La aplicación se cierra inmediatamente

1. Revisa los logs en la consola de Electron
2. Verifica que todas las dependencias del backend estén instaladas
3. Asegúrate de que `backend/data.json` existe

## 📊 Tamaño del Paquete

El tamaño final dependerá de:
- Frontend compilado (~5-15 MB)
- Backend + dependencias (~100-200 MB)
- Electron runtime (~150 MB)
- Assets adicionales (imágenes, iconos, etc.)

**Tamaño estimado final:** 250-400 MB

## 🔐 Firma de Código (Code Signing)

Para distribución pública, considera firmar el ejecutable:

```powershell
# Requiere certificado de código válido
# Configura en electron-builder.yml:
win:
  certificateFile: path/to/cert.pfx
  certificatePassword: your-password
```

## 🚢 Distribución

### Opción 1: Distribuir el Instalador
- Sube `CovenantPOS-Setup-1.0.0.exe` a tu servidor
- Los usuarios descargan e instalan

### Opción 2: Distribuir Portable
- Comprime `CovenantPOS-Portable.exe`
- Los usuarios descargan y ejecutan directamente

### Opción 3: Auto-actualización (Avanzado)
- Configura `electron-updater`
- Publica en GitHub Releases o servidor propio
- La app se actualiza automáticamente

## 📝 Notas Importantes

1. **Primera compilación**: Puede tardar varios minutos mientras descarga Electron
2. **Cache**: electron-builder cachea descargas en `%LOCALAPPDATA%\electron-builder\Cache`
3. **Antivirus**: Algunos antivirus pueden marcar el ejecutable como sospechoso (falso positivo)
4. **Permisos**: La versión portable no requiere admin, el instalador sí

## 🔗 Referencias

- [Electron Builder Docs](https://www.electron.build/)
- [Electron Docs](https://www.electronjs.org/docs)
- [Code Signing](https://www.electron.build/code-signing)

## ✅ Checklist Pre-Distribución

- [ ] Compilar en modo producción
- [ ] Probar el instalador en un PC limpio
- [ ] Verificar que todos los recursos se cargan correctamente
- [ ] Probar funcionalidad offline
- [ ] Verificar que el backend inicia correctamente
- [ ] Comprobar el tamaño del ejecutable
- [ ] Agregar iconos personalizados
- [ ] Actualizar número de versión en package.json
- [ ] Crear release notes
- [ ] (Opcional) Firmar el código

---

**¿Problemas?** Revisa los logs de electron-builder en la carpeta `builds/` o abre un issue.
