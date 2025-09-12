# Integración de SCSS en Odoo

## Solución para el archivo SCSS

Hemos identificado que el problema de visualización se debe a que estás utilizando un archivo SCSS en lugar de CSS. Odoo tiene un sistema específico para compilar SCSS, y necesitamos asegurarnos de que tu archivo se integre correctamente.

## Pasos para la correcta integración

### 1. Estructura correcta del módulo

Asegúrate de que tu archivo SCSS esté ubicado en el directorio correcto:

```
covenant_theme/
├── __init__.py
├── __manifest__.py
├── controllers/
│   ├── __init__.py
│   └── main.py
├── static/
│   ├── src/
│   │   ├── scss/
│   │   │   └── covenant_responsive.scss  # Tu archivo SCSS aquí
│   │   └── js/
│   │       └── covenant_interactive.js
│   └── description/
│       └── icon.png
└── views/
    ├── assets.xml
    └── templates.xml
```

### 2. Registro adecuado en el manifest

En tu archivo `__manifest__.py`, asegúrate de registrar correctamente el asset SCSS:

```python
{
    # Otros campos del manifiesto...
    'assets': {
        'web.assets_frontend': [
            'covenant_theme/static/src/scss/covenant_responsive.scss',
            'covenant_theme/static/src/js/covenant_interactive.js',
        ],
    },
}
```

### 3. Definición de assets en XML (alternativa)

Si prefieres definir los assets en XML en lugar del manifest, puedes hacerlo así:

```xml
<!-- En tu archivo views/assets.xml -->
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <data>
        <template id="assets_frontend" inherit_id="web.assets_frontend" name="Covenant Theme Assets">
            <xpath expr="." position="inside">
                <link rel="stylesheet" type="text/scss" href="/covenant_theme/static/src/scss/covenant_responsive.scss"/>
                <script type="text/javascript" src="/covenant_theme/static/src/js/covenant_interactive.js"/>
            </xpath>
        </template>
    </data>
</odoo>
```

### 4. Aprovechar las variables de Bootstrap

Odoo usa Bootstrap, por lo que puedes aprovechar sus variables en tu archivo SCSS:

```scss
// Al inicio de tu archivo covenant_responsive.scss
$primary: #FF914D; // Define tu color principal

// Resto de tu código SCSS
.covenant-btn-primary {
    background-color: $primary;
    border-color: $primary;
    color: white;
}
```

### 5. Crear un hook para Bootstrap

Para una mejor integración con Bootstrap, puedes crear un archivo adicional que importe Bootstrap y sobreescriba sus variables:

```scss
// En covenant_theme/static/src/scss/_variables.scss
$primary: #FF914D;
$border-radius: 16px;
$font-family-sans-serif: 'Poppins', sans-serif;

// Luego importarlo en covenant_responsive.scss
@import "variables";
```

## Solución específica para acordeón móvil

Para el problema del acordeón en móvil, asegúrate de que tus clases SCSS no entren en conflicto con las de Bootstrap. Puedes utilizar un prefijo único para tus clases o encapsular tu código así:

```scss
// Ejemplo de encapsulación para evitar conflictos
.covenant-theme {
    .accordion-button:not(.collapsed) {
        background-color: rgba(255,145,77,0.05) !important;
        color: #FF914D !important;
        box-shadow: none !important;
    }
    
    // Resto de tus estilos
}
```

## Depuración

Si después de aplicar estos cambios sigues teniendo problemas:

1. Activa el modo de desarrollo en Odoo
2. Inspecciona el HTML generado con las herramientas de desarrollador del navegador
3. Verifica si hay errores de compilación de SASS en la consola del navegador
4. Comprueba que el archivo SCSS se esté incluyendo correctamente en el HTML

## Compilación manual para pruebas

Si quieres verificar que tu SCSS está bien formado, puedes compilarlo manualmente para pruebas:

```bash
# Instala sass si no lo tienes
npm install -g sass

# Compila el archivo
sass covenant_responsive.scss covenant_responsive.css

# Revisa si hay errores o advertencias
```

Esto te permitirá ver si hay problemas de sintaxis en tu SCSS antes de integrarlo en Odoo.
