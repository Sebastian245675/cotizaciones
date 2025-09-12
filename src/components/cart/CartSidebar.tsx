import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Trash2, MessageCircle, X } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const { items, updateQuantity, removeFromCart, getTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const firebaseUser = auth.currentUser;
      if (isAuthenticated && firebaseUser && firebaseUser.uid) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserName(data.name || '');
          setUserPhone(data.phone || '');
          setUserEmail(data.email || firebaseUser.email || '');
        } else {
          setUserName(firebaseUser.email || '');
          setUserPhone('');
          setUserEmail(firebaseUser.email || '');
        }
      }
    };
    fetchUserData();
  }, [isAuthenticated, user, isOpen]);

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para realizar un pedido",
        variant: "destructive"
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos a tu carrito antes de continuar",
        variant: "destructive"
      });
      return;
    }

    // Validar que los datos del usuario estén completos
    if (!userName || !userEmail) {
      toast({
        title: "Datos incompletos",
        description: "No se pudo obtener tu nombre o email. Por favor cierra sesión y vuelve a iniciar.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingOut(true);

    // Mensaje con datos del usuario
    const message =
      `🛒 *NUEVO PEDIDO - REGALA ALGO*\n\n` +
      `👤 *Nombre:* ${userName}\n` +
      `📧 *Email:* ${userEmail}\n` +
      `📱 *Teléfono:* ${userPhone || 'No especificado'}\n` +
      `\n*📦 PRODUCTOS SOLICITADOS:*\n${items.map(item => {
        let itemText = `${item.name} x${item.quantity}`;
        if (item.selectedColor) {
          itemText += ` (Color: ${item.selectedColor.name})`;
        }
        return itemText;
      }).join('\n')}\n\n` +
      (orderNotes ? `*📝 Notas adicionales:*\n${orderNotes}\n\n` : '') +
      `💰 *TOTAL A PAGAR: $${getTotal().toLocaleString()}*\n\n` +
      `⏰ Fecha: ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n` +
      `✅ Por favor confirma la disponibilidad y tiempo de entrega.\n`;

    const storeWhatsApp = '543873439775'; // Número de WhatsApp de Regala Algo en Argentina
    const whatsappUrl = `https://wa.me/${storeWhatsApp}?text=${encodeURIComponent(message)}`;

    try {
      // Guarda el pedido en Firestore
      await addDoc(collection(db, "orders"), {
        userId: isAuthenticated ? user.id : null,
        userName,
        userEmail,
        userPhone,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        })),
        orderNotes,
        total: getTotal(),
        createdAt: serverTimestamp(),
        status: "pending"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el pedido en la base de datos.",
        variant: "destructive"
      });
      // Puedes decidir si sigues con el WhatsApp o no
    }

    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      clearCart();
      setOrderNotes('');
      setIsCheckingOut(false);
      onClose();

      toast({
        title: "¡Pedido enviado!",
        description: "Tu pedido ha sido enviado por WhatsApp. Te contactaremos pronto.",
      });
    }, 1000);
  };

  const subtotal = getTotal();
  const deliveryFee = subtotal >= 60000 ? 0 : 2000;
  const total = subtotal + deliveryFee;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Tu Carrito ({items.length})
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
              <p className="text-muted-foreground mb-4">Agrega algunos productos para empezar</p>
              <Button onClick={onClose} className="gradient-orange hover:opacity-90">
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              {/* Lista de productos */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 bg-muted/50 p-4 rounded-lg">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm leading-tight">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">${item.price.toLocaleString()}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                        {item.selectedColor && (
                          <div className="flex items-center gap-1">
                            <span 
                              className="w-3 h-3 rounded-full border border-gray-300" 
                              style={{ backgroundColor: item.selectedColor.hexCode }}
                            ></span>
                            <span className="text-xs text-gray-500">{item.selectedColor.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Notas del pedido */}
              <div className="space-y-2 mb-6">
                <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                <Input
                  id="notes"
                  placeholder="Ej: Entregar en portería, tocar timbre, etc."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>

              {/* Resumen de costos */}
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Domicilio:</span>
                  <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                    {deliveryFee === 0 ? '¡GRATIS!' : `$${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span className="gradient-text-orange">${total.toLocaleString()}</span>
                </div>
                {subtotal < 60000 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    *Domicilio gratis en compras superiores a $60,000
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="space-y-3 mt-6">
                {!isAuthenticated ? (
                  <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      Inicia sesión para realizar tu pedido
                    </p>
                    <Button size="sm" onClick={onClose}>
                      Iniciar Sesión
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center mb-4">
                    <Button
                      className="w-full max-w-xs gradient-orange hover:opacity-90 h-12 flex items-center justify-center text-lg"
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                    >
                      <MessageCircle className="h-6 w-6 mr-2" />
                      {isCheckingOut ? 'Enviando...' : 'Enviar Pedido por WhatsApp'}
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose} className="flex-1">
                    Seguir Comprando
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={clearCart}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* DEBUG: Muestra los datos obtenidos */}
              <div style={{fontSize: 12, color: '#888', marginBottom: 8}}>
                <div>Nombre: {userName}</div>
                <div>Email: {userEmail}</div>
                <div>Teléfono: {userPhone || 'No especificado'}</div>
              </div>
            </>          )}        </div>      </SheetContent>    </Sheet>  );};