// Script para limpiar localStorage y probar el sistema de modos
// Ejecutar en la consola del navegador

console.log('🔧 Limpiando configuración del modo...');

// Limpiar el modo guardado
localStorage.removeItem('adminMode');

// Verificar que se limpio
console.log('📋 Modo actual en localStorage:', localStorage.getItem('adminMode'));

// Recargar la página para probar
console.log('🔄 Recarga la página para ver el selector de modo');

// Para probar los modos individualmente:
console.log('🧪 Para probar manualmente:');
console.log('- E-commerce: localStorage.setItem("adminMode", "ecommerce")');
console.log('- POS: localStorage.setItem("adminMode", "pos")');  
console.log('- Híbrido: localStorage.setItem("adminMode", "hybrid")');
