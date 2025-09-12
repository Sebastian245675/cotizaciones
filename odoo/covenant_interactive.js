/**
 * COVENANT THEME - Interactividad para ecommerce
 * 
 * Este archivo contiene todas las funcionalidades JavaScript para mejorar
 * la experiencia de usuario en el sitio ecommerce de Covenant.
 */

odoo.define('covenant.website_sale', function (require) {
    'use strict';

    var publicWidget = require('web.public.widget');
    var core = require('web.core');
    var _t = core._t;
    var concurrency = require('web.concurrency');
    var utils = require('web.utils');

    // Dropdown de categorías para móvil
    publicWidget.registry.CovenantCategoriesDropdown = publicWidget.Widget.extend({
        selector: '.covenant-categories-dropdown',
        events: {
            'click .dropdown-toggle': '_onToggleClick',
        },
        
        /**
         * Maneja el clic en el toggle del dropdown
         * @private
         * @param {Event} ev
         */
        _onToggleClick: function (ev) {
            $(ev.currentTarget).parent().toggleClass('show');
            $(ev.currentTarget).next('.dropdown-menu').toggleClass('show');
        },
    });

    // Animaciones para productos
    publicWidget.registry.CovenantProductsAnimations = publicWidget.Widget.extend({
        selector: '.oe_product_card',
        events: {
            'mouseenter': '_onMouseEnter',
            'mouseleave': '_onMouseLeave',
        },
        
        /**
         * Aplica efectos al pasar el cursor por productos
         * @private
         */
        _onMouseEnter: function (ev) {
            var $card = $(ev.currentTarget);
            $card.find('.oe_product_image img').css('transform', 'scale(1.05)');
            $card.addClass('covenant-shadow-hover');
        },
        
        /**
         * Elimina efectos al quitar el cursor de productos
         * @private
         */
        _onMouseLeave: function (ev) {
            var $card = $(ev.currentTarget);
            $card.find('.oe_product_image img').css('transform', '');
            $card.removeClass('covenant-shadow-hover');
        },
    });

    // Efecto de añadir al carrito
    publicWidget.registry.CovenantAddToCartAnimation = publicWidget.Widget.extend({
        selector: '.o_add_wishlist, .o_add_cart_json',
        events: {
            'click': '_onAddClick',
        },
        
        /**
         * Aplica animación al hacer click en añadir
         * @private
         * @param {Event} ev
         */
        _onAddClick: function (ev) {
            var $button = $(ev.currentTarget);
            $button.addClass('add-to-cart-animation');
            setTimeout(function() {
                $button.removeClass('add-to-cart-animation');
            }, 500);
        },
    });

    // Carrusel de productos mejorado
    publicWidget.registry.CovenantProductCarousel = publicWidget.Widget.extend({
        selector: '.covenant-product-carousel',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initCarousel();
            });
        },
        
        /**
         * Inicializa el carrusel con opciones avanzadas
         * @private
         */
        _initCarousel: function () {
            var $carousel = this.$('.carousel');
            
            // Detectar si es móvil para configurar opciones
            var isMobile = window.matchMedia("(max-width: 767px)").matches;
            
            $carousel.carousel({
                interval: isMobile ? 4000 : 6000,
                pause: 'hover',
                keyboard: true,
                touch: true
            });
            
            // Añadir indicadores dinámicos si no existen
            if ($carousel.find('.carousel-indicators').length === 0 && $carousel.find('.carousel-item').length > 1) {
                this._createCarouselIndicators($carousel);
            }
            
            // Mejorar navegación táctil
            this._setupTouchSwipe($carousel);
        },
        
        /**
         * Crea indicadores para el carrusel
         * @private
         * @param {jQuery} $carousel
         */
        _createCarouselIndicators: function ($carousel) {
            var $items = $carousel.find('.carousel-item');
            var $indicators = $('<ol/>', {'class': 'carousel-indicators'});
            
            $items.each(function (index) {
                var $indicator = $('<li/>', {
                    'data-bs-target': '#' + $carousel.attr('id'),
                    'data-bs-slide-to': index
                });
                
                if (index === 0) {
                    $indicator.addClass('active');
                }
                
                $indicators.append($indicator);
            });
            
            $carousel.append($indicators);
        },
        
        /**
         * Configura gestos táctiles para el carrusel
         * @private
         * @param {jQuery} $carousel
         */
        _setupTouchSwipe: function ($carousel) {
            var touchStartX = 0;
            var touchEndX = 0;
            var minSwipeDistance = 50;
            
            $carousel.on('touchstart', function (ev) {
                touchStartX = ev.originalEvent.touches[0].clientX;
            });
            
            $carousel.on('touchend', function (ev) {
                touchEndX = ev.originalEvent.changedTouches[0].clientX;
                handleSwipe();
            });
            
            function handleSwipe() {
                if (touchStartX - touchEndX > minSwipeDistance) {
                    $carousel.carousel('next');
                }
                
                if (touchEndX - touchStartX > minSwipeDistance) {
                    $carousel.carousel('prev');
                }
            }
        }
    });

    // Sidebar sticky responsiva
    publicWidget.registry.CovenantStickySidebar = publicWidget.Widget.extend({
        selector: '.covenant-sidebar',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initStickiness();
                $(window).on('resize.covenant_sidebar', _.debounce(function () {
                    self._initStickiness();
                }, 200));
            });
        },
        
        /**
         * @override
         */
        destroy: function () {
            $(window).off('resize.covenant_sidebar');
            this._super.apply(this, arguments);
        },
        
        /**
         * Inicializa comportamiento sticky según tamaño de pantalla
         * @private
         */
        _initStickiness: function () {
            var $sidebar = this.$el;
            var isMobile = window.matchMedia("(max-width: 991px)").matches;
            
            if (isMobile) {
                $sidebar.css('position', 'static');
            } else {
                var headerHeight = $('.o_header_standard').outerHeight() || 100;
                $sidebar.css({
                    'position': 'sticky',
                    'top': headerHeight + 20 + 'px'
                });
            }
        }
    });

    // Lazy loading para imágenes
    publicWidget.registry.CovenantLazyLoading = publicWidget.Widget.extend({
        selector: '.covenant-lazy-container',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._setupLazyLoad();
            });
        },
        
        /**
         * Configura lazy loading para imágenes
         * @private
         */
        _setupLazyLoad: function () {
            var $images = this.$('img[data-src]');
            
            if ('IntersectionObserver' in window) {
                var imageObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            var $img = $(entry.target);
                            $img.attr('src', $img.data('src'));
                            $img.removeAttr('data-src');
                            imageObserver.unobserve(entry.target);
                        }
                    });
                });
                
                $images.each(function() {
                    imageObserver.observe(this);
                });
            } else {
                // Fallback para navegadores sin IntersectionObserver
                $images.each(function() {
                    $(this).attr('src', $(this).data('src'));
                    $(this).removeAttr('data-src');
                });
            }
        }
    });

    // Animaciones al hacer scroll
    publicWidget.registry.CovenantScrollAnimations = publicWidget.Widget.extend({
        selector: '.covenant-scroll-animate',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initScrollAnimations();
                $(window).on('scroll.covenant_animations', _.throttle(function () {
                    self._checkElements();
                }, 100));
            });
        },
        
        /**
         * @override
         */
        destroy: function () {
            $(window).off('scroll.covenant_animations');
            this._super.apply(this, arguments);
        },
        
        /**
         * Inicializa las animaciones al scroll
         * @private
         */
        _initScrollAnimations: function () {
            this.$('.covenant-animate').addClass('covenant-animate-wait');
            this._checkElements();
        },
        
        /**
         * Comprueba elementos en viewport para animar
         * @private
         */
        _checkElements: function () {
            var self = this;
            var $elements = this.$('.covenant-animate-wait');
            
            $elements.each(function () {
                if (self._isElementInViewport(this)) {
                    $(this).removeClass('covenant-animate-wait').addClass('covenant-fade-in');
                }
            });
        },
        
        /**
         * Verifica si un elemento está visible en viewport
         * @private
         * @param {HTMLElement} el - Elemento a comprobar
         * @returns {Boolean}
         */
        _isElementInViewport: function (el) {
            var rect = el.getBoundingClientRect();
            var windowHeight = window.innerHeight || document.documentElement.clientHeight;
            
            return (
                rect.top <= windowHeight * 0.8 &&
                rect.bottom >= 0
            );
        }
    });

    // Optimización para pantallas táctiles
    publicWidget.registry.CovenantTouchOptimizer = publicWidget.Widget.extend({
        selector: 'body',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._optimizeForTouch();
            });
        },
        
        /**
         * Ajusta elementos para mejor experiencia táctil
         * @private
         */
        _optimizeForTouch: function () {
            if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
                // Agregar clase para estilos específicos touch
                $('body').addClass('covenant-touch-device');
                
                // Aumentar área de clic para elementos pequeños
                $('.btn-sm, .nav-link, .page-link').css({
                    'min-height': '44px',
                    'min-width': '44px'
                });
                
                // Eliminar efectos hover que puedan causar problemas
                $('.covenant-hover-only').removeClass('covenant-hover-only');
            }
        }
    });

    // Mejora para formularios y validación
    publicWidget.registry.CovenantFormEnhancer = publicWidget.Widget.extend({
        selector: 'form.covenant-enhanced-form',
        events: {
            'submit': '_onFormSubmit',
            'focus input, textarea': '_onFieldFocus',
            'blur input, textarea': '_onFieldBlur',
        },
        
        /**
         * Maneja el envío del formulario
         * @private
         * @param {Event} ev
         */
        _onFormSubmit: function (ev) {
            var $form = $(ev.currentTarget);
            if (!this._validateForm($form)) {
                ev.preventDefault();
                ev.stopPropagation();
            }
            $form.addClass('was-validated');
        },
        
        /**
         * Aplica efectos al enfocar un campo
         * @private
         * @param {Event} ev
         */
        _onFieldFocus: function (ev) {
            var $field = $(ev.target);
            $field.closest('.form-group').addClass('covenant-field-focus');
        },
        
        /**
         * Maneja evento al perder foco de un campo
         * @private
         * @param {Event} ev
         */
        _onFieldBlur: function (ev) {
            var $field = $(ev.target);
            $field.closest('.form-group').removeClass('covenant-field-focus');
            this._validateField($field);
        },
        
        /**
         * Valida un campo individual
         * @private
         * @param {jQuery} $field - Campo a validar
         * @returns {Boolean} - True si es válido
         */
        _validateField: function ($field) {
            var isValid = true;
            var $feedbackEl = $field.siblings('.invalid-feedback');
            
            // Limpiar mensajes anteriores
            $feedbackEl.text('');
            
            // Validar campo según tipo y requerimientos
            if ($field.prop('required') && !$field.val().trim()) {
                isValid = false;
                $feedbackEl.text(_t('Este campo es obligatorio'));
            } else if ($field.attr('type') === 'email' && $field.val().trim()) {
                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test($field.val().trim())) {
                    isValid = false;
                    $feedbackEl.text(_t('Por favor, ingresa un email válido'));
                }
            }
            
            // Aplicar clases de validación
            $field.toggleClass('is-invalid', !isValid);
            $field.toggleClass('is-valid', isValid && $field.val().trim());
            
            return isValid;
        },
        
        /**
         * Valida el formulario completo
         * @private
         * @param {jQuery} $form - Formulario a validar
         * @returns {Boolean} - True si es válido
         */
        _validateForm: function ($form) {
            var self = this;
            var isFormValid = true;
            
            $form.find('input, textarea, select').each(function () {
                var $field = $(this);
                if (!self._validateField($field)) {
                    isFormValid = false;
                }
            });
            
            return isFormValid;
        },
    });

    // Animaciones para contador de productos
    publicWidget.registry.CovenantCountersAnimation = publicWidget.Widget.extend({
        selector: '.covenant-counter',
        
        /**
         * @override
         */
        start: function () {
            var self = this;
            return this._super.apply(this, arguments).then(function () {
                self._initCounters();
            });
        },
        
        /**
         * Inicializa contadores animados
         * @private
         */
        _initCounters: function () {
            var self = this;
            var $counters = this.$('.covenant-count-number');
            
            // Usar IntersectionObserver si está disponible
            if ('IntersectionObserver' in window) {
                var counterObserver = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) {
                        if (entry.isIntersecting) {
                            self._animateCounter($(entry.target));
                            counterObserver.unobserve(entry.target);
                        }
                    });
                }, {
                    threshold: 0.2
                });
                
                $counters.each(function() {
                    counterObserver.observe(this);
                });
            } else {
                // Fallback para navegadores antiguos
                $counters.each(function() {
                    self._animateCounter($(this));
                });
            }
        },
        
        /**
         * Anima un contador individual
         * @private
         * @param {jQuery} $counter - Elemento contador
         */
        _animateCounter: function ($counter) {
            var target = parseInt($counter.text().replace(/\D/g, ''));
            var duration = parseInt($counter.data('duration') || 2000);
            var startTime = null;
            var formatter = $counter.data('formatter');
            
            function formatNumber(num) {
                if (formatter === 'comma') {
                    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                } else if (formatter === 'plus' && num >= 1000) {
                    return Math.floor(num/1000) + 'k+';
                }
                return num;
            }
            
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                var currentValue = Math.floor(progress * target);
                $counter.text(formatNumber(currentValue));
                
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    $counter.text(formatNumber(target));
                }
            }
            
            window.requestAnimationFrame(step);
        }
    });

    // Inicialización general
    $(document).ready(function() {
        // Detectar scroll para cambios de apariencia de la navegación
        $(window).scroll(function() {
            if ($(this).scrollTop() > 100) {
                $('.o_header_standard').addClass('covenant-header-scrolled');
            } else {
                $('.o_header_standard').removeClass('covenant-header-scrolled');
            }
        });
        
        // Aplicar smooth scroll a enlaces internos
        $('a[href^="#"]:not([href="#"])').click(function(e) {
            var target = $(this.hash);
            if (target.length) {
                e.preventDefault();
                $('html, body').animate({
                    scrollTop: target.offset().top - 80
                }, 800);
                return false;
            }
        });
    });

    return {
        CovenantCategoriesDropdown: publicWidget.registry.CovenantCategoriesDropdown,
        CovenantProductsAnimations: publicWidget.registry.CovenantProductsAnimations,
        CovenantAddToCartAnimation: publicWidget.registry.CovenantAddToCartAnimation,
        CovenantProductCarousel: publicWidget.registry.CovenantProductCarousel,
        CovenantStickySidebar: publicWidget.registry.CovenantStickySidebar,
        CovenantLazyLoading: publicWidget.registry.CovenantLazyLoading,
        CovenantScrollAnimations: publicWidget.registry.CovenantScrollAnimations,
        CovenantTouchOptimizer: publicWidget.registry.CovenantTouchOptimizer,
        CovenantFormEnhancer: publicWidget.registry.CovenantFormEnhancer,
        CovenantCountersAnimation: publicWidget.registry.CovenantCountersAnimation,
    };
});
