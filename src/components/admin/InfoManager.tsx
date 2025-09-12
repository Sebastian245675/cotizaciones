import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, Timestamp, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SectionInfo {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  lastEdited: Timestamp | null;
  lastEditedBy?: string;
  version?: number;
  history?: {
    content: string;
    timestamp: Timestamp;
    editedBy: string;
  }[];
  meta?: {
    displayOrder?: number;
    icon?: string;
    category?: string;
    importance?: 'low' | 'medium' | 'high';
  };
}

const defaultSections = [
  { 
    id: 'about', 
    title: 'Sobre Nosotros', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 1,
      icon: 'info',
      category: 'company',
      importance: 'high' as const
    }
  },
  { 
    id: 'envios', 
    title: 'Envíos', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 2,
      icon: 'truck',
      category: 'shipping',
      importance: 'medium' as const
    }
  },
  { 
    id: 'retiros', 
    title: 'Retiros', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 3,
      icon: 'store',
      category: 'shipping',
      importance: 'medium' as const
    }
  },
  { 
    id: 'payment', 
    title: 'Métodos de Pago', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 4,
      icon: 'credit-card',
      category: 'finance',
      importance: 'high' as const
    }
  },
  { 
    id: 'faqs', 
    title: 'Preguntas Frecuentes', 
    content: '', 
    enabled: false, 
    lastEdited: null,
    version: 1,
    meta: {
      displayOrder: 5,
      icon: 'help-circle',
      category: 'support',
      importance: 'medium' as const
    }
  },
];

