import React from 'react';
import {
  Shirt,
  Utensils,
  Laptop,
  ShoppingBag,
  Gamepad2,
  Baby,
  Car,
  Home,
  BookOpen,
  Dumbbell,
  ShowerHead,
  Palette,
  Music,
  Syringe,
  Camera,
  Heart,
  BadgeDollarSign,
  PiggyBank,
  Sparkles,
  LucideIcon,
  Footprints,
  Presentation,
  Smartphone,
  Watch,
  Headphones,
  Tv,
  Mouse,
  Printer,
  Scissors,
  Umbrella,
  GlassWater,
  CookingPot,
  Sofa,
  Bed,
  Lamp,
  Tent,
  Bath,
  Dog,
  Flower2,
  Microscope,
  BookMarked,
  Pill,
  Stethoscope,
  Bike
} from 'lucide-react';

type CategoryIcon = {
  name: string;
  icon: LucideIcon;
  color: string;
};

// Mapeo de categorías a iconos con color
const categoryIcons: CategoryIcon[] = [
  // Electrónica y Tecnología
  { name: 'Electrónica', icon: Laptop, color: '#3B82F6' },
  { name: 'Smartphones', icon: Smartphone, color: '#6366F1' },
  { name: 'Audio', icon: Headphones, color: '#8B5CF6' },
  { name: 'TV', icon: Tv, color: '#EC4899' },
  { name: 'Computación', icon: Mouse, color: '#0891B2' },
  { name: 'Impresoras', icon: Printer, color: '#0D9488' },
  { name: 'Cámaras', icon: Camera, color: '#4F46E5' },
  { name: 'Relojes', icon: Watch, color: '#8B5CF6' },

  // Ropa y Accesorios
  { name: 'Ropa', icon: Shirt, color: '#EC4899' },
  { name: 'Calzado', icon: Footprints, color: '#F59E0B' },
  { name: 'Accesorios', icon: Umbrella, color: '#8B5CF6' },
  { name: 'Moda', icon: Shirt, color: '#EC4899' },

  // Hogar y Decoración
  { name: 'Bazar', icon: GlassWater, color: '#0D9488' },
  { name: 'Cocina', icon: Utensils, color: '#F59E0B' },
  { name: 'Muebles', icon: Sofa, color: '#78350F' },
  { name: 'Dormitorio', icon: Bed, color: '#6366F1' },
  { name: 'Iluminación', icon: Lamp, color: '#F59E0B' },
  { name: 'Jardín', icon: Flower2, color: '#10B981' },
  { name: 'Exterior', icon: Tent, color: '#F97316' },
  { name: 'Baño', icon: Bath, color: '#0891B2' },
  { name: 'Hogar', icon: Home, color: '#10B981' },

  // Belleza y Cuidado Personal
  { name: 'Perfumería', icon: Sparkles, color: '#EC4899' },
  { name: 'Belleza', icon: Sparkles, color: '#EC4899' },
  { name: 'Cuidado personal', icon: ShowerHead, color: '#8B5CF6' },

  // Juguetes y Entretenimiento
  { name: 'Juguetes', icon: Gamepad2, color: '#EF4444' },
  { name: 'Juegos', icon: Gamepad2, color: '#EF4444' },
  { name: 'Entretenimiento', icon: Gamepad2, color: '#EF4444' },

  // Alimentos y Bebidas
  { name: 'Alimentos', icon: Utensils, color: '#F97316' },
  { name: 'Bebidas', icon: GlassWater, color: '#0891B2' },
  { name: 'Comidas', icon: CookingPot, color: '#F97316' },

  // Niños
  { name: 'Bebés', icon: Baby, color: '#EC4899' },
  { name: 'Infantil', icon: Baby, color: '#EC4899' },
  { name: 'Niños', icon: Baby, color: '#EC4899' },

  // Mascotas
  { name: 'Mascotas', icon: Dog, color: '#F97316' },
  { name: 'Perros', icon: Dog, color: '#F97316' },
  { name: 'Gatos', icon: Dog, color: '#F97316' },

  // Deportes y Fitness
  { name: 'Deportes', icon: Dumbbell, color: '#2563EB' },
  { name: 'Fitness', icon: Dumbbell, color: '#2563EB' },
  { name: 'Ciclismo', icon: Bike, color: '#2563EB' },
  { name: 'Accesorios deportivos', icon: Dumbbell, color: '#2563EB' },

  // Arte y Manualidades
  { name: 'Arte', icon: Palette, color: '#6366F1' },
  { name: 'Manualidades', icon: Palette, color: '#6366F1' },
  { name: 'Instrumentos', icon: Music, color: '#8B5CF6' },

  // Salud
  { name: 'Salud', icon: Heart, color: '#EF4444' },
  { name: 'Farmacia', icon: Pill, color: '#EF4444' },
  { name: 'Médico', icon: Stethoscope, color: '#EF4444' },

  // Categorías Especiales
  { name: 'Ofertas', icon: BadgeDollarSign, color: '#F59E0B' },
  { name: 'Descuentos', icon: BadgeDollarSign, color: '#F59E0B' },
  { name: 'Promociones', icon: PiggyBank, color: '#F59E0B' },
  { name: 'Novedades', icon: Sparkles, color: '#EC4899' },

  // Educación
  { name: 'Libros', icon: BookMarked, color: '#0891B2' },
  { name: 'Educación', icon: BookOpen, color: '#0891B2' },
  { name: 'Ciencia', icon: Microscope, color: '#8B5CF6' },

  // Otros
  { name: 'Autos', icon: Car, color: '#1E293B' },
  { name: 'Varios', icon: ShoppingBag, color: '#64748B' }
];

interface CategoryIconSelectorProps {
  categoryName: string;
  size?: number;
  className?: string;
}

const CategoryIconSelector: React.FC<CategoryIconSelectorProps> = ({ 
  categoryName, 
  size = 24, 
  className = '' 
}) => {
  // Convertir el nombre de la categoría a minúsculas para hacer la búsqueda insensible a mayúsculas
  const normalizedName = categoryName.toLowerCase();
  
  // Buscar coincidencias exactas primero
  let match = categoryIcons.find(item => 
    item.name.toLowerCase() === normalizedName
  );
  
  // Si no hay coincidencia exacta, buscar coincidencias parciales
  if (!match) {
    match = categoryIcons.find(item => 
      normalizedName.includes(item.name.toLowerCase()) || 
      item.name.toLowerCase().includes(normalizedName)
    );
  }
  
  // Si todavía no hay coincidencia, usar un icono predeterminado
  if (!match) {
    match = { name: 'Default', icon: ShoppingBag, color: '#64748B' };
  }
  
  const IconComponent = match.icon;
  
  return (
    <IconComponent 
      size={size} 
      className={className} 
      color={match.color} 
      strokeWidth={1.75} 
    />
  );
};

export default CategoryIconSelector;
