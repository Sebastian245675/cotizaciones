# 📦 CovenantPOS - Aplicación Desktop Empaquetada

## 🎯 Resumen Ejecutivo

Tu sistema de cotizaciones ha sido empaquetado exitosamente como una aplicación de escritorio Windows usando **Electron**. Ahora puedes distribuir un único archivo ejecutable (.exe) que incluye toda la aplicación.

## ✅ Estado Actual

- ✅ **Frontend construido**: Vite build completado
- ✅ **Backend empaquetado**: Servidor Express incluido
- ✅ **Electron configurado**: Aplicación desktop funcional
- ✅ **Ejecutable generado**: CovenantPOS-Portable.exe (~237 MB)
- ✅ **Listo para distribuir**: Sin dependencias externas

## 🚀 Inicio Rápido

### Construir la Aplicación

```powershell
# Método 1: Script automatizado (Recomendado)
.\build-final.ps1

# Método 2: Comandos individuales
npm run build                                    # Construir frontend
npx electron-builder --win portable             # Empaquetar Electron
```

### Probar la Aplicación

```powershell
# Opción 1: Usar script de prueba
.\test-executable.ps1

# Opción 2: Ejecutar directamente
.\builds\CovenantPOS-Portable.exe
```

## 📁 Estructura de Archivos

```
cotizaciones/
├── builds/                              # 🎁 Aplicaciones empaquetadas
│   ├── CovenantPOS-Portable.exe        # Ejecutable portable (237 MB)
│   ├── win-unpacked/                   # Archivos desempaquetados
│   └── builder-effective-config.yaml   # Configuración efectiva
├── dist/                                # Frontend compilado
├── backend/                             # Backend del servidor
│   └── src/
│       └── electron-main.js            # Script principal de Electron
├── build/                               # Recursos de construcción
│   └── README-ICONS.md                 # Guía para agregar iconos
├── pos-desktop.js                       # Entry point de Electron
├── electron-builder.yml                 # Configuración de empaquetado
├── build-final.ps1                      # ⭐ Script de construcción principal
├── build-portable.ps1                   # Script solo portable
├── test-executable.ps1                  # Script de prueba
├── EMPAQUETADO-ELECTRON.md             # 📖 Documentación completa
└── APLICACION-EMPAQUETADA.md           # 📖 Guía de distribución
```

## 🛠️ Scripts Disponibles

| Script | Descripción | Uso |
|--------|-------------|-----|
| `build-final.ps1` | Construcción completa (frontend + Electron) | `.\build-final.ps1` |
| `build-portable.ps1` | Solo versión portable | `.\build-portable.ps1` |
| `build-electron.ps1` | Build con más opciones | `.\build-electron.ps1` |
| `test-executable.ps1` | Probar el ejecutable | `.\test-executable.ps1` |

### Opciones de build-final.ps1

```powershell
.\build-final.ps1                       # Build completo (portable + NSIS)
.\build-final.ps1 -Clean                # Limpiar antes de construir
.\build-final.ps1 -SkipBuild            # Usar dist existente
.\build-final.ps1 -PortableOnly         # Solo portable
.\build-final.ps1 -NsisOnly             # Solo instalador NSIS
```

## 📦 Tipos de Paquetes

### 1. Portable (Recomendado)
- **Archivo**: `CovenantPOS-Portable.exe`
- **Tamaño**: ~237 MB
- **Ventajas**:
  - No requiere instalación
  - Ejecutar directamente
  - Ideal para USB o distribución rápida
- **Uso**: Doble clic para ejecutar

### 2. Instalador NSIS (Opcional)
- **Archivo**: `CovenantPOS Setup 1.0.0.exe`
- **Tamaño**: ~240 MB
- **Ventajas**:
  - Instalación profesional con wizard
  - Accesos directos automáticos
  - Integración con Windows
  - Desinstalador incluido

## 🎨 Personalización

### Agregar Icono Personalizado

