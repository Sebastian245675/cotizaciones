# Instrucciones para implementar el tema Covenant en Odoo

## 1. Estructura de archivos

Hemos creado los siguientes archivos personalizados para mejorar la experiencia del ecommerce:

- **covenant_homepage_odoo.xml**: Plantilla principal de la página de inicio
- **covenant_responsive.css**: Estilos CSS responsivos
- **covenant_interactive.js**: Funcionalidades JavaScript para mejorar la interactividad

## 2. Integración en Odoo

### Paso 1: Crear un módulo personalizado

Crea un módulo llamado `covenant_theme` con la siguiente estructura:

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
│   │   │   └── custom.scss
│   │   ├── js/
│   │   │   └── covenant_interactive.js
│   │   └── css/
│   │       └── covenant_responsive.css
│   └── description/
│       └── icon.png
├── views/
│   ├── assets.xml
│   └── templates.xml
└── data/
    └── homepage_data.xml
```

### Paso 2: Configurar el manifiesto

En `__manifest__.py` define:

```python
{
    'name': 'Covenant Theme',
    'version': '1.0',
    'category': 'Theme/Creative',
    'summary': 'Tema para ecommerce de iluminación premium',
    'description': """
        Tema personalizado para Covenant, empresa de iluminación premium.
        - Diseño responsive
        - Animaciones y efectos especiales
        - Optimizado para móviles
        - Experiencia de usuario mejorada
    """,
    'depends': [
        'website',
        'website_sale',
        'website_theme_install',
    ],
    'data': [
        'views/assets.xml',
        'views/templates.xml',
        'data/homepage_data.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'covenant_theme/static/src/css/covenant_responsive.css',
            'covenant_theme/static/src/js/covenant_interactive.js',
        ],
    },
    'images': [
        'static/description/cover.png',
        'static/description/screenshot.png',
    ],
    'installable': True,
    'application': False,
    'auto_install': False,
}
```

### Paso 3: Definir las plantillas

En `views/templates.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <!-- Redefinición de la plantilla de página principal -->
    <template id="covenant_homepage" inherit_id="website.homepage" name="Covenant Homepage">
        <!-- Incluir aquí el contenido del archivo covenant_homepage_odoo.xml -->
    </template>
    
    <!-- Componentes reutilizables -->
    <template id="covenant_product_card" name="Covenant Product Card">
        <div class="oe_product_card">
            <div class="oe_product_image">
                <img t-att-src="product.image_1920" t-att-alt="product.name" class="img img-fluid"/>
                <t t-if="product.has_discount">
                    <span class="covenant-discount-badge">-<t t-esc="product.discount"/>%</span>
                </t>
            </div>
            <div class="card-body p-4">
                <span class="covenant-tag mb-2">
                    <t t-esc="product.default_code or product.categ_id.name"/>
                </span>
                <h5 class="fw-bold text-dark mb-2"><t t-esc="product.name"/></h5>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span t-if="product.has_discount" class="text-decoration-line-through text-muted me-2">
                            <t t-esc="website.currency(product.list_price)"/>
                        </span>
                        <span class="fw-bold" style="color: #FF914D;">
                            <t t-esc="website.currency(product.price)"/>
                        </span>
                    </div>
                    <a href="#" class="btn covenant-btn-primary add-to-cart">
                        <i class="fa fa-shopping-cart"></i>
                    </a>
                </div>
            </div>
        </div>
    </template>
    
    <!-- Componentes para carrusel mejorado -->
    <template id="covenant_product_carousel" name="Covenant Product Carousel">
        <div class="covenant-product-carousel covenant-scroll-animate mb-5">
            <div id="covenant_featured_carousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    <t t-foreach="products" t-as="products_batch">
                        <div t-attf-class="carousel-item#{' active' if products_batch_index == 0 else ''}">
                            <div class="row">
                                <t t-foreach="products_batch" t-as="product">
                                    <div class="col-6 col-md-4 col-lg-3 mb-3">
                                        <t t-call="covenant_theme.covenant_product_card"/>
                                    </div>
                                </t>
                            </div>
                        </div>
                    </t>
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#covenant_featured_carousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true" style="background-color: #FF914D; border-radius: 50%; padding: 15px;"></span>
                    <span class="visually-hidden">Anterior</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#covenant_featured_carousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true" style="background-color: #FF914D; border-radius: 50%; padding: 15px;"></span>
                    <span class="visually-hidden">Siguiente</span>
                </button>
            </div>
        </div>
    </template>
    
    <!-- Plantilla para la barra lateral -->
    <template id="covenant_sidebar" name="Covenant Sidebar">
        <div class="covenant-sidebar accordion accordion-flush covenant-accordion">
            <!-- Sección de categorías -->
            <div class="accordion-item">
                <h2 class="accordion-header d-lg-none">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#categoriesCollapse" aria-expanded="true">
                        Categorías
                    </button>
                </h2>
                <div class="d-none d-lg-block mb-3">
                    <h4 class="fw-bold border-bottom border-primary pb-2 mb-3">Categorías</h4>
                </div>
                <div id="categoriesCollapse" class="accordion-collapse collapse show">
                    <div class="accordion-body p-0">
                        <ul class="list-unstyled">
                            <t t-foreach="request.env['product.public.category'].search([])" t-as="category">
                                <li class="mb-2">
                                    <a t-att-href="'/shop/category/%s' % slug(category)">
                                        <i class="fa fa-angle-right me-2" style="color: #FF914D;"></i>
                                        <t t-esc="category.name"/>
                                        <span class="float-end badge bg-light text-primary">
                                            <t t-esc="env['product.template'].sudo().search_count([('public_categ_ids', 'in', category.id)])"/>
                                        </span>
                                    </a>
                                </li>
                            </t>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Sección de filtros populares -->
            <div class="accordion-item mt-3">
                <h2 class="accordion-header d-lg-none">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#filtersCollapse" aria-expanded="true">
                        Filtros Populares
                    </button>
                </h2>
                <div class="d-none d-lg-block mb-3">
                    <h5 class="fw-bold border-bottom border-light pb-2 mb-3">Filtros Populares</h5>
                </div>
                <div id="filtersCollapse" class="accordion-collapse collapse show">
                    <div class="accordion-body p-0">
                        <div class="d-flex flex-wrap">
                            <a href="/shop?price_min=0&amp;price_max=1000" class="btn btn-sm mb-2 me-2 bg-light text-primary">
                                Hasta $1000
                            </a>
                            <a href="/shop?tags=2" class="btn btn-sm mb-2 me-2 bg-light text-primary">
                                Ofertas
                            </a>
                            <a href="/shop?tags=3" class="btn btn-sm mb-2 me-2 bg-light text-primary">
                                Nuevos
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Sección de testimonios -->
            <div class="accordion-item mt-3">
                <h2 class="accordion-header d-lg-none">
                    <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#testimonialsCollapse" aria-expanded="true">
                        Opiniones de Clientes
                    </button>
                </h2>
                <div class="d-none d-lg-block mb-3">
                    <h5 class="fw-bold border-bottom border-light pb-2 mb-3">Opiniones de Clientes</h5>
                </div>
                <div id="testimonialsCollapse" class="accordion-collapse collapse show">
                    <div class="accordion-body p-0">
                        <div class="covenant-testimonial">
                            <div class="d-flex align-items-center mb-2">
                                <div class="covenant-avatar">MR</div>
                                <div>
                                    <div class="fw-bold">María R.</div>
                                    <div class="covenant-star-rating">★★★★★</div>
                                </div>
                            </div>
                            <p class="small fst-italic text-muted mb-0">
                                "Excelente calidad de iluminación, transformó completamente mi sala de estar."
                            </p>
                        </div>
                        
                        <div class="covenant-testimonial">
                            <div class="d-flex align-items-center mb-2">
                                <div class="covenant-avatar">JP</div>
                                <div>
                                    <div class="fw-bold">Juan P.</div>
                                    <div class="covenant-star-rating">★★★★★</div>
                                </div>
                            </div>
                            <p class="small fst-italic text-muted mb-0">
                                "Las tiras LED son increíbles, muy fáciles de instalar y el soporte técnico excelente."
                            </p>
                        </div>
                        
                        <a href="#" class="btn btn-sm w-100 bg-light text-primary mt-2">
                            <i class="fa fa-comments me-1"></i>Ver más opiniones
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </template>
</odoo>
```

### Paso 4: Registrar los activos

En `views/assets.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <template id="covenant_assets_frontend" inherit_id="website.assets_frontend" name="Covenant Theme Assets">
        <!-- CSS -->
        <xpath expr="." position="inside">
            <link rel="stylesheet" href="/covenant_theme/static/src/css/covenant_responsive.css"/>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&amp;display=swap" rel="stylesheet"/>
        </xpath>
        
        <!-- JS -->
        <xpath expr="//script[last()]" position="after">
            <script type="text/javascript" src="/covenant_theme/static/src/js/covenant_interactive.js"></script>
        </xpath>
    </template>
