import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster as HotToaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import AdvancedIndex from "./pages/AdvancedIndex";
import { AdminPanel } from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";
import { UserProfile } from "@/components/user/UserProfile";
import ProductDetailPage from "./pages/ProductDetail";
import AboutUs from "./pages/AboutUs";
import { useState, useEffect } from "react"; // Mantenemos estos imports para otros posibles usos
import { SimulationNotice } from "@/components/ui/SimulationNotice";
import Retiros from "./pages/Retiros";
import SharedEmployeeManager from "./pages/SharedEmployeeManager";
import ProductosPage from "./pages/Productos";
import WhatsAppIntegration from "./components/WhatsAppSimple";
import LoginPage from "./pages/LoginPage";
import PublicQuoteForm from "./components/public/PublicQuoteForm";

const queryClient = new QueryClient();

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HotToaster position="top-right" />
          <SimulationNotice />
          <BrowserRouter>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

import Testimonios from "./pages/Testimonios";
import Envios from "./pages/Envios";
export default App;