export const InfoManager: React.FC = () => {
  const [sections, setSections] = useState<SectionInfo[]>(defaultSections);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { user } = useAuth();
  const [liberta, setLiberta] = useState("no");
  const [activeTab, setActiveTab] = useState("all");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterImportance, setFilterImportance] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [historySection, setHistorySection] = useState<SectionInfo | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Verificar permisos del usuario
  useEffect(() => {
    const fetchLiberta = async () => {
      if (user && (user as any).email) {
        // Verificamos si es el usuario admin principal
        if ((user as any).email === "admin@gmail.com" || (user as any).email === "admin@tienda.com" || (user as any).isAdmin === true) {
          setLiberta("si"); // El admin siempre tiene permisos
          console.log("Usuario identificado como administrador, tiene permisos completos");
          return;
        }
        
        // Busca el usuario por email en la colección users
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        // Por defecto, las subcuentas no tienen libertad
        let foundLiberta = "no";
        
        querySnapshot.forEach((docu) => {
          const data = docu.data();
          if (data.email === (user as any).email) {
            // Sólo si explícitamente se ha configurado como "si", se otorga libertad
            foundLiberta = data.liberta === "si" ? "si" : "no";
          }
        });
        setLiberta(foundLiberta);
      }
    };
    fetchLiberta();
  }, [user]);

  useEffect(() => {
    const fetchSections = async () => {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'infoSections'));
      const infos: SectionInfo[] = defaultSections.map(s => ({ ...s }));
      
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const idx = infos.findIndex(s => s.id === docSnap.id);
        if (idx !== -1) {
          infos[idx] = {
            ...infos[idx],
            content: data.content || '',
            enabled: data.enabled ?? false,
            lastEdited: data.lastEdited || null,
            lastEditedBy: data.lastEditedBy || '',
            version: data.version || 1,
            history: data.history || [],
          };
        }
      });
      
      setSections(infos);
      setLoading(false);
    };
    
    fetchSections();
  }, []);
  
  // Filtrado de secciones usando useMemo
  const filteredSections = useMemo(() => {
    let result = [...sections];
    
    // Filtrar por categoría
    if (filterCategory) {
      result = result.filter(section => section.meta?.category === filterCategory);
    }
    
    // Filtrar por importancia
    if (filterImportance) {
      result = result.filter(section => section.meta?.importance === filterImportance);
    }
    
    // Filtrar por pestaña activa
    if (activeTab === 'enabled') {
      result = result.filter(section => section.enabled);
    } else if (activeTab === 'disabled') {
      result = result.filter(section => !section.enabled);
    }
    
    // Ordenar por el orden de visualización
    result.sort((a, b) => (a.meta?.displayOrder || 0) - (b.meta?.displayOrder || 0));
    
    return result;
  }, [sections, filterCategory, filterImportance, activeTab]);
  
  // Extraer las categorías únicas para el filtro
  const categories = useMemo(() => {
    const uniqueCategories = new Set(sections.map(s => s.meta?.category).filter(Boolean));
    return Array.from(uniqueCategories);
  }, [sections]);

  const handleEdit = (id: string, content: string) => {
    setEditingId(id);
    setEditContent(content);
  };

  const handleSave = async (id: string) => {
    setLoading(true);
    try {
      const section = sections.find(s => s.id === id);
      if (!section) return;
      
      const timestamp = Timestamp.now();
      const editorName = (user as any)?.displayName || (user as any)?.email || "Usuario";
      
      // Preparar el historial
      const historyEntry = {
        content: section.content,
        timestamp,
        editedBy: editorName
      };
      
      const currentVersion = section.version || 1;
      const newVersion = currentVersion + 1;
      
      // Si el usuario tiene liberta o es administrador, realiza cambios directamente
      if (liberta === "si") {
        const history = [...(section.history || []), historyEntry];
        
        await setDoc(doc(db, 'infoSections', id), {
          content: editContent,
          enabled: true,
          lastEdited: timestamp,
          lastEditedBy: editorName,
          version: newVersion,
          history: history,
        }, { merge: true });
        
        toast({
          title: "Sección actualizada",
          description: `La sección ${section.title} ha sido actualizada exitosamente (v${newVersion}).`,
        });
        
        // Actualizar el estado local
        setSections(currentSections => 
          currentSections.map(s => s.id === id ? { 
            ...s, 
            content: editContent, 
            enabled: true, 
            lastEdited: timestamp,
            lastEditedBy: editorName,
            version: newVersion,
            history: [...(s.history || []), historyEntry]
          } : s)
        );
      } else {
        // Si no tiene libertad, enviar a revisión
        await addDoc(collection(db, "revision"), {
          type: "info_edit",
          entity: "infoSections",
          sectionId: id,
          sectionTitle: section.title,
          data: {
            content: editContent,
            enabled: true,
            previousContent: section.content || "",
            version: newVersion,
            historyEntry
          },
          userId: (user as any)?.uid || (user as any)?.email || "desconocido",
          userName: editorName,
          createdAt: timestamp,
        });
        
        toast({
          title: "Solicitud enviada",
          description: `Tu edición de la sección "${section.title}" fue enviada para revisión del administrador.`,
        });
      }
      
      setEditingId(null);
      setEditContent('');
      
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnableToggle = async (id: string, enabled: boolean) => {
    setLoading(true);
    try {
      const section = sections.find(s => s.id === id);
      if (!section) return;
      
      const timestamp = Timestamp.now();
      const editorName = (user as any)?.displayName || (user as any)?.email || "Usuario";
      
      // Si el usuario tiene liberta o es administrador, realiza cambios directamente
      if (liberta === "si") {
        await updateDoc(doc(db, 'infoSections', id), {
          enabled,
          lastEdited: timestamp,
          lastEditedBy: editorName
        });
        
        setSections(sections.map(s => s.id === id ? { 
          ...s, 
          enabled,
          lastEdited: timestamp,
          lastEditedBy: editorName
        } : s));
        
        toast({
          title: `Sección ${enabled ? 'habilitada' : 'deshabilitada'}`,
          description: `La sección ${section.title} ha sido ${enabled ? 'habilitada' : 'deshabilitada'} exitosamente.`,
        });
      } else {
        // Si no tiene libertad, enviar a revisión
        await addDoc(collection(db, "revision"), {
          type: "info_toggle",
          entity: "infoSections",
          sectionId: id,
          sectionTitle: section.title,
          data: {
            enabled,
            previousEnabled: section.enabled
          },
          userId: (user as any)?.uid || (user as any)?.email || "desconocido",
          userName: editorName,
          createdAt: timestamp,
        });
        
        toast({
          title: "Solicitud enviada",
          description: `Tu solicitud para ${enabled ? 'habilitar' : 'deshabilitar'} la sección "${section.title}" fue enviada para revisión del administrador.`,
        });
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast({
        title: "Error",
        description: "No se pudo cambiar el estado de la sección. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Método para ver el historial de una sección
  const handleViewHistory = (section: SectionInfo) => {
    setHistorySection(section);
    setIsHistoryModalOpen(true);
  };
  
  // Método para restaurar una versión anterior
  const handleRestoreVersion = async (historyItem: { content: string, timestamp: Timestamp, editedBy: string }, sectionId: string) => {
    if (!historySection) return;
    
    setEditingId(sectionId);
    setEditContent(historyItem.content);
    setIsHistoryModalOpen(false);
    
    toast({
      title: "Versión cargada",
      description: `Se ha cargado la versión editada por ${historyItem.editedBy} el ${historyItem.timestamp.toDate().toLocaleString()}. Guarde los cambios para confirmar la restauración.`,
    });
  };
  
  // Método para renderizar el icono según el nombre
  const renderIcon = (iconName: string) => {
    const iconMap: Record<string, JSX.Element> = {
      'info': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="8"></line>
        </svg>
      ),
      'truck': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      ),
      'store': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      'credit-card': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
      'help-circle': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12" y2="17"></line>
        </svg>
      ),
      // Icono por defecto para manejar cualquier caso no definido
      'default': (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="8"></line>
        </svg>
      )
    };
    
    return iconMap[iconName] || iconMap['default'];
  };
  
  // Método para obtener el color de importancia
  const getImportanceColor = (importance: 'low' | 'medium' | 'high') => {
    switch(importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Método para obtener el texto de importancia
  const getImportanceText = (importance: 'low' | 'medium' | 'high') => {
    switch(importance) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return '';
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Gestión de Información de Secciones
          </h2>
          <p className="text-slate-500 mt-1">Administra toda la información estática del sitio</p>
        </div>
        
        {liberta !== "si" && (
          <div className="flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-md text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Tus cambios requieren aprobación
          </div>
        )}
      </div>
      
      {/* Barra de filtros y herramientas */}
      <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterCategory || "all"} onValueChange={(value) => setFilterCategory(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterImportance || "all"} onValueChange={(value) => setFilterImportance(value === "all" ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por importancia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las importancias</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-500">Vista de tarjetas</span>
            <Switch checked={viewMode === 'card'} onCheckedChange={(checked) => setViewMode(checked ? 'card' : 'list')} />
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="enabled">Activas</TabsTrigger>
              <TabsTrigger value="disabled">Inactivas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {loading && 
        <div className="mb-4 flex items-center justify-center p-4 bg-blue-50 text-blue-700 rounded-md">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Cargando información...
        </div>
      }
      
      {/* Vista de secciones */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSections.map(section => (
            <Card key={section.id} className={`overflow-hidden ${section.enabled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-300'}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                      {section.meta?.icon ? renderIcon(section.meta.icon) : renderIcon('default')}
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Switch 
                            checked={section.enabled} 
                            onCheckedChange={(checked) => handleEnableToggle(section.id, checked)} 
                            disabled={loading}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {section.enabled ? 'Deshabilitar sección' : 'Habilitar sección'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {section.meta?.category && (
                    <Badge variant="outline" className="text-xs">
                      {section.meta.category.charAt(0).toUpperCase() + section.meta.category.slice(1)}
                    </Badge>
                  )}
                  {section.meta?.importance && (
                    <Badge className={`text-xs ${getImportanceColor(section.meta.importance)}`}>
                      {getImportanceText(section.meta.importance)}
                    </Badge>
                  )}
                  {section.version && (
                    <Badge variant="outline" className="text-xs bg-blue-50">
                      v{section.version}
                    </Badge>
                  )}
                </div>
                <CardDescription className="mt-2 text-xs flex items-center justify-between">
                  <span>
                    {section.lastEdited ? (
                      <>
                        Última edición: {section.lastEdited.toDate().toLocaleString()}
                        {section.lastEditedBy && <span> por {section.lastEditedBy}</span>}
                      </>
                    ) : (
                      'Sin ediciones'
                    )}
                  </span>
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {editingId === section.id ? (
                  <textarea
                    className="w-full border rounded p-2 mb-2 min-h-[100px]"
                    rows={4}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                ) : (
                  <div className="p-2 bg-slate-50 rounded min-h-[80px] max-h-[120px] overflow-y-auto text-sm">
                    {section.content ? (
                      section.content
                    ) : (
                      <span className="text-gray-400 italic">Sin información personalizada</span>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2 gap-2">
                {editingId === section.id ? (
                  <>
                    <Button size="sm" onClick={() => handleSave(section.id)} disabled={loading} className="flex-1">
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={loading} className="flex-1">
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={() => handleEdit(section.id, section.content)} disabled={loading} className="flex-1">
                      Editar contenido
                    </Button>
                    {section.history && section.history.length > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewHistory(section)}
                              className="px-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Ver historial de versiones
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map(section => (
            <div key={section.id} className={`border rounded-lg p-4 ${section.enabled ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-slate-300'}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-md">
                    {section.meta?.icon ? renderIcon(section.meta.icon) : renderIcon('default')}
                  </div>
                  <h3 className="text-lg font-semibold">{section.title}</h3>
                  <div className="flex gap-2">
                    {section.meta?.category && (
                      <Badge variant="outline" className="text-xs">
                        {section.meta.category.charAt(0).toUpperCase() + section.meta.category.slice(1)}
                      </Badge>
                    )}
                    {section.meta?.importance && (
                      <Badge className={`text-xs ${getImportanceColor(section.meta.importance)}`}>
                        {getImportanceText(section.meta.importance)}
                      </Badge>
                    )}
                    {section.version && (
                      <Badge variant="outline" className="text-xs bg-blue-50">
                        v{section.version}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Habilitado</span>
                  <Switch 
                    checked={section.enabled} 
                    onCheckedChange={(checked) => handleEnableToggle(section.id, checked)} 
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="mb-2 text-xs text-gray-500 flex items-center justify-between">
                <span>
                  {section.lastEdited ? (
                    <>
                      Última edición: {section.lastEdited.toDate().toLocaleString()}
                      {section.lastEditedBy && <span> por {section.lastEditedBy}</span>}
                    </>
                  ) : (
                    'Sin ediciones'
                  )}
                </span>
              </div>
              
              {editingId === section.id ? (
                <div>
                  <textarea
                    className="w-full border rounded p-2 mb-2"
                    rows={4}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(section.id)} disabled={loading}>Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={loading}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 p-2 bg-slate-50 rounded min-h-[48px]">{section.content || <span className="text-gray-400 italic">Sin información personalizada</span>}</div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEdit(section.id, section.content)} disabled={loading}>
                      Editar contenido
                    </Button>
                    {section.history && section.history.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleViewHistory(section)}
                      >
                        Ver historial ({section.history.length})
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Modal para historial de versiones */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones - {historySection?.title}</DialogTitle>
            <DialogDescription>
              A continuación se muestran todas las versiones anteriores de este contenido.
            </DialogDescription>
          </DialogHeader>
          
          {historySection?.history && Array.isArray(historySection.history) && historySection.history.length > 0 ? (
            <div className="max-h-[60vh] overflow-y-auto space-y-4 p-1">
              {historySection.history.map((item, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">
                      Versión {index + 1} 
                      <span className="ml-2 text-gray-500">
                        {item.timestamp && typeof item.timestamp.toDate === 'function' 
                          ? `(${item.timestamp.toDate().toLocaleString()})`
                          : '(Fecha no disponible)'
                        }
                      </span>
                    </div>
                    <Badge variant="outline">Editado por {item.editedBy || 'Usuario desconocido'}</Badge>
                  </div>
                  <div className="bg-slate-50 p-2 rounded text-sm mb-2 whitespace-pre-wrap">
                    {item.content || <span className="text-gray-400 italic">Sin contenido</span>}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleRestoreVersion(item, historySection.id)}
                    className="w-full mt-1"
                  >
                    Restaurar esta versión
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded text-center">
              No hay versiones anteriores disponibles para este contenido.
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {filteredSections.length === 0 && !loading && (
        <Alert className="bg-slate-50">
          <AlertDescription>
            No se encontraron secciones que coincidan con los filtros aplicados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default InfoManager;
