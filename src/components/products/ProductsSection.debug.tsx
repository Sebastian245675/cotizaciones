// Función para depuración de productos y categorías
export function debugProducts(products, selectedCategory, selectedSubcategory, selectedTerceraCategoria, categories) {
  console.log('======= DEPURACIÓN DE FILTRADO =======');
  console.log('Selecciones actuales:', {
    categoria: selectedCategory,
    subcategoria: selectedSubcategory,
    terceraCategoria: selectedTerceraCategoria
  });
  
  // 1. Mostrar información sobre la categoría seleccionada
  const selectedCatObj = categories.find(cat => cat.name === selectedCategory);
  console.log('Categoría seleccionada:', {
    nombre: selectedCategory,
    id: selectedCatObj?.id || 'no encontrado'
  });
  
  // 2. Mostrar información sobre la subcategoría seleccionada
  if (selectedSubcategory !== 'Todas') {
    const selectedSubObj = categories.find(cat => cat.name === selectedSubcategory);
    console.log('Subcategoría seleccionada:', {
      nombre: selectedSubcategory,
      id: selectedSubObj?.id || 'no encontrado',
      parentId: selectedSubObj?.parentId,
      parentName: selectedSubObj?.parentName
    });
  }
  
  // 3. Mostrar información sobre la tercera categoría seleccionada
  if (selectedTerceraCategoria !== 'Todas') {
    const selectedTercObj = categories.find(cat => cat.name === selectedTerceraCategoria);
    console.log('Tercera categoría seleccionada:', {
      nombre: selectedTerceraCategoria,
      id: selectedTercObj?.id || 'no encontrado',
      parentId: selectedTercObj?.parentId,
      parentName: selectedTercObj?.parentName
    });
  }
  
  // 4. Mostrar primeros 5 productos para depuración
  console.log('Muestra de productos disponibles:');
  products.slice(0, 5).forEach((product, i) => {
    console.log(`Producto #${i+1}: ${product.name}`, {
      id: product.id,
      categoria: {
        id: product.category,
        nombre: product.categoryName
      },
      subcategoria: {
        id: product.subcategory,
        nombre: product.subcategoryName
      },
      terceraCategoria: {
        id: product.terceraCategoria,
        nombre: product.terceraCategoriaName
      }
    });
  });
  
  // 5. Verificar qué productos coinciden con las selecciones actuales
  if (selectedSubcategory !== 'Todas' || selectedTerceraCategoria !== 'Todas') {
    // Buscar productos que coincidan con la selección actual
    const matchingProducts = products.filter(product => {
      // Filtro por categoría principal
      if (selectedCategory !== 'Todos') {
        const matchesCategoryName = product.categoryName?.toLowerCase() === selectedCategory.toLowerCase();
        const matchesCategoryId = selectedCatObj && product.category === selectedCatObj.id;
        if (!matchesCategoryName && !matchesCategoryId) return false;
      }
      
      // Filtro por subcategoría
      if (selectedSubcategory !== 'Todas') {
        const selectedSubObj = categories.find(cat => cat.name === selectedSubcategory);
        const matchesSubcategoryName = product.subcategoryName?.toLowerCase() === selectedSubcategory.toLowerCase();
        const matchesSubcategoryId = selectedSubObj && product.subcategory === selectedSubObj.id;
        if (!matchesSubcategoryName && !matchesSubcategoryId) return false;
      }
      
      // Filtro por tercera categoría
      if (selectedTerceraCategoria !== 'Todas') {
        const selectedTercObj = categories.find(cat => cat.name === selectedTerceraCategoria);
        const matchesTerceraCatName = product.terceraCategoriaName?.toLowerCase() === selectedTerceraCategoria.toLowerCase();
        const matchesTerceraCatId = selectedTercObj && product.terceraCategoria === selectedTercObj.id;
        return matchesTerceraCatName || matchesTerceraCatId;
      }
      
      return true;
    });
    
    console.log(`Productos que coinciden con los filtros: ${matchingProducts.length}`);
    matchingProducts.slice(0, 3).forEach((product, i) => {
      console.log(`Producto coincidente #${i+1}: ${product.name}`);
    });
  }
  
  console.log('======= FIN DE DEPURACIÓN =======');
}

// Función para inspeccionar las estructuras de datos del producto
export function inspectProduct(product) {
  console.log('======= INSPECCIÓN DE PRODUCTO =======');
  console.log(`Nombre: ${product.name} (ID: ${product.id})`);
  console.log('Datos de categoría:');
  console.log(`- category: ${product.category}`);
  console.log(`- categoryName: ${product.categoryName}`);
  console.log('Datos de subcategoría:');
  console.log(`- subcategory: ${product.subcategory}`);
  console.log(`- subcategoryName: ${product.subcategoryName}`);
  console.log('Datos de tercera categoría:');
  console.log(`- terceraCategoria: ${product.terceraCategoria}`);
  console.log(`- terceraCategoriaName: ${product.terceraCategoriaName}`);
  console.log('Propiedades completas:');
  console.log(Object.keys(product).reduce((acc, key) => {
    acc[key] = product[key];
    return acc;
  }, {}));
  console.log('======= FIN DE INSPECCIÓN =======');
}
