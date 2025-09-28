const fetchProducts = async () => {
  const storage = OfflineStorage.getInstance();
  
  try {
    console.log('🔄 Cargando productos desde Firebase...');
    
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const productsData = productsSnapshot.docs.map(doc => {
      const data = doc.data();
      const price = data.price || data.precio || data.salePrice || data.precioVenta || 0;
      
      return {
        id: doc.id,
        name: data.name || data.nombre || 'Producto sin nombre',
        description: data.description || data.descripcion || '',
        price: Number(price),
        image: data.image || data.imagen,
        category: data.category || data.categoria || 'Sin categoría',
        stock: Number(data.stock || data.inventory || data.inventario || 0),
        barcode: data.barcode || data.codigoBarras,
        claveNumerica: data.claveNumerica || data.clave || '',
        tipoVenta: data.tipoVenta || undefined,
        brand: data.brand || data.marca,
        supplier: data.supplier || data.proveedor,
        costPrice: Number(data.costPrice || data.precioCosto || 0),
        margin: Number(data.margin || data.margen || 0),
        puntosRecompensa: Number(data.puntosRecompensa || 0),
        tipoRecompensa: (data.tipoRecompensa === 'porcentaje' ? 'porcentaje' : 'fijo') as 'fijo' | 'porcentaje'
      };
    }) as Product[];
    
    console.log(`✅ ${productsData.length} productos cargados exitosamente`);
    
    setProducts(productsData);
    
    // Cachear productos en localStorage
    storage.setItem('pos_products_cache', productsData);
    storage.setItem('pos_products_last_update', Date.now());
    
    // Extract unique categories and convert IDs to names
    const uniqueCategoryIds = [...new Set(productsData.map(p => p.category))].filter(Boolean);
    const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
    const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
    
    console.log('📂 Categorías extraídas:', finalCategories);
    setCategories(finalCategories);
    
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    
    // Intentar cargar desde cache local
    const cachedProducts = storage.getItem<Product[]>('pos_products_cache', []);
    
    if (cachedProducts.length > 0) {
      console.log('📦 Cargando productos desde cache local:', cachedProducts.length);
      setProducts(cachedProducts);
      
      const uniqueCategoryIds = [...new Set(cachedProducts.map(p => p.category))].filter(Boolean);
      const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
      const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
      
      setCategories(finalCategories);
      
      toast({
        title: "Productos cargados desde cache",
        description: `Se cargaron ${cachedProducts.length} productos desde cache local`,
      });
      return;
    }
    
    // Fallback: usar productos de ejemplo
    try {
      const { sampleProducts } = await import('@/data/products');
      setProducts(sampleProducts);
      
      storage.setItem('pos_products_cache', sampleProducts);
      
      const uniqueCategoryIds = [...new Set(sampleProducts.map(p => p.category))];
      const uniqueCategoryNames = uniqueCategoryIds.map(categoryId => getCategoryName(categoryId));
      const finalCategories = [...new Set(uniqueCategoryNames)].filter(Boolean);
      setCategories(finalCategories);
      
      toast({
        title: "Productos cargados",
        description: `Se cargaron ${sampleProducts.length} productos de ejemplo`,
      });
    } catch (fallbackError) {
      console.error('❌ Error cargando productos de ejemplo:', fallbackError);
      toast({
        title: "Error cargando productos",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      });
    }
  }
};