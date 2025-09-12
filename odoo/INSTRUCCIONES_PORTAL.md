/* Instrucciones para implementar el nuevo Portal Personalizado */

# Integración del Portal Personalizado en Odoo

## 1. Estructura de archivos

Se han creado/modificado los siguientes archivos:

- `perfil.xml`: Plantilla mejorada para el portal del usuario
- `assets/portal_custom.scss`: Estilos SCSS para personalizar el portal

## 2. Pasos para la implementación

### Paso 1: Crear un módulo personalizado para el portal

Si aún no tienes un módulo personalizado, crea uno con la siguiente estructura:

```
covenant_portal/
├── __init__.py
├── __manifest__.py
├── controllers/
│   ├── __init__.py
│   └── portal.py
├── static/
│   ├── src/
│   │   ├── scss/
│   │   │   └── portal_custom.scss
│   │   └── js/
│   │       └── portal_custom.js
│   └── description/
│       └── icon.png
├── views/
│   ├── assets.xml
│   └── portal_templates.xml
└── security/
    └── ir.model.access.csv
```

### Paso 2: Configurar el manifiesto

En el archivo `__manifest__.py` define:

```python
{
    'name': 'Covenant Portal Personalizado',
    'version': '1.0',
    'category': 'Website/Website',
    'summary': 'Portal personalizado para clientes de Covenant',
    'description': """
        Portal personalizado para clientes de Covenant con diseño mejorado.
        - Interfaz moderna y atractiva
        - Menús personalizados para iluminación
        - Integración con favoritos y seguimiento de pedidos
    """,
    'depends': [
        'portal',
        'website',
        'website_sale',
    ],
    'data': [
        'views/assets.xml',
        'views/portal_templates.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'covenant_portal/static/src/scss/portal_custom.scss',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}
```

### Paso 3: Crear la plantilla del portal

En `views/portal_templates.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Reemplazar la plantilla del portal principal -->
    <template id="portal_my_home" inherit_id="portal.portal_my_home" name="Custom Portal Homepage">
        <!-- Aquí insertar el contenido de perfil.xml -->
    </template>
    
    <!-- Estilos adicionales del portal -->
    <template id="assets_frontend" inherit_id="website.assets_frontend" name="Covenant Portal Assets">
        <xpath expr="//link[last()]" position="after">
            <link rel="stylesheet" type="text/css" href="/covenant_portal/static/src/scss/portal_custom.scss"/>
        </xpath>
    </template>
</odoo>
```

### Paso 4: Registrar variables adicionales en el controlador

Para que las estadísticas y datos personalizados funcionen, necesitarás ampliar el controlador del portal. En `controllers/portal.py`:

```python
from odoo import http, _
from odoo.http import request
from odoo.addons.portal.controllers.portal import CustomerPortal

class CovenantCustomerPortal(CustomerPortal):
    
    @http.route(['/my', '/my/home'], type='http', auth="user", website=True)
    def home(self, **kw):
        # Heredamos el comportamiento estándar
        response = super(CovenantCustomerPortal, self).home(**kw)
        
        # Añadimos nuestras variables personalizadas
        user = request.env.user
        values = response.qcontext
        
        # Contador de pedidos
        order_count = request.env['sale.order'].search_count([
            ('message_partner_ids', 'child_of', [user.partner_id.id]),
            ('state', 'in', ['sale', 'done'])
        ])
        values['user_orders_count'] = order_count
        
        # Contador de favoritos (si tienes el módulo de favoritos instalado)
        if 'website_sale_wishlist' in request.env['ir.module.module']._installed():
            wishlist_count = request.env['product.wishlist'].search_count([
                ('partner_id', '=', user.partner_id.id)
            ])
            values['user_wishlists_count'] = wishlist_count
        else:
            values['user_wishlists_count'] = 0
            
        # Contador de envíos activos
        shipments_count = request.env['stock.picking'].search_count([
            ('partner_id', '=', user.partner_id.id),
            ('state', 'not in', ['done', 'cancel'])
        ])
        values['user_shipments_count'] = shipments_count
        
        return response
```

### Paso 5: Activar el módulo

1. Coloca los archivos en la estructura correcta
2. Reinicia el servidor Odoo
3. Instala el nuevo módulo desde Aplicaciones
4. Limpia la caché del navegador si es necesario

## 3. Personalización

Si deseas personalizar aún más el portal:

- **Colores y estilos**: Modifica las variables en `portal_custom.scss`
- **Secciones**: Añade o elimina secciones en el archivo `perfil.xml`
- **Nuevas funcionalidades**: Extiende el controlador en `controllers/portal.py`

## 4. Características del nuevo portal

- Diseño moderno con tarjetas para cada sección
- Panel de estadísticas con contador de pedidos y favoritos
- Navegación intuitiva con iconos descriptivos
- Diseño responsive para móviles y tablets
- Paleta de colores coherente con la marca Covenant
- Animaciones y efectos visuales sutiles
- Área de soporte y contacto rápido
- Integración con el sistema de favoritos y pedidos
