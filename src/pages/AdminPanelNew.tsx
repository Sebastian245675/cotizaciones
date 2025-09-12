import React, { useEffect, useState } from 'react';
import { auth, db } from '@/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  Settings,
  BarChart3,
  DollarSign,
  AlertCircle,
  Home,
  Bell,
  Tag
} from 'lucide-react';
import { ProductForm } from '@/components/admin/ProductForm';
import { UsersList } from '@/components/admin/UsersList';
import { OrdersList } from '@/components/admin/OrdersList';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { CategoryManager } from '@/components/admin/CategoryManager';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, getDoc } from "firebase/firestore";
// (ya importado arriba)
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { RevisionList } from "@/components/admin/RevisionList";
import { ProductAnalyticsView } from '@/components/admin/ProductAnalytics';
import InfoManager from '@/components/admin/InfoManager';
import Sidebar from '@/components/admin/Sidebar';
import AdminLayout from '@/components/admin/AdminLayout';

export const AdminPanel: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState<any[]>([]);
  const [subName, setSubName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subAccounts, setSubAccounts] = useState<any[]>([]);
  const [subAccountsLoading, setSubAccountsLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();
        if (firebaseUser.email === "admin@gmail.com") {
          setIsAdmin(true);
          setIsSubAdmin(false);
        } else if (userData?.subCuenta === "si") {
          setIsAdmin(false);
          setIsSubAdmin(true);
        } else {
          setIsAdmin(false);
          setIsSubAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setIsSubAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      const querySnapshot = await getDocs(collection(db, "pedidos"));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Pedidos desde Firestore:", docs);
      setOrders(docs);
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(docs);
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchSubAccounts();
  }, []);

  const handleSubAccountCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubLoading(true);
    try {
      // Crear usuario en Firebase Auth
      const { user: newUser } = await createUserWithEmailAndPassword(auth, subEmail, subPassword);

      // Guardar información adicional en Firestore
      await setDoc(doc(db, "users", newUser.uid), {
        name: subName,
        email: subEmail,
        subCuenta: "si",
      });

      toast({
        title: "Subcuenta creada",
        description: "La subcuenta ha sido creada correctamente."
      });

      // Limpiar formulario
      setSubName('');
      setSubEmail('');
      setSubPassword('');
      
      // Actualizar lista
      fetchSubAccounts();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la subcuenta",
        variant: "destructive"
      });
    } finally {
      setSubLoading(false);
    }
  };

  const fetchSubAccounts = async () => {
    setSubAccountsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const subs = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as { id: string; subCuenta?: string; name?: string; email?: string }))
        .filter(u => u.subCuenta === "si");
      setSubAccounts(subs);
    } catch (e) {
      toast({ title: "Error", description: "No se pudieron cargar las subcuentas", variant: "destructive" });
    }
    setSubAccountsLoading(false);
  };

  const handleDeleteSubAccount = async (uid: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta subcuenta? Esta acción no se puede deshacer.")) return;
    setDeletingId(uid);
    try {
      await setDoc(doc(db, "users", uid), {}, { merge: false });
      setSubAccounts(subAccounts.filter(u => u.id !== uid));
      toast({ title: "Subcuenta eliminada", description: "La subcuenta fue eliminada correctamente." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleDarLiberta = async (uid: string) => {
    try {
      await setDoc(doc(db, "users", uid), { liberta: "si" }, { merge: true });
      toast({
        title: "Liberta otorgada",
        description: "La subcuenta ahora tiene liberta.",
      });
      setSubAccounts(subAccounts.map(u =>
        u.id === uid ? { ...u, liberta: "si" } : u
      ));
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "No se pudo otorgar liberta",
        variant: "destructive"
      });
    }
  };

  // Si no es admin ni subadmin, redirigir al home
  if (!loading && !isAdmin && !isSubAdmin) {
    navigate('/');
    return null;
  }
  
  // Renderizar pantalla de carga mientras verifica permisos
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-sky-500"></div>
          <p className="text-lg text-slate-600">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }
  
  return (
    <AdminLayout
      isAdmin={isAdmin}
      isSubAdmin={isSubAdmin}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      navigateToHome={() => navigate('/')}
      userName={user?.email?.split('@')[0] || "Administrador"}
    >
      {/* Dashboard */}
      {activeTab === 'dashboard' && !isSubAdmin && (
        <DashboardStats />
      )}
      
      {/* Productos */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestión de Productos</h2>
          <ProductForm />
        </div>
      )}
      
      {/* Órdenes */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestión de Pedidos</h2>
          {/* Aquí pasamos las órdenes como prop */}
          <OrdersList orders={orders} />
        </div>
      )}
      
      {/* Usuarios */}
      {activeTab === 'users' && !isSubAdmin && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestión de Usuarios</h2>
          <UsersList />
        </div>
      )}
      
      {/* Categorías */}
      {activeTab === 'categories' && !isSubAdmin && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestión de Categorías</h2>
          <CategoryManager />
        </div>
      )}
      
      {/* Subcuentas */}
      {activeTab === 'subaccounts' && !isSubAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-800">Gestión de Subcuentas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formulario de creación */}
            <Card className="shadow-md border border-sky-100 overflow-hidden rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-sky-100">
                <CardTitle className="text-slate-800">Crear Nueva Subcuenta</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubAccountCreate} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                    <Input
                      id="name"
                      value={subName}
                      onChange={(e) => setSubName(e.target.value)}
                      required
                      className="border-slate-200 focus:border-sky-300 focus:ring focus:ring-sky-200 focus:ring-opacity-50 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <Input
                      id="email"
                      type="email"
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      required
                      className="border-slate-200 focus:border-sky-300 focus:ring focus:ring-sky-200 focus:ring-opacity-50 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <Input
                      id="password"
                      type="password"
                      value={subPassword}
                      onChange={(e) => setSubPassword(e.target.value)}
                      required
                      className="border-slate-200 focus:border-sky-300 focus:ring focus:ring-sky-200 focus:ring-opacity-50 rounded-lg"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700"
                    disabled={subLoading}
                  >
                    {subLoading ? "Creando..." : "Crear Subcuenta"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            {/* Lista de subcuentas */}
            <Card className="shadow-md border border-slate-100 overflow-hidden rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-100">
                <CardTitle className="text-slate-800">Subcuentas Existentes</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {subAccountsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subAccounts.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-slate-500" />
                        </div>
                        <p className="text-slate-600">No hay subcuentas creadas</p>
                      </div>
                    ) : (
                      subAccounts.map(account => (
                        <div key={account.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center hover:bg-sky-50 hover:border-sky-200 transition-colors">
                          <div>
                            <p className="font-medium text-slate-800">{account.name}</p>
                            <p className="text-sm text-slate-500">{account.email}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={account.liberta === "si" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "border-sky-200 text-sky-600 hover:bg-sky-50"}
                              onClick={() => handleDarLiberta(account.id)}
                              disabled={account.liberta === "si"}
                            >
                              {account.liberta === "si" ? "Con Liberta" : "Dar Liberta"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                              onClick={() => handleDeleteSubAccount(account.id)}
                              disabled={deletingId === account.id}
                            >
                              {deletingId === account.id ? "Eliminando..." : "Eliminar"}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* Analíticas */}
      {activeTab === 'analytics' && !isSubAdmin && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Analítica Avanzada</h2>
          {/* Pasamos los productos como prop */}
          <ProductAnalyticsView products={products} />
        </div>
      )}
      
      {/* Info de Secciones */}
      {activeTab === 'info' && !isSubAdmin && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Gestión de Información</h2>
          <InfoManager />
        </div>
      )}
    </AdminLayout>
  );
};
