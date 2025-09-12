// Script de prueba para verificar la extracción de datos del formulario
const testFormData = {
  "Nombre Completo": "martin",
  "Email": "juansalazat1030@gmail.com",
  "Productos o Servicios Requeridos": "Agregue los productos o servicios que necesita cotizar",
  "Item #1": {
    "Nombre del Producto/Servicio": "martillo",
    "Cantidad": "1", 
    "Descripción y Especificaciones": "marillo grande",
    "Rango de Presupuesto Esperado (opcional)": ""
  },
  "numero de ceulular": "31862187924"
};

console.log('=== DATOS DEL FORMULARIO DE PRUEBA ===');
console.log('clientInfo:', testFormData);
console.log('Campos disponibles:', Object.keys(testFormData));

// Función auxiliar para convertir cualquier valor a string legible
const valueToString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) {
    return value.map(item => valueToString(item)).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    if (value.name || value.nombre) return valueToString(value.name || value.nombre);
    if (value.description || value.descripcion) return valueToString(value.description || value.descripcion);
    if (value.text || value.texto) return valueToString(value.text || value.texto);
    if (value.value || value.valor) return valueToString(value.value || value.valor);
    try {
      const str = JSON.stringify(value);
      return str.length < 100 ? str : 'Objeto complejo';
    } catch {
      return 'Datos del cliente';
    }
  }
  return String(value);
};

// Simular la lógica de extracción
const selectedProducts = [];
let foundProducts = false;

// Buscar ítems dinámicos del formulario (Item #1, Item #2, etc.)
const itemKeys = Object.keys(testFormData).filter(key => key.match(/^Item #\d+$/));
console.log('Items encontrados:', itemKeys);

if (itemKeys.length > 0) {
  itemKeys.forEach(itemKey => {
    const item = testFormData[itemKey];
    console.log(`Procesando ${itemKey}:`, item);
    
    if (item && typeof item === 'object') {
      const productName = item['Nombre del Producto/Servicio'] || 
                         item['nombre'] || 
                         item['producto'] || 
                         'Producto no especificado';
      
      const quantity = item['Cantidad'] || 
                      item['cantidad'] || 
                      '1';
      
      const description = item['Descripción y Especificaciones'] || 
                         item['descripcion'] || 
                         '';
      
      const budget = item['Rango de Presupuesto Esperado (opcional)'] || 
                    item['presupuesto'] || 
                    'A cotizar';
      
      let fullProductName = productName;
      if (description && description.trim()) {
        fullProductName += ` - ${description}`;
      }
      
      console.log(`Producto extraído: ${fullProductName}, Cantidad: ${quantity}, Presupuesto: ${budget}`);
      
      selectedProducts.push([
        fullProductName,
        quantity.toString(),
        budget === 'A cotizar' ? 'A cotizar' : budget,
        'A cotizar'
      ]);
      foundProducts = true;
    }
  });
}

console.log('\n=== PRODUCTOS FINALES PARA EL PDF ===');
selectedProducts.forEach((product, index) => {
  console.log(`Producto ${index + 1}:`);
  console.log(`  Nombre: ${product[0]}`);
  console.log(`  Cantidad: ${product[1]}`);
  console.log(`  Precio Unit: ${product[2]}`);
  console.log(`  Total: ${product[3]}`);
});
