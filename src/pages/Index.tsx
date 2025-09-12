import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { QuoteSection } from '@/components/home/QuoteSection';
import { ProductsSection } from '@/components/products/ProductsSection';
import QuoteButton from '@/components/QuoteButton';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedTerceraCategoria, setSelectedTerceraCategoria] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <HeroSection />
            <QuoteSection />
            <ProductsSection
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedSubcategory={selectedSubcategory}
              setSelectedSubcategory={setSelectedSubcategory}
              selectedTerceraCategoria={selectedTerceraCategoria}
              setSelectedTerceraCategoria={setSelectedTerceraCategoria}
              setCategories={setCategories}
            />
          </main>
          
          {/* Floating Quote Button for Mobile */}
          <div className="fixed bottom-4 left-4 z-40 sm:hidden">
            <QuoteButton 
              variant="default"
              size="lg"
              className="shadow-2xl bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-3"
            />
          </div>
          
          {/* Footer */}
          <footer className="bg-muted/50 py-12 mt-16">
            <div className="container">
              <div className="grid md:grid-cols-4 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 gradient-orange rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <span className="text-lg font-bold gradient-text-orange">REGALA ALGO</span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Tu tienda premium con los mejores productos y atención personalizada.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Productos</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Electrónicos</li>
                    <li>Audio</li>
                    <li>Gaming</li>
                    <li>Fotografía</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Soporte</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>Centro de Ayuda</li>
                    <li>Garantías</li>
                    <li>Devoluciones</li>
                    <li>Contacto</li>
                  </ul>
                  <div className="mt-4">
                    <QuoteButton 
                      variant="outline" 
                      size="sm"
                      className="w-full border-blue-200 hover:bg-blue-50"
                    />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-4">Contacto</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>WhatsApp: +54 3873439775</li>
                    <li>Email: Regalo.Algo@gmail.com</li>
                    <li>Horario: 8AM - 8PM</li>
                  </ul>
                </div>
              </div>
              
              <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
                <p>&copy; 2024 REGALA ALGO. Todos los derechos reservados.</p>
              </div>
            </div>
          </footer>
        </div>
      </CartProvider>
    </AuthProvider>
  );
};

export default Index;
