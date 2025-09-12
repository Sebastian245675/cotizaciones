import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, sendWelcomeEmail } from "@/firebase";
import { getDocumentById, createDocumentWithId, updateDocument } from "@/lib/database";
import React, { createContext, useContext, useEffect, useState } from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  departmentNumber: string;
  phone: string;
  address: string;
  isAdmin: boolean;
  subCuenta?: string; // Permite identificar subcuentas
}

interface AuthContextType {
  user: User | null;
  currentUser: any; // Firebase user object
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id' | 'isAdmin'> & { password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  isAdminOrSubCuenta: () => boolean; // Nueva función helper
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Escucha cambios de sesión de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Usar nuestro helper que maneja errores y fallbacks
          const userData = await getDocumentById("users", firebaseUser.uid);
          
          if (userData) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: userData.name || "",
              departmentNumber: userData.departmentNumber || userData.conjunto || "",
              phone: userData.phone || "",
              address: userData.address || "",
              isAdmin: firebaseUser.email === "admin@gmail.com" || firebaseUser.email === "admin@tienda.com" || userData?.isAdmin === true,
              subCuenta: userData.subCuenta || undefined
            });
          } else {
            // Si el usuario no existe en Firestore, crear un documento nuevo
          const newUserData = {
            name: firebaseUser.displayName || "",
            email: firebaseUser.email || "",
            phone: "",
            address: "",
            departmentNumber: "",
            conjunto: "",
            createdAt: new Date(),
            role: firebaseUser.email === "admin@gmail.com" || firebaseUser.email === "admin@tienda.com" ? 'admin' : 'customer',
            isAdmin: firebaseUser.email === "admin@gmail.com" || firebaseUser.email === "admin@tienda.com"
          };
          
          // Solo para usuarios que no son el primer inicio como admin
          if (firebaseUser.email !== "admin@gmail.com" && firebaseUser.email !== "admin@tienda.com") {
            // Usar nuestro helper que maneja errores y fallbacks
            await createDocumentWithId("users", firebaseUser.uid, newUserData);
            console.log("Documento de usuario creado automáticamente:", firebaseUser.uid);
          }
          
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "",
            departmentNumber: "",
            phone: "",
            address: "",
            isAdmin: firebaseUser.email === "admin@gmail.com" || firebaseUser.email === "admin@tienda.com"
          });
        }
        } catch (error) {
          console.error("Error al acceder a Firestore:", error);
          // En caso de error de permisos, aún permitimos el acceso con datos básicos
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || "",
            name: firebaseUser.displayName || "",
            departmentNumber: "",
            phone: "",
            address: "",
            isAdmin: firebaseUser.email === "admin@gmail.com" || firebaseUser.email === "admin@tienda.com"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Login con Firebase
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // El listener de arriba actualizará el usuario automáticamente
      return !!result.user;
    } catch (error) {
      return false;
    }
  };

  // Registro con Firebase
  const register = async (userData: Omit<User, 'id' | 'isAdmin'> & { password: string }): Promise<boolean> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      
      if (result.user) {
        // Eliminamos la contraseña del objeto userData antes de guardarlo en Firestore
        const { password, ...dataToSave } = userData;
        
        // Escribimos los datos del usuario en Firestore y lo marcamos como verificado directamente
        await setDoc(doc(db, "users", result.user.uid), {
          ...dataToSave,
          createdAt: new Date(),
          emailVerified: true, // Marcamos como verificado directamente
          isAdmin: userData.email === "admin@gmail.com" || userData.email === "admin@tienda.com"
        });
        
        // Enviar correo de bienvenida usando la Cloud Function
        try {
          await sendWelcomeEmail({
            email: userData.email,
            name: userData.name || userData.email.split('@')[0]
          });
          console.log("Correo de bienvenida enviado a:", userData.email);
        } catch (emailError) {
          console.error("Error al enviar correo de bienvenida:", emailError);
          // No interrumpimos el registro si falla el envío del correo
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error en registro:", error);
      return false;
    }
  };

  // Actualizar datos del usuario
  const updateUser = (userData: Partial<User>) => {
    if (!user || !user.id) return;
    
    // Actualizar en Firestore
    updateDocument("users", user.id, userData);
    
    // Actualizar estado local
    setUser({
      ...user,
      ...userData,
    });
  };

  // Cerrar sesión
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // Helper function to check if user is admin or subcuenta
  const isAdminOrSubCuenta = (): boolean => {
    if (!user) return false;
    return user.isAdmin || !!user.subCuenta || 
           user.email === "admin@gmail.com" || 
           user.email === "admin@tienda.com" ||
           user.email.includes('admin') ||
           user.email.includes('subcuenta');
  };

  // No mostramos nada mientras verificamos el estado de autenticación
  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  // Valor que se pasa al contexto
  const value = {
    user,
    currentUser,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdminOrSubCuenta,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
