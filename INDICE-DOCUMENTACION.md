# 📚 Índice de Documentación - Empaquetado Electron

Este directorio contiene toda la documentación y scripts necesarios para empaquetar y distribuir CovenantPOS como aplicación de escritorio.

## 🎯 Inicio Rápido

**¿Primera vez empaquetando?** → Lee **`README-EMPAQUETADO.md`**

**¿Quieres construir ahora?** → Ejecuta **`.\build-final.ps1`**

**¿Quieres probar el ejecutable?** → Ejecuta **`.\test-executable.ps1`**

---

## 📖 Documentación Principal

### 1. README-EMPAQUETADO.md
**📄 Guía Principal y Resumen Ejecutivo**

- ✅ Inicio rápido
- ✅ Scripts disponibles
- ✅ Solución de problemas comunes
- ✅ Información técnica
- ✅ Próximos pasos

**Ideal para**: Obtener una visión general completa

---

### 2. EMPAQUETADO-ELECTRON.md
**🔧 Guía Técnica Detallada**

- Requisitos previos
- Preparación del entorno
- Comandos de construcción
- Configuración de electron-builder
- Tipos de paquetes (NSIS, Portable)
- Solución de problemas técnicos
- Firma de código
- Referencias técnicas

**Ideal para**: Entender el proceso técnico en profundidad

---

### 3. APLICACION-EMPAQUETADA.md
**📤 Guía de Pruebas y Distribución**

- Resumen de archivos generados
- Cómo usar la aplicación
- Pruebas recomendadas
- Métodos de distribución
- Solución de problemas comunes
- Personalización
- Actualizaciones

**Ideal para**: Después de empaquetar, para probar y distribuir

---

## 🛠️ Scripts de Construcción

### build-final.ps1 ⭐ RECOMENDADO
**Script principal de construcción completo**

```powershell
.\build-final.ps1           # Build completo
.\build-final.ps1 -Clean    # Limpiar antes de build
.\build-final.ps1 -PortableOnly  # Solo portable
```

**Características**:
- ✅ Verifica dependencias
- ✅ Construye frontend
- ✅ Empaqueta Electron
- ✅ Muestra resumen detallado
- ✅ Interfaz amigable

---

### build-electron.ps1
**Script detallado con logging extendido**

```powershell
.\build-electron.ps1
```

**Características**:
- Limpieza automática
- Verificación de dependencias
- Build del frontend
- Empaquetado con electron-builder
- Resumen de archivos generados

---

### build-portable.ps1
**Script simplificado para versión portable**

```powershell
.\build-portable.ps1
```

**Características**:
- Solo construye versión portable
- Más rápido que el build completo
- Ideal para pruebas rápidas

---

### test-executable.ps1
**Script para probar el ejecutable generado**

```powershell
.\test-executable.ps1
```

**Características**:
- Verifica que el ejecutable existe
- Muestra información del archivo
- Ejecuta la aplicación
- Checklist de pruebas

---

## ⚙️ Archivos de Configuración

### electron-builder.yml
**Configuración principal de electron-builder**

Define:
- Targets de compilación (NSIS, portable)
- Archivos a incluir/excluir
- Configuración por plataforma (Windows, Mac, Linux)
- Opciones de instalador

**Modificar para**: Cambiar opciones de empaquetado

---

### package.json (sección "build")
**Configuración adicional de electron-builder**

Define:
- Información de la aplicación
- Configuración de NSIS
- Directorios de salida
- Targets específicos

**Modificar para**: Cambiar info básica de la app

---

## 🎨 Recursos de Construcción

### build/README-ICONS.md
**Guía para agregar iconos personalizados**

- Formatos requeridos (.ico, .icns, .png)
- Cómo crear iconos
- Servicios en línea recomendados
- Herramientas locales
- electron-icon-builder

**Consultar cuando**: Quieras personalizar el icono de la app

---

### build/icon.svg
**Icono placeholder SVG**

- Icono temporal por defecto
- Reemplazar con tu logo
- Base para generar otros formatos

