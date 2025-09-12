import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc, writeBatch, Timestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User as UserIcon, Mail, Phone, MapPin, Gift, Package, Heart, Clock, 
  Edit, Save, AlertCircle, CheckCircle2, Home as HomeIcon, Truck, ChevronRight, 
  Calendar as CalendarIcon, ShoppingBag, BadgeCheck, History, 
  Trash2, Star, Plus, Check, X, CreditCard, MapPinned
} from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";

// Tipo para las órdenes recientes
interface Order {
  id: string;
  date: Date;
  total: number;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  trackingNumber?: string;
}

// Tipo para los productos favoritos
interface FavoriteProduct {
  id: string;
  name: string;
  image: string;
  price: number;
}

// Tipo para direcciones guardadas
interface SavedAddress {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    province: "",
    postalCode: "",
    address: "",
    birthdate: "",
    preferences: "",
    notifications: {
      email: true,
      sms: false,
      promotions: true
    }
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [newAddress, setNewAddress] = useState<Omit<SavedAddress, 'id'>>({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    isDefault: false
  });
  const [addingAddress, setAddingAddress] = useState(false);

  // Carga los datos del usuario desde Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // Obtener datos principales del usuario
        const userDoc = await getDoc(doc(db, "users", user.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData({
            name: data.name || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            city: data.city || "",
            province: data.province || "",
            postalCode: data.postalCode || "",
            address: data.address || "",
            birthdate: data.birthdate || "",
            preferences: data.preferences || "",
            notifications: data.notifications || {
              email: true,
              sms: false,
              promotions: true
            }
          });
          
          // Cargar direcciones guardadas
          const addressesQuery = query(
            collection(db, "userAddresses"),
            where("userId", "==", user.id)
          );
          const addressesSnapshot = await getDocs(addressesQuery);
          const addressesData: SavedAddress[] = [];
          addressesSnapshot.forEach(doc => {
            addressesData.push({
              id: doc.id,
              ...doc.data() as Omit<SavedAddress, 'id'>
            });
          });
          setSavedAddresses(addressesData);
          
          // Cargar órdenes recientes
          const ordersQuery = query(
            collection(db, "orders"),
            where("userId", "==", user.id),
            orderBy("date", "desc"),
            limit(5)
          );
          const ordersSnapshot = await getDocs(ordersQuery);
          const ordersData: Order[] = [];
          ordersSnapshot.forEach(doc => {
            const data = doc.data();
            ordersData.push({
              id: doc.id,
              date: data.date.toDate(),
              total: data.total,
              status: data.status,
              items: data.items.length,
              trackingNumber: data.trackingNumber
            });
          });
          setRecentOrders(ordersData);
          
          // Cargar productos favoritos
          const favoritesQuery = query(
            collection(db, "favorites"),
            where("userId", "==", user.id),
            limit(4)
          );
          const favoritesSnapshot = await getDocs(favoritesQuery);
          const favoritesIds: string[] = [];
          favoritesSnapshot.forEach(doc => {
            favoritesIds.push(doc.data().productId);
          });
          
          // Obtener detalles de productos favoritos
          if (favoritesIds.length > 0) {
            const productsData: FavoriteProduct[] = [];
            for (const id of favoritesIds) {
              const productDoc = await getDoc(doc(db, "products", id));
              if (productDoc.exists()) {
                const data = productDoc.data();
                productsData.push({
                  id: productDoc.id,
                  name: data.name,
                  image: data.images?.[0] || "",
                  price: data.price
                });
              }
            }
            setFavoriteProducts(productsData);
          }
          
        } else {
          console.log("⚠️ No existe documento de usuario en Firestore para este UID");
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
        toast({
          title: "Error al cargar perfil",
          description: "No pudimos cargar tu información. Intenta de nuevo más tarde.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleNotificationChange = (type: string, value: boolean) => {
    setFormData({
      ...formData,
      notifications: {
        ...formData.notifications,
        [type]: value
      }
    });
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAddress({
      ...newAddress,
      [e.target.name]: e.target.value
    });
  };
  
  const toggleDefaultAddress = () => {
    setNewAddress({
      ...newAddress,
      isDefault: !newAddress.isDefault
    });
  };
  
  const addNewAddress = async () => {
    if (!user) return;
    setAddressLoading(true);
    
    try {
      const addressRef = collection(db, "userAddresses");
      const newAddressData = {
        ...newAddress,
        userId: user.id,
        createdAt: Timestamp.now()
      };
      
      // Si es dirección predeterminada, actualizar las demás
      if (newAddress.isDefault) {
        const batch = writeBatch(db);
        const addressesQuery = query(
          collection(db, "userAddresses"),
          where("userId", "==", user.id),
          where("isDefault", "==", true)
        );
        const snapshot = await getDocs(addressesQuery);
        snapshot.forEach(doc => {
          batch.update(doc.ref, { isDefault: false });
        });
        await batch.commit();
      }
      
      // Añadir la nueva dirección
      await addDoc(addressRef, newAddressData);
      
      // Actualizar la UI
      setSavedAddresses([
        ...savedAddresses,
        { id: "temp-id", ...newAddress } // El ID real se obtendría al recargar
      ]);
      
      // Limpiar formulario
      setNewAddress({
        name: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
        isDefault: false
      });
      
      setAddingAddress(false);
      toast({
        title: "Dirección añadida",
        description: "Tu nueva dirección ha sido guardada correctamente."
      });
    } catch (error) {
      console.error("Error al añadir dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos guardar tu nueva dirección.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };
  
  const setAddressAsDefault = async (addressId: string) => {
    if (!user) return;
    setAddressLoading(true);
    
    try {
      // Quitar predeterminado de todas las direcciones
      const batch = writeBatch(db);
      const addressesQuery = query(
        collection(db, "userAddresses"),
        where("userId", "==", user.id)
      );
      const snapshot = await getDocs(addressesQuery);
      snapshot.forEach(doc => {
        batch.update(doc.ref, { isDefault: doc.id === addressId });
      });
      await batch.commit();
      
      // Actualizar UI
      const updatedAddresses = savedAddresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      setSavedAddresses(updatedAddresses);
      
      toast({
        title: "Dirección actualizada",
        description: "Dirección predeterminada actualizada correctamente."
      });
    } catch (error) {
      console.error("Error al actualizar dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos actualizar tu dirección predeterminada.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };
  
  const removeAddress = async (addressId: string) => {
    if (!user) return;
    setAddressLoading(true);
    
    try {
      await deleteDoc(doc(db, "userAddresses", addressId));
      
      // Actualizar UI
      setSavedAddresses(savedAddresses.filter(addr => addr.id !== addressId));
      
      toast({
        title: "Dirección eliminada",
        description: "La dirección ha sido eliminada correctamente."
      });
    } catch (error) {
      console.error("Error al eliminar dirección:", error);
      toast({
        title: "Error",
        description: "No pudimos eliminar la dirección.",
        variant: "destructive"
      });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode,
        address: formData.address,
        birthdate: formData.birthdate,
        preferences: formData.preferences,
        notifications: formData.notifications,
        updatedAt: new Date()
      });
      updateUser(formData); // Actualiza en el contexto
      toast({
        title: "Perfil actualizado",
        description: "Tus datos han sido guardados correctamente."
      });
      setEditing(false);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar tu perfil.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-amber-100 text-amber-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return 'Procesando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Clock className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 mt-8 sm:px-6">
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-100 to-amber-50 p-12 flex flex-col items-center justify-center">
            <div className="h-20 w-20 bg-white rounded-full shadow-md flex items-center justify-center mb-6">
              <UserIcon className="h-10 w-10 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Perfil de Usuario</h2>
            <p className="text-gray-600 mb-6">Accede a tu cuenta para ver tu información personal</p>
            <Button className="gradient-orange">Iniciar sesión</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 mt-8 pb-16 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mi Cuenta</h1>
        <p className="text-gray-600">Gestiona tus datos personales, direcciones y pedidos</p>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 w-full justify-start bg-transparent p-0 gap-x-6 border-b">
          <TabsTrigger
            value="profile"
            className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none bg-transparent data-[state=active]:shadow-none"
          >
            <UserIcon className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger
            value="addresses"
            className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none bg-transparent data-[state=active]:shadow-none"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Direcciones
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none bg-transparent data-[state=active]:shadow-none"
          >
            <ShoppingBag className="h-4 w-4 mr-2" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="px-0 py-3 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-none bg-transparent data-[state=active]:shadow-none"
          >
            <Heart className="h-4 w-4 mr-2" />
            Favoritos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <Card className="overflow-hidden border-0 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 py-6">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <UserIcon className="h-5 w-5 text-orange-600" />
                    <span className="text-gray-800">Información Personal</span>
                  </CardTitle>
                  <CardDescription>
                    Actualiza tu información personal
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-6 space-y-6">
                  {loading ? (
                    <div className="flex justify-center items-center py-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                            Nombre completo
                          </label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={!editing}
                            placeholder="Tu nombre completo"
                            className={`h-11 ${!editing ? 'bg-gray-50' : 'bg-white'}`}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                            <Mail className="h-4 w-4 text-gray-500" />
                            Email
                          </label>
                          <div className="relative">
                            <Input
                              name="email"
                              value={formData.email}
                              disabled
                              className="h-11 bg-gray-50 text-gray-700 pr-10"
                            />
                            <BadgeCheck className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                            <Phone className="h-4 w-4 text-gray-500" />
                            Teléfono
                          </label>
                          <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={!editing}
                            placeholder="Tu número de teléfono"
                            className={`h-11 ${!editing ? 'bg-gray-50' : 'bg-white'}`}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                            <CalendarIcon className="h-4 w-4 text-gray-500" />
                            Fecha de nacimiento
                          </label>
                          <Input
                            type="date"
                            name="birthdate"
                            value={formData.birthdate}
                            onChange={handleChange}
                            disabled={!editing}
                            placeholder="DD/MM/AAAA"
                            className={`h-11 ${!editing ? 'bg-gray-50' : 'bg-white'}`}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2 text-gray-700">
                          <Gift className="h-4 w-4 text-gray-500" />
                          Preferencias de regalo
                        </label>
                        <Textarea
                          name="preferences"
                          value={formData.preferences}
                          onChange={handleChange}
                          disabled={!editing}
                          placeholder="¿Qué tipo de regalos te gusta recibir? Esto nos ayuda a recomendarte productos"
                          className={`min-h-[100px] ${!editing ? 'bg-gray-50' : 'bg-white'}`}
                        />
                      </div>
                      
                      <div className="space-y-4 pt-4">
                        <h3 className="font-medium text-gray-900">Notificaciones</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
                              <p className="text-xs text-gray-500">Recibe notificaciones sobre tus pedidos por email</p>
                            </div>
                            <Switch
                              checked={formData.notifications.email}
                              disabled={!editing}
                              onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                            />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-sm font-medium text-gray-700">SMS</label>
                              <p className="text-xs text-gray-500">Recibe notificaciones sobre tus pedidos por SMS</p>
                            </div>
                            <Switch
                              checked={formData.notifications.sms}
                              disabled={!editing}
                              onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
                            />
                          </div>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <label className="text-sm font-medium text-gray-700">Promociones</label>
                              <p className="text-xs text-gray-500">Recibe ofertas especiales y descuentos</p>
                            </div>
                            <Switch
                              checked={formData.notifications.promotions}
                              disabled={!editing}
                              onCheckedChange={(checked) => handleNotificationChange('promotions', checked)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-4 flex justify-end gap-3">
                        {editing ? (
                          <>
                            <Button
                              onClick={() => setEditing(false)}
                              variant="outline"
                              className="h-10"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleSave}
                              className="gradient-orange h-10"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Guardar cambios
                                </>
                              )}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => setEditing(true)}
                            className="gradient-orange h-10"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar información
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-4">
              <Card className="shadow-md border-0 overflow-hidden mb-6">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 text-white text-center">
                    <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-white/30">
                      <AvatarFallback className="bg-orange-700 text-white text-xl">
                        {formData.name ? formData.name.substring(0, 2).toUpperCase() : (user.email?.substring(0, 2) || "").toUpperCase()}
                      </AvatarFallback>
                      <AvatarImage src={''} />
                    </Avatar>
                    <h3 className="font-bold text-xl mb-1">{formData.name || 'Usuario'}</h3>
                    <p className="text-orange-100 text-sm">{user.email}</p>
                  </div>
                  
                  <div className="p-6 bg-white">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Cliente desde</p>
                        <p className="font-medium">{format(new Date(), 'MMMM yyyy')}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Última actividad</p>
                        <p className="font-medium">{format(new Date(), 'dd/MM/yyyy')}</p>
                      </div>
                      
                      <div className="pt-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Cliente Verificado
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Se eliminó la sección de beneficios del cliente a petición del usuario */}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="addresses" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Mis Direcciones</CardTitle>
                {!addingAddress && (
                  <Button 
                    onClick={() => setAddingAddress(true)}
                    className="gradient-orange"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir dirección
                  </Button>
                )}
              </div>
              <CardDescription>Administra tus direcciones de envío</CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              {addressLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {addingAddress && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6"
                    >
                      <h3 className="text-lg font-medium mb-4 text-orange-800">Nueva dirección</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Nombre de la dirección</label>
                          <Input
                            name="name"
                            value={newAddress.name}
                            onChange={handleAddressChange}
                            placeholder="Casa, Trabajo, etc."
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Dirección completa</label>
                          <Input
                            name="address"
                            value={newAddress.address}
                            onChange={handleAddressChange}
                            placeholder="Calle, número, etc."
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Ciudad</label>
                          <Input
                            name="city"
                            value={newAddress.city}
                            onChange={handleAddressChange}
                            placeholder="Ciudad"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Provincia</label>
                          <Input
                            name="province"
                            value={newAddress.province}
                            onChange={handleAddressChange}
                            placeholder="Provincia"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Código postal</label>
                          <Input
                            name="postalCode"
                            value={newAddress.postalCode}
                            onChange={handleAddressChange}
                            placeholder="CP"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-4">
                        <Switch
                          checked={newAddress.isDefault}
                          onCheckedChange={toggleDefaultAddress}
                          id="default-address"
                        />
                        <label htmlFor="default-address" className="ml-2 text-sm text-gray-700">
                          Establecer como dirección predeterminada
                        </label>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button
                          onClick={addNewAddress}
                          className="gradient-orange"
                          disabled={addressLoading}
                        >
                          Guardar dirección
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setAddingAddress(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="space-y-4">
                    {savedAddresses.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes direcciones guardadas</h3>
                        <p className="text-gray-500 mb-4">Añade una dirección para agilizar tus futuros pedidos</p>
                        <Button
                          onClick={() => setAddingAddress(true)}
                          className="gradient-orange"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Añadir mi primera dirección
                        </Button>
                      </div>
                    ) : (
                      savedAddresses.map((address) => (
                        <div
                          key={address.id}
                          className={`border rounded-lg p-4 ${address.isDefault ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <MapPinned className="h-5 w-5 mr-2 text-orange-500" />
                              <h3 className="font-medium text-gray-800">
                                {address.name}
                                {address.isDefault && (
                                  <Badge className="ml-2 bg-orange-100 text-orange-800 hover:bg-orange-200">
                                    Predeterminada
                                  </Badge>
                                )}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setAddressAsDefault(address.id)}
                                  className="h-8 text-xs"
                                >
                                  Predeterminada
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => removeAddress(address.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-gray-600 text-sm mt-2">
                            <p>{address.address}</p>
                            <p>{address.city}, {address.province}</p>
                            <p>{address.postalCode}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="orders" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Mis Pedidos</CardTitle>
              <CardDescription>Historial de tus compras recientes</CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes pedidos recientes</h3>
                  <p className="text-gray-500 mb-4">Cuando realices una compra, aparecerá aquí</p>
                  <Button className="gradient-orange">
                    Ver productos
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Pedido #{order.id.substring(0, 6)}</p>
                          <p className="font-medium">{format(order.date, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full flex items-center ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="ml-1 text-sm font-medium">{getStatusText(order.status)}</span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Total del pedido</p>
                            <p className="font-semibold text-lg">${order.total.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 text-right">Productos</p>
                            <p className="font-medium text-right">{order.items} {order.items === 1 ? 'producto' : 'productos'}</p>
                          </div>
                        </div>
                        
                        {order.status === 'shipped' && order.trackingNumber && (
                          <div className="bg-blue-50 p-3 rounded-lg flex items-center">
                            <Truck className="h-5 w-5 text-blue-600 mr-3" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">En camino</p>
                              <p className="text-xs text-blue-600">Seguimiento: {order.trackingNumber}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                          <Button variant="outline" size="sm" className="text-sm">
                            Ver detalles
                          </Button>
                          {order.status === 'delivered' && (
                            <Button size="sm" variant="ghost" className="text-sm">
                              <Star className="h-4 w-4 mr-1" /> Valorar productos
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            
            {recentOrders.length > 0 && (
              <CardFooter className="px-6 pb-6 pt-0">
                <Button variant="link" className="mx-auto flex items-center">
                  <History className="h-4 w-4 mr-1" />
                  Ver historial completo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="favorites" className="mt-0">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Mis Favoritos</CardTitle>
              <CardDescription>Productos que te han gustado</CardDescription>
            </CardHeader>
            
            <CardContent className="p-6">
              {favoriteProducts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="h-16 w-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Heart className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No tienes favoritos guardados</h3>
                  <p className="text-gray-500 mb-4">Guarda productos que te gusten para verlos después</p>
                  <Button className="gradient-orange">
                    Explorar productos
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {favoriteProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden border">
                      <div className="aspect-square relative">
                        <img 
                          src={product.image || '/placeholder-product.png'} 
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm"
                        >
                          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                        </Button>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2 h-10">{product.name}</h3>
                        <p className="font-bold text-orange-600 mt-1">${product.price?.toLocaleString()}</p>
                        <Button className="w-full mt-2 gradient-orange text-xs h-8">
                          Añadir al carrito
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
            
            {favoriteProducts.length > 0 && (
              <CardFooter className="px-6 pb-6 pt-0">
                <Button variant="link" className="mx-auto flex items-center">
                  Ver todos mis favoritos
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};