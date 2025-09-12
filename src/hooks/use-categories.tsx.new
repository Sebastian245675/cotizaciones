import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";

// Modelo más completo de una categoría
export interface Category {
  id?: string;
  name: string;
  image?: string;
  parentId?: string;
  parentName?: string;
  isMain?: boolean;
}

// Función de utilidad para normalizar string (quitar acentos, etc.)
function normalize(str: string = ""): string {
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(["Todos"]);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        // Obtener todas las categorías y procesarlas
        const todosCategory = { 
          id: "todos", 
          name: "Todos", 
          image: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=facearea&w=96&q=80",
          isMain: true 
        };

        const firebaseCats = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            image: data.image,
            parentId: data.parentId,
            parentName: data.parentName,
            // Es categoría principal si no tiene parentId o está vacío
            isMain: !data.parentId || data.parentId === ""
          };
        });

        const processedCats = [todosCategory, ...firebaseCats];
        console.log("Categorías cargadas:", processedCats.length);
        
        // Logging para depuración
        console.log("Categorías principales:", processedCats.filter(cat => cat.isMain).map(c => c.name));
        
        const subcats = processedCats.filter(cat => cat.parentId && !cat.isMain);
        console.log("Subcategorías:", subcats.length);
        
        // Log algunas subcategorías con su parentId
        subcats.slice(0, 5).forEach(subcat => {
          console.log(`Subcategoría: ${subcat.name}, parentId: ${subcat.parentId}, parentName: ${subcat.parentName}`);
        });
        
        // Log terceras categorías (tienen parentId que es una subcategoría)
        const terceras = processedCats.filter(cat => {
          if (!cat.parentId) return false;
          const parent = processedCats.find(p => p.id === cat.parentId);
          return parent && parent.parentId; // Si el padre tiene parentId, esta es una tercera categoría
        });
        
        console.log("Terceras categorías:", terceras.length);
        terceras.slice(0, 5).forEach(terc => {
          const parent = processedCats.find(p => p.id === terc.parentId);
          console.log(`Tercera: ${terc.name}, parentId: ${terc.parentId}, parent: ${parent?.name}`);
        });

        setCategoriesData(processedCats);
        
        // Solo incluir en el array de strings las categorías principales
        const mainCategories = processedCats
          .filter(cat => cat.isMain)
          .map(cat => cat.name);
        
        setCategories(mainCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  // Categorías principales solamente
  const mainCategories = React.useMemo(() => {
    return categoriesData.filter(cat => cat.isMain);
  }, [categoriesData]);

  // Subcategorías agrupadas por categoría principal
  const subcategoriesByParent = React.useMemo(() => {
    const result: Record<string, Category[]> = {};
    
    categoriesData.forEach(cat => {
      if (cat.parentId && cat.parentName) {
        if (!result[cat.parentName]) {
          result[cat.parentName] = [];
        }
        result[cat.parentName].push(cat);
      }
    });
    
    return result;
  }, [categoriesData]);

  return { 
    categories, 
    categoriesData, 
    mainCategories,
    subcategoriesByParent,
    loading, 
    setCategories,
    normalize 
  };
}
