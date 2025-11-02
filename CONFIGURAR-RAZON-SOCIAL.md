# 🏢 Cómo Configurar la Razón Social y Datos de tu Empresa

## ✅ Sistema Ya Implementado

La funcionalidad para cambiar la razón social y datos de la empresa **ya está disponible** en tu aplicación. No necesitas programar nada nuevo.

## 📍 ¿Dónde Encontrarlo?

1. **Abre el módulo de Cotizaciones** en el panel de administración
2. En la parte superior verás varios botones
3. Busca el botón **"Configurar Empresa"** con el ícono de edificio 🏢
4. Haz clic en ese botón

## 🔧 Qué Puedes Configurar

El formulario te permite editar los siguientes campos:

- **Nombre de la Empresa** *
  - Ejemplo: "MIRG - HECTOR ROLANDO RAMOS GARCIA"
  - Este es el nombre que aparecerá en todos los PDFs

- **Dirección** *
  - Ejemplo: "4TA VIDRERIA #927 COL 1 DE MAYO EN MONTERREY"
  - La dirección completa de tu empresa

- **Teléfono** *
  - Ejemplo: "811-514-7756 / 811-796-7956"
  - Puedes incluir múltiples números separados por /

- **Email** *
  - Ejemplo: "MIRGTALLER@GMAIL.COM"
  - Email de contacto de la empresa

- **Sitio Web** (opcional)
  - Ejemplo: "RFC: RAGH931025DP4"
  - Puedes incluir RFC, sitio web, o cualquier información adicional

\* = Campos obligatorios

## 💾 ¿Cómo se Guarda?

- Los datos se guardan automáticamente en **localStorage** del navegador
- La información persiste entre sesiones
- Cada vez que generes un PDF, se usará la configuración guardada
- Puedes cambiar estos datos **cuantas veces quieras**

## 📄 ¿Dónde Aparecen Estos Datos?

Los datos configurados aparecen en:

1. **PDFs de Cotización** (función `exportToPDF`)
   - En el encabezado del documento
   - Junto al logo de la empresa
   - Información de contacto

2. **PDFs con Email** (función `exportToPDFAndEmail`)
   - Misma ubicación que arriba
   - Se incluye al enviar por correo

3. **Documentos Word** (función `exportToWord`)
   - En la sección de información de la empresa

## 🔄 Múltiples Razones Sociales

Como mencionaste que usarás **diferentes razones sociales**, simplemente:

1. Antes de generar una cotización para el Cliente A:
   - Abre "Configurar Empresa"
   - Cambia los datos a los del Cliente A
   - Guarda

2. Genera las cotizaciones necesarias

3. Para el Cliente B:
   - Vuelve a abrir "Configurar Empresa"
   - Cambia los datos a los del Cliente B
   - Guarda

4. Genera las nuevas cotizaciones

## 🎯 Vista Previa

El formulario incluye una **vista previa en tiempo real** que muestra cómo se verán los datos en el PDF, para que puedas verificar que todo esté correcto antes de guardar.

## 🚀 Pasos Rápidos

```
1. Panel Admin → Cotizaciones
2. Clic en "Configurar Empresa" 🏢
3. Editar campos
4. Ver vista previa
5. Clic en "Guardar Configuración" 💾
6. ¡Listo! Tus PDFs usarán esta información
```

## 📱 Ubicación del Botón

El botón está ubicado junto a otros controles en la parte superior:

```
[📋 Nueva Cotización Manual] [🔍 Consultar Seguimiento] 
[🏢 Configurar Empresa] [⚙️ Editar Preguntas Frecuentes]
```

## ⚠️ Importante

- Los datos se guardan **localmente** en el navegador
- Si cambias de navegador o dispositivo, necesitarás configurarlos nuevamente
- Si borras los datos del navegador (caché/cookies), perderás la configuración
- Considera hacer un backup manual de esta información

## 🎨 Personalización Adicional

Si necesitas cambiar el **logo** de la empresa, actualmente se usa el logo MIRG por defecto. Para cambiar esto, necesitarías modificar la constante `MIRG_LOGO_BASE64` en el código.

## 🆘 Solución de Problemas

**Problema:** No veo el botón "Configurar Empresa"
- **Solución:** Asegúrate de estar en la pestaña de "Cotizaciones" del panel de administración

**Problema:** Los cambios no se guardan
- **Solución:** Verifica que todos los campos obligatorios (*) estén completados

**Problema:** El PDF sigue mostrando los datos antiguos
- **Solución:** Recarga la página después de guardar la configuración

---

## 💡 Conclusión

**¡El sistema ya está listo para usar!** No necesitas hacer cambios en el código. Simplemente usa el botón "Configurar Empresa" cada vez que necesites cambiar la razón social para diferentes clientes o proyectos.
