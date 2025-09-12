
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
// import { AuthModal } from '@/components/auth/AuthModal'; // No longer needed - using /login page
import { CartSidebar } from '@/components/cart/CartSidebar';
import { UserMenu } from '@/components/user/UserMenu';
import QuoteButton from '@/components/QuoteButton';
import { ShoppingCart, LogIn, Search, Menu, Bell, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { getItemCount } = useCart();
  const navigate = useNavigate();
  // const [showAuthModal, setShowAuthModal] = useState(false); // No longer needed
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const itemCount = getItemCount();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Buscar:', searchQuery);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-lg">
        <div className="container mx-auto px-4">
          {/* Main header */}
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img src="/logo-nuevo.png" alt="Regala Algo" className="h-14 w-auto" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground hidden sm:block">Tu tienda del conjunto</p>
              </div>
            </div>

            {/* Search Bar - Hidden on mobile, shown on tablet+ */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar productos, marcas..."
                  className="pl-10 pr-4 h-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Mobile search button */}
              <Button variant="ghost" size="sm" className="lg:hidden">
                <Search className="h-5 w-5" />
              </Button>

              {/* Quote Button */}
              <QuoteButton 
                variant="outline" 
                size="sm"
                className="hidden sm:flex hover:bg-blue-50 hover:border-blue-300 transition-all"
              />

              {/* Cart Button */}
              <Button
                variant="outline"
                size="sm"
                className="relative hover:bg-orange-50 hover:border-orange-300 transition-all"
                onClick={() => setShowCart(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {itemCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 gradient-orange text-white text-xs font-bold animate-pulse"
                  >
                    {itemCount}
                  </Badge>
                )}
                <span className="hidden sm:inline ml-2">Carrito</span>
              </Button>

              {/* User Actions */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-sm font-medium">¡Hola, {user!.name.split(' ')[0]}!</span>
                    <span className="text-xs text-muted-foreground">Depto {user!.departmentNumber}</span>
                  </div>
                  <UserMenu user={user!} />
                </div>
              ) : (
                <Button 
                  onClick={() => navigate('/login')}
                  className="gradient-orange hover:opacity-90 transition-all transform hover:scale-105 shadow-lg"
                  size="sm"
                >
                  <LogIn className="h-4 w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Ingresar</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="lg:hidden pb-3">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar productos..."
                className="pl-10 pr-4 h-10 border-orange-200 focus:border-orange-400 focus:ring-orange-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 py-3 text-sm font-medium border-t border-orange-100 overflow-x-auto">
            <a href="#" className="text-orange-600 hover:text-orange-700 transition-colors font-semibold whitespace-nowrap">
              🏠 Inicio
            </a>
            <a href="#productos" className="text-foreground/70 hover:text-orange-600 transition-colors whitespace-nowrap">
              🥤 Bebidas
            </a>
            <a href="#snacks" className="text-foreground/70 hover:text-orange-600 transition-colors whitespace-nowrap">
              🍿 Snacks
            </a>
            <a href="#dulces" className="text-foreground/70 hover:text-orange-600 transition-colors whitespace-nowrap">
              🍭 Dulces
            </a>
            <a href="#lacteos" className="text-foreground/70 hover:text-orange-600 transition-colors whitespace-nowrap">
              🥛 Lácteos
            </a>
            <a href="#ofertas" className="text-foreground/70 hover:text-orange-600 transition-colors whitespace-nowrap">
              🔥 Ofertas
            </a>
          </nav>
        </div>
      </header>

      {/* Modals */}
      {/* <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} /> */}
      <CartSidebar isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
};