</odoo>
```

### Paso 5: Configurar la página de inicio

En `data/homepage_data.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
    <data noupdate="1">
        <!-- Configuración de la página de inicio -->
        <record id="website.homepage_page" model="website.page">
            <field name="name">Homepage</field>
            <field name="website_published">True</field>
            <field name="url">/</field>
            <field name="view_id" ref="covenant_theme.covenant_homepage"/>
            <field name="track">True</field>
        </record>
    </data>
</odoo>
```

## 3. Optimización de imágenes

Para un rendimiento óptimo, asegúrate de:

1. Comprimir todas las imágenes para web usando herramientas como TinyPNG
2. Utilizar el formato webp donde sea posible
3. Especificar dimensiones exactas para las imágenes
4. Implementar lazy loading para imágenes no críticas

## 4. Personalización adicional

### Adaptación de colores corporativos

Puedes personalizar los colores principales editando las variables en `covenant_responsive.css`:

```css
:root {
    --covenant-primary: #FF914D;
    --covenant-secondary: #2A2A2D;
    --covenant-light: #F9F9F9;
    /* Añadir más variables de color según necesidades */
}
```

### Mejora de la velocidad de carga

Para optimizar la velocidad:

1. Minifica los archivos CSS y JS en producción
2. Agrupa los recursos pequeños para reducir las solicitudes HTTP
3. Activa la compresión gzip en el servidor
4. Utiliza CDN para los recursos estáticos

## 5. SEO y Marketing

Para mejorar el SEO:

1. Asegúrate de que todas las páginas tengan metaetiquetas personalizadas
2. Utiliza URLs amigables y semánticas
3. Implementa esquemas de microdata/JSON-LD para productos
4. Optimiza las velocidades de carga para mejorar las métricas Core Web Vitals

## 6. Mantenimiento

Recomendamos:

1. Verificar regularmente la responsividad en dispositivos nuevos
2. Actualizar los scripts cuando se actualice Odoo
3. Realizar pruebas de usabilidad para mejorar constantemente
4. Medir métricas de conversión para optimizar continuamente

Para cualquier consulta adicional, contacte al equipo de desarrollo.