1. Crea o consigue un icono de 512x512 px
2. Convierte a formato .ico (usa https://icoconverter.com)
3. Guarda como `build/icon.ico`
4. Reconstruye: `.\build-final.ps1`

Ver `build/README-ICONS.md` para más detalles.

### Cambiar Información de la App

Edita `package.json`:

```json
{
  "name": "tu-nombre-app",
  "version": "1.0.0",
  "description": "Tu descripción",
  "author": "Tu Nombre",
  "build": {
    "productName": "Tu Nombre Visible"
  }
}
```

## 📤 Distribución

### Método 1: Compartir Directamente

```powershell
# Comprimir
Compress-Archive -Path ".\builds\CovenantPOS-Portable.exe" -DestinationPath ".\CovenantPOS-v1.0.0.zip"

# Compartir el ZIP por:
# - Email
# - Google Drive
# - Dropbox
# - OneDrive
```

### Método 2: GitHub Releases (Profesional)

```bash
# 1. Crear tag de versión
git tag -a v1.0.0 -m "Primera versión estable"
git push origin v1.0.0

# 2. En GitHub:
#    - Ve a Releases
#    - Create a new release
#    - Sube CovenantPOS-Portable.exe
#    - Publica
```

### Método 3: Servidor Web

Sube a tu servidor y comparte el enlace de descarga.

## 🔧 Solución de Problemas

### Error: "npm not found"

```powershell
# Verifica instalación de Node.js
node --version
npm --version

# Si no están instalados, descarga de: https://nodejs.org/
```

### Error: "electron-builder failed"

```powershell
# Limpiar cache y reinstalar
Remove-Item -Recurse node_modules
npm install

# Limpiar cache de electron-builder
Remove-Item -Recurse "$env:LOCALAPPDATA\electron-builder\Cache"
```

### El ejecutable no abre

1. **Antivirus bloqueando**: Agrega excepción en Windows Defender
2. **Archivo corrupto**: Reconstruye la aplicación
3. **Falta .NET Framework**: Windows 10/11 ya lo incluye

### Ventana en blanco

```powershell
# Reconstruir frontend
npm run build

# Verificar que dist/index.html existe
dir dist\index.html

# Reconstruir ejecutable
.\build-final.ps1
```

## 📊 Información Técnica

### Tecnologías Utilizadas

- **Electron**: v38.1.2 - Framework para apps desktop
- **Vite**: v5.4.10 - Build tool del frontend
- **Express**: Backend server
- **React**: Frontend framework
- **electron-builder**: Empaquetador

### Compatibilidad

- ✅ Windows 10 (64-bit)
- ✅ Windows 11 (64-bit)
- ✅ Windows Server 2016+
- ⚠️ Windows 7/8 (requiere configuración adicional)

### Tamaños

- **Portable**: ~237 MB
- **Instalador**: ~240 MB
- **Instalado**: ~350 MB
- **Frontend solo**: ~10-20 MB

### Tiempo de Construcción

- Frontend (Vite): ~2-3 min
- Empaquetado (Electron): ~1-2 min
- **Total**: ~3-5 min

## 📖 Documentación Completa

- **`EMPAQUETADO-ELECTRON.md`**: Guía técnica detallada de empaquetado
- **`APLICACION-EMPAQUETADA.md`**: Guía completa de pruebas y distribución
- **`build/README-ICONS.md`**: Cómo agregar iconos personalizados

## 🚨 Notas Importantes

### Firma de Código

⚠️ La aplicación **NO está firmada digitalmente**. Esto significa:

- Windows puede mostrar "Editor desconocido"
- SmartScreen puede advertir al usuario
- Algunos antivirus pueden ser cautelosos

**Para producción profesional**: Considera obtener un certificado de firma ($50-$400/año)

### Primera Ejecución

En la primera ejecución, Windows puede:
1. Mostrar advertencia de SmartScreen
2. Solicitar permisos de administrador (para instalador)
3. Preguntar si confías en el editor

**Esto es normal** para aplicaciones sin firmar.

## ✨ Próximos Pasos

- [ ] Probar en diferentes PCs Windows
- [ ] Agregar icono personalizado
- [ ] Considerar firma de código para producción
- [ ] Implementar sistema de actualizaciones automáticas
- [ ] Crear documentación de usuario final
- [ ] Publicar en GitHub Releases

## 🆘 Ayuda y Soporte

### Recursos

- [Documentación de Electron](https://www.electronjs.org/docs)
- [Electron Builder Docs](https://www.electron.build/)
- [Guía de Firma de Código](https://www.electron.build/code-signing)

### Contacto

Para soporte técnico o preguntas, consulta la documentación completa en los archivos MD mencionados.

---

## 🎉 ¡Felicitaciones!

Tu aplicación está **completamente empaquetada** y **lista para distribuir**. 

**Archivo principal**: `builds/CovenantPOS-Portable.exe`

**Para empezar**: `.\test-executable.ps1`

---

*Última actualización: 3 de noviembre de 2025*