---

## 📁 Archivos Principales del Proyecto

### pos-desktop.js
**Entry point de Electron**

- Wrapper que carga el main real
- Apunta a `backend/src/electron-main.js`

---

### backend/src/electron-main.js
**Script principal de Electron**

- Crea la ventana de la aplicación
- Maneja rutas de archivos
- Configura DevTools
- Maneja eventos del ciclo de vida

**Modificar para**: Cambiar configuración de ventana, rutas, etc.

---

## 🚀 Flujo de Trabajo Típico

### Primera Construcción

```powershell
# 1. Instalar dependencias (si no están)
npm install
cd backend
npm install
cd ..

# 2. Construir la aplicación
.\build-final.ps1

# 3. Probar el ejecutable
.\test-executable.ps1
```

### Construcciones Subsiguientes

```powershell
# Si solo cambiaste el frontend
npm run build
npx electron-builder --win portable

# Si cambiaste backend o configuración
.\build-final.ps1 -Clean
```

### Personalización

```powershell
# 1. Agregar icono (ver build/README-ICONS.md)
# 2. Modificar package.json (name, version, etc.)
# 3. Reconstruir
.\build-final.ps1
```

---

## 📊 Referencia Rápida

| Necesito... | Consultar... |
|-------------|--------------|
| Empezar rápido | `README-EMPAQUETADO.md` |
| Entender el proceso | `EMPAQUETADO-ELECTRON.md` |
| Probar y distribuir | `APLICACION-EMPAQUETADA.md` |
| Agregar iconos | `build/README-ICONS.md` |
| Construir ahora | `.\build-final.ps1` |
| Probar ejecutable | `.\test-executable.ps1` |
| Solo portable | `.\build-portable.ps1` |
| Cambiar configuración | `electron-builder.yml` |
| Cambiar ventana | `backend/src/electron-main.js` |

---

## 🎓 Recursos de Aprendizaje

### Documentación Oficial

- [Electron Docs](https://www.electronjs.org/docs) - Framework principal
- [Electron Builder](https://www.electron.build/) - Herramienta de empaquetado
- [Vite Docs](https://vitejs.dev/) - Build tool del frontend

### Temas Avanzados

- **Firma de código**: [Code Signing Guide](https://www.electron.build/code-signing)
- **Auto-actualización**: [Auto Update](https://www.electron.build/auto-update)
- **APIs nativas**: [Electron API Demos](https://github.com/electron/electron-api-demos)

---

## 🆘 Soporte

### Problemas Comunes

Consulta la sección "Solución de Problemas" en:
- `README-EMPAQUETADO.md` (problemas generales)
- `EMPAQUETADO-ELECTRON.md` (problemas técnicos)
- `APLICACION-EMPAQUETADA.md` (problemas de ejecución)

### Logs y Debugging

- **Logs de build**: `builds/builder-effective-config.yaml`
- **Logs de Electron**: Revisa la consola al ejecutar
- **DevTools**: F12 en la aplicación en desarrollo

---

## ✅ Checklist de Documentación

Antes de distribuir, asegúrate de haber:

- [ ] Leído `README-EMPAQUETADO.md`
- [ ] Ejecutado `.\build-final.ps1` exitosamente
- [ ] Probado con `.\test-executable.ps1`
- [ ] Verificado que la app funciona correctamente
- [ ] (Opcional) Agregado icono personalizado
- [ ] (Opcional) Actualizado versión en package.json
- [ ] Leído `APLICACION-EMPAQUETADA.md` para distribución

---

## 📝 Notas

- Todos los scripts PowerShell (.ps1) deben ejecutarse desde la raíz del proyecto
- Los ejecutables se generan en la carpeta `builds/`
- El frontend compilado está en `dist/`
- La configuración efectiva se guarda en `builds/builder-effective-config.yaml`

---

**Última actualización**: 3 de noviembre de 2025

**Versión de la documentación**: 1.0.0

---

*¿Tienes sugerencias para mejorar esta documentación? Siéntete libre de actualizarla.*
