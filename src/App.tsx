import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import AdvancedIndex from "./pages/AdvancedIndex";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { UserProfile } from "@/components/user/UserProfile";
import ProductDetailPage from "./pages/ProductDetail";
import AboutUs from "./pages/AboutUs";
import { useState, useEffect } from "react";
import { SimulationNotice } from "@/components/ui/SimulationNotice";
import Retiros from "./pages/Retiros";
import SharedEmployeeManager from "./pages/SharedEmployeeManager";
import ProductosPage from "./pages/Productos";
import WhatsAppIntegration from "./components/WhatsAppIA";
import LoginPage from "./pages/LoginPage";
import PublicQuoteForm from "./components/public/PublicQuoteForm";
import { SyncStatusIndicator } from "./components/offline/SyncStatusIndicator";
import { posAPI } from "./services/pos-api-adapter";
import { OfflineTestPage } from "./pages/OfflineTestPage";

const queryClient = new QueryClient();

const App = () => {
  // Inicializar sistema offline al cargar la aplicación
  useEffect(() => {
    const initializeOfflineSystem = async () => {
      try {

        await posAPI.initialize();

      } catch (error) {
        console.error('❌ Error inicializando sistema offline:', error);
      }
    };

    initializeOfflineSystem();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          {/* Indicador de estado de sincronización */}
          <div className="fixed top-4 right-4 z-50">
            <SyncStatusIndicator />
          </div>
          
          <Toaster />
          <Sonner />
          <HotToaster position="top-right" />
          <SimulationNotice />
          <HashRouter>
            <Routes>
              <Route path="/" element={<AdvancedIndex />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/perfil" element={<UserProfile />} />
              <Route path="/producto/:productId" element={<ProductDetailPage />} />
              <Route path="/sobre-nosotros" element={<AboutUs />} />
              <Route path="/envios" element={<Envios />} />
              <Route path="/testimonios" element={<Testimonios />} />
              <Route path="/retiros" element={<Retiros />} />
              <Route path="/shared/employees" element={<SharedEmployeeManager />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/whatsapp" element={<WhatsAppIntegration />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/quote-form/:formId" element={<PublicQuoteForm />} />
              <Route path="/offline-test" element={<OfflineTestPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

import Testimonios from "./pages/Testimonios";
import Envios from "./pages/Envios";
export default App;
