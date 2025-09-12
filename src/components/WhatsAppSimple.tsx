import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  MessageCircle,
  MessageCircleOff,
  Phone,
  Send,
  QrCode,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Smartphone,
  MessageSquare,
  Bot,
  Target,
  TrendingUp,
  Activity,
  Bell,
  Zap,
  Play,
  Pause,
  Settings,
  Brain,
  TestTube,
  Save,
  Trash2,
  Edit,
  Clock,
  Facebook,
  ExternalLink,
  Upload,
  FileText,
  Image,
  Mic,
  Volume2,
  Eye,
  Download,
  BookOpen,
  Search,
  Send as TelegramIcon
} from 'lucide-react';

const WHATSAPP_API_URL = 'http://localhost:3001/api/whatsapp';

interface WhatsAppInstance {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'qr_ready' | 'error';
  phoneNumber?: string;
  qr?: string;
}

interface Chat {
  id: string;
  instance_id: string;
  phone_number: string;
  contact_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  from_number: string;
  to_number: string;
  message_text: string;
  timestamp: string;
  is_from_me: boolean;
}

interface FacebookInstance {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  username?: string;
}

interface FacebookChat {
  id: string;
  instance_id: string;
  chat_id: string;
  contact_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface FacebookMessage {
  id: string;
  chat_id: string;
  message_text: string;
  timestamp: string;
  is_from_me: boolean;
  sender_name?: string;
}

interface UnifiedChat {
  id: string;
  platform: 'whatsapp' | 'facebook';
  instance_id: string;
  identifier: string; // phone_number para WhatsApp, chat_id para Facebook
  contact_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  originalChat: Chat | FacebookChat;
}

// Interfaces para tracking de costos de IA
interface AIUsageRecord {
  id: string;
  timestamp: string;
  provider: 'openai' | 'anthropic';
  model: string;
  tokensUsed: number;
  cost: number;
  messageLength: number;
  responseLength: number;
  chat_id?: string;
  phone_number?: string;
}

interface AIUsageStats {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  costByProvider: {
    openai: number;
    anthropic: number;
  };
  requestsByProvider: {
    openai: number;
    anthropic: number;
  };
  dailyCosts: { [date: string]: number };
  monthlyCosts: { [month: string]: number };
}

// Precios por token (aproximados en USD)
const AI_PRICING = {
  openai: {
    'gpt-4o-mini': {
      input: 0.00015 / 1000, // $0.15 por 1K tokens
      output: 0.0006 / 1000   // $0.60 por 1K tokens
    },
    'gpt-4': {
      input: 0.03 / 1000,     // $30 por 1K tokens
      output: 0.06 / 1000     // $60 por 1K tokens
    }
  },
  anthropic: {
    'claude-3-sonnet-20240229': {
      input: 0.003 / 1000,    // $3 por 1K tokens
      output: 0.015 / 1000    // $15 por 1K tokens
    },
    'claude-3-haiku-20240307': {
      input: 0.00025 / 1000,  // $0.25 por 1K tokens
      output: 0.00125 / 1000  // $1.25 por 1K tokens
    }
  }
};

const WhatsAppSimple: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string>('');
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Estados para Facebook
  const [facebookInstances, setFacebookInstances] = useState<FacebookInstance[]>([]);
  const [selectedFacebookInstance, setSelectedFacebookInstance] = useState<string>('');
  const [facebookChats, setFacebookChats] = useState<FacebookChat[]>([]);
  const [selectedFacebookChat, setSelectedFacebookChat] = useState<FacebookChat | null>(null);
  const [facebookMessages, setFacebookMessages] = useState<FacebookMessage[]>([]);
  const [newFacebookMessage, setNewFacebookMessage] = useState('');
  const [showFacebookLoginDialog, setShowFacebookLoginDialog] = useState(false);
  const [facebookCredentials, setFacebookCredentials] = useState({
    username: '',
    password: ''
  });

  // Estados para Telegram Bot
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '');
  const [telegramBotConnected, setTelegramBotConnected] = useState(false);
  const [telegramBotStatus, setTelegramBotStatus] = useState('Desconectado');
  const [telegramMessages, setTelegramMessages] = useState(0);
  const [telegramExercises, setTelegramExercises] = useState(0);
  const [telegramBotInfo, setTelegramBotInfo] = useState<any>(null);
  const [telegramLogs, setTelegramLogs] = useState<Array<{time: string, message: string, type: 'info' | 'success' | 'error'}>>([]);
  const [telegramChats, setTelegramChats] = useState<Array<{id: string, name: string, username?: string, lastMessage: string, timestamp: string}>>([]);
  const [telegramChatMessages, setTelegramChatMessages] = useState<Array<{
    id: string | number, 
    chatId: string, 
    userId: string,
    userName: string,
    messageText: string, 
    response: string, 
    timestamp: string, 
    hasImage: boolean
  }>>([]);
  const telegramStatsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para vista de chats
  const [unifiedChatsView, setUnifiedChatsView] = useState(true);

  // Estados para tracking de costos de IA
  const [aiUsageRecords, setAiUsageRecords] = useState<AIUsageRecord[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<AIUsageStats>({
    totalCost: 0,
    totalTokens: 0,
    totalRequests: 0,
    costByProvider: { openai: 0, anthropic: 0 },
    requestsByProvider: { openai: 0, anthropic: 0 },
    dailyCosts: {},
    monthlyCosts: {}
  });
  const [showCostDialog, setShowCostDialog] = useState(false);

  // Estados para memoria de contexto por flujo
  const [flowContextMemory, setFlowContextMemory] = useState<{[flowId: string]: {
    documents: any[];
    extractedContent: string;
    priority: number;
    lastUpdated: string;
  }}>({});

  // Estados para IA Avanzada
  const [aiAgents, setAiAgents] = useState<any[]>([]);
  const [advancedFlows, setAdvancedFlows] = useState<any[]>([]);
  const [showAIAgentDialog, setShowAIAgentDialog] = useState(false);
  const [showAdvancedFlowDialog, setShowAdvancedFlowDialog] = useState(false);
  const [editingAdvancedFlow, setEditingAdvancedFlow] = useState<any>(null);
  const [showEditAdvancedFlowDialog, setShowEditAdvancedFlowDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showEditAgentDialog, setShowEditAgentDialog] = useState(false);
  
  const [aiAgentForm, setAiAgentForm] = useState({
    name: '',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    systemPrompt: 'Eres un asistente de atención al cliente profesional y amigable.',
    temperature: 0.7,
    maxTokens: 300,
    selectedDocuments: [] as string[], // IDs de documentos para contexto
    capabilities: {
      processImages: true,
      transcribeAudio: true,
      contextSearch: true,
      smartResponses: true
    }
  });
  const [advancedFlowForm, setAdvancedFlowForm] = useState({
    name: '',
    description: '',
    triggerType: 'keyword',
    triggerValue: '',
    aiAgentId: '',
    steps: [],
    flowDocuments: [] as File[] // Para almacenar archivos del flujo
  });
  const [testingAgent, setTestingAgent] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Estados para gestión de documentos y contexto de IA
  const [aiDocuments, setAiDocuments] = useState<any[]>([]);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    name: '',
    description: '',
    type: 'pdf' as 'pdf' | 'word' | 'image' | 'audio',
    file: null as File | null
  });
  const [processingMedia, setProcessingMedia] = useState(false);
  const [mediaAnalysis, setMediaAnalysis] = useState<any>(null);

  // WebSocket connection
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const facebookMessagesEndRef = useRef<HTMLDivElement>(null);

  // Estados para automatización básica
  const [basicFlows, setBasicFlows] = useState<any[]>([]);
  const [showBasicFlowDialog, setShowBasicFlowDialog] = useState(false);
  const [basicFlowForm, setBasicFlowForm] = useState({
    name: '',
    description: '',
    triggers: [''],
    responses: [''],
    delay: 0,
    active: true
  });
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  
  // Estado para memoria de conversaciones IA
  const [conversationMemory, setConversationMemory] = useState<{[phoneNumber: string]: Array<{role: string, content: string, timestamp: number}>}>({});

  // Funciones para manejo de memoria de conversaciones
  const addToConversationMemory = (phoneNumber: string, role: 'user' | 'assistant', content: string) => {
    const timestamp = Date.now();
    setConversationMemory(prev => {
      const currentConversation = prev[phoneNumber] || [];
      
      // Mantener solo los últimos 10 mensajes para evitar sobrecargar
      const newConversation = [...currentConversation, { role, content, timestamp }].slice(-10);
      
      return {
        ...prev,
        [phoneNumber]: newConversation
      };
    });
    
    // También guardar en localStorage para persistencia
    try {
      const allMemory = {
        ...conversationMemory,
        [phoneNumber]: [...(conversationMemory[phoneNumber] || []), { role, content, timestamp }].slice(-10)
      };
      localStorage.setItem('conversationMemory', JSON.stringify(allMemory));
    } catch (error) {
      console.warn('Error guardando memoria en localStorage:', error);
    }
  };

  const getConversationContext = (phoneNumber: string): string => {
    const conversation = conversationMemory[phoneNumber] || [];
    if (conversation.length === 0) return '';
    
    let context = '\n\n=== HISTORIAL DE CONVERSACIÓN ===\n';
    conversation.forEach(msg => {
      const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      context += `[${time}] ${role}: ${msg.content}\n`;
    });
    context += '=== FIN HISTORIAL ===\n\n';
    context += '⚠️ INSTRUCCIÓN: Usa el historial anterior para mantener contexto y coherencia en la conversación. Recuerda lo que se ha discutido previamente.\n';
    
    return context;
  };

  const clearConversationMemory = (phoneNumber?: string) => {
    if (phoneNumber) {
      setConversationMemory(prev => {
        const newMemory = { ...prev };
        delete newMemory[phoneNumber];
        return newMemory;
      });
      
      try {
        const allMemory = { ...conversationMemory };
        delete allMemory[phoneNumber];
        localStorage.setItem('conversationMemory', JSON.stringify(allMemory));
      } catch (error) {
        console.warn('Error actualizando localStorage:', error);
      }
    } else {
      // Limpiar toda la memoria
      setConversationMemory({});
      localStorage.removeItem('conversationMemory');
    }
  };

  // Cargar memoria desde localStorage al inicializar
  useEffect(() => {
    try {
      const savedMemory = localStorage.getItem('conversationMemory');
      if (savedMemory) {
        const parsedMemory = JSON.parse(savedMemory);
        setConversationMemory(parsedMemory);
        console.log('💾 Memoria de conversaciones cargada:', Object.keys(parsedMemory).length, 'números');
      }
    } catch (error) {
      console.warn('Error cargando memoria desde localStorage:', error);
    }
  }, []);

  // Función para cargar flujos básicos desde el backend
  const loadBasicFlows = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/whatsapp/flows');
      const data = await response.json();
      if (data.flows) {
        // Filtrar solo flujos simples (sin IA)
        const simpleFlows = data.flows.filter((flow: any) => !flow.ai_config);
        setBasicFlows(simpleFlows);
        
        // También cargar flujos avanzados (con IA)
        const advancedFlowsData = data.flows.filter((flow: any) => flow.ai_config);
        const formattedAdvancedFlows = advancedFlowsData.map((flow: any) => ({
          id: flow.id,
          name: flow.name,
          description: flow.description,
          triggerType: flow.trigger_keywords && flow.trigger_keywords.length > 0 ? 'keyword' : 'message',
          triggerValue: flow.trigger_keywords && flow.trigger_keywords.length > 0 ? flow.trigger_keywords[0] : '',
          aiAgentId: flow.ai_config?.agent_id || '',
          active: flow.is_active
        }));
        setAdvancedFlows(formattedAdvancedFlows);
      }
    } catch (error) {
      console.error('Error cargando flujos:', error);
    }
  };

  // Función para guardar flujo básico
  const saveBasicFlow = async (flow: any) => {
    try {
      console.log('💾 Guardando flujo:', editingFlowId ? 'EDITAR' : 'CREAR', flow.name);
      console.log('🔧 ID de edición:', editingFlowId);
      console.log('📝 Datos del flujo:', flow);
      
      // Determinar si es creación o edición
      const isEditing = editingFlowId !== null;
      const url = isEditing 
        ? `http://localhost:3001/api/whatsapp/flows/${editingFlowId}`
        : 'http://localhost:3001/api/whatsapp/flows';
      const method = isEditing ? 'PATCH' : 'POST';
      
      console.log('🌐 URL:', url);
      console.log('📤 Método:', method);
      
      const payload = {
        name: flow.name,
        description: flow.description,
        triggerKeywords: flow.triggers,
        steps: flow.responses.map((response: string, index: number) => ({
          type: 'message',
          content: response,
          delay: index > 0 ? flow.delay : 0
        })),
        is_active: flow.active
      };
      
      console.log('📦 Payload:', payload);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      console.log('📊 Status de respuesta:', response.status);
      console.log('📊 Headers de respuesta:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('📄 Respuesta raw:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Error parseando JSON:', e);
        data = { success: false, error: 'Respuesta no es JSON válido', rawResponse: responseText };
      }
      
      if (response.ok && data.success) {
        console.log(`✅ Flujo ${isEditing ? 'actualizado' : 'creado'} exitosamente`);
        loadBasicFlows(); // Recargar flujos
        
        // Limpiar estado de edición
        setEditingFlowId(null);
        
        return true;
      } else {
        console.error('❌ Error del servidor:', data);
        alert(`Error ${isEditing ? 'actualizando' : 'creando'} flujo: ${data.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('❌ Error guardando flujo:', error);
      alert(`Error de conexión: ${error.message}`);
    }
    return false;
  };

  // Función para toggle activar/desactivar flujo
  const toggleBasicFlow = async (flowId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`http://localhost:3001/api/whatsapp/flows/${flowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentActive
        })
      });
      
      if (response.ok) {
        loadBasicFlows(); // Recargar flujos
        return true;
      }
    } catch (error) {
      console.error('Error actualizando flujo:', error);
    }
    return false;
  };

  // Función para eliminar flujo
  const deleteBasicFlow = async (flowId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/whatsapp/flows/${flowId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadBasicFlows(); // Recargar flujos
        return true;
      }
    } catch (error) {
      console.error('Error eliminando flujo:', error);
    }
    return false;
  };

  // Funciones para flujos avanzados
  const editAdvancedFlow = (flow: any) => {
    console.log('✏️ Editando flujo avanzado:', flow);
    setEditingAdvancedFlow(flow);
    setShowEditAdvancedFlowDialog(true);
  };

  const toggleAdvancedFlow = async (flowId: string, currentActive: boolean) => {
    try {
      console.log(`🔄 ${currentActive ? 'Desactivando' : 'Activando'} flujo avanzado:`, flowId);
      
      const response = await fetch(`http://localhost:3001/api/whatsapp/flows/${flowId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentActive
        })
      });

      if (response.ok) {
        console.log('✅ Flujo avanzado actualizado correctamente');
        // Actualizar el estado local
        setAdvancedFlows(prev => prev.map(flow => 
          flow.id === flowId 
            ? { ...flow, active: !currentActive }
            : flow
        ));
        return true;
      } else {
        console.error('❌ Error actualizando flujo avanzado:', response.status);
      }
    } catch (error) {
      console.error('❌ Error toggling flujo avanzado:', error);
    }
    return false;
  };

  const deleteAdvancedFlow = async (flowId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este flujo avanzado?')) {
      return false;
    }

    try {
      console.log('🗑️ Eliminando flujo avanzado:', flowId);
      
      const response = await fetch(`http://localhost:3001/api/whatsapp/flows/${flowId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('✅ Flujo avanzado eliminado correctamente');
        // Actualizar el estado local
        setAdvancedFlows(prev => prev.filter(flow => flow.id !== flowId));
        return true;
      } else {
        console.error('❌ Error eliminando flujo avanzado:', response.status);
      }
    } catch (error) {
      console.error('❌ Error eliminando flujo avanzado:', error);
    }
    return false;
  };

  // Función para guardar flujo avanzado (con IA)
  const saveAdvancedFlow = async (flow: any) => {
    try {
      console.log('💾 Guardando flujo avanzado:', flow);
      
      // NUEVO: Procesar documentos/imágenes del flujo automáticamente
      if (flow.flowDocuments && flow.flowDocuments.length > 0) {
        console.log('📄 Procesando', flow.flowDocuments.length, 'documentos del flujo con IA...');
        
        for (const file of flow.flowDocuments) {
          console.log('🔄 Procesando archivo:', file.name);
          
          if (file.type.startsWith('image/')) {
            // Procesar imagen con IA
            const extractedText = await processImageWithAI(file, flow.id || 'temp_' + Date.now());
            console.log('✅ Texto extraído de imagen:', extractedText.substring(0, 200) + '...');
          } else if (file.type === 'application/pdf' || file.type.includes('word') || file.type === 'text/plain') {
            // Procesar documento de texto
            const text = await extractTextFromFile(file);
            
            // Almacenar en memoria del flujo
            storeFlowContextMemory(flow.id || 'temp_' + Date.now(), {
              type: 'document',
              filename: file.name,
              content: text,
              timestamp: new Date().toISOString()
            });
            
            console.log('✅ Documento procesado y almacenado:', file.name);
          }
        }
      }
      
      const isEditing = flow.id;
      const url = isEditing 
        ? `http://localhost:3001/api/whatsapp/flows/${flow.id}`
        : 'http://localhost:3001/api/whatsapp/flows';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const payload = {
        name: flow.name,
        description: flow.description,
        trigger_keywords: flow.triggerType === 'keyword' ? [flow.triggerValue] : [],
        steps: [
          {
            type: 'ai_response',
            content: 'Respuesta generada por IA usando contexto prioritario de documentos',
            delay: 0
          }
        ],
        ai_config: {
          agent_id: flow.aiAgentId,
          trigger_type: flow.triggerType,
          trigger_value: flow.triggerValue,
          has_context_documents: flow.flowDocuments && flow.flowDocuments.length > 0 // Nueva propiedad
        },
        is_active: flow.active
      };
      
      console.log('📦 Payload para flujo avanzado:', payload);
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('✅ Flujo avanzado guardado correctamente');
        // Recargar flujos
        loadBasicFlows();
        return true;
      } else {
        const errorData = await response.text();
        console.error('❌ Error guardando flujo avanzado:', errorData);
        alert(`Error ${isEditing ? 'actualizando' : 'creando'} flujo avanzado: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error guardando flujo avanzado:', error);
      alert(`Error de conexión: ${error.message}`);
    }
    return false;
  };

  // Función para subir documento desde diálogo de edición
  const uploadDocumentFromDialog = async (file: File) => {
    try {
      console.log('📁 Subiendo documento desde diálogo:', file.name);
      
      // Primero extraer el texto del archivo
      const extractedText = await extractTextFromFile(file);
      console.log('📄 Texto extraído:', extractedText.substring(0, 200) + '...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('description', `Documento cargado desde edición de agente: ${file.name}`);
      formData.append('type', file.name.split('.').pop() || 'unknown');
      formData.append('extractedText', extractedText); // Agregar texto extraído

      // Intentar subir al servidor
      try {
        const response = await fetch('http://localhost:3001/api/whatsapp/documents/upload', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Documento subido al servidor:', data);
          return true;
        } else {
          console.warn('⚠️ Error subiendo al servidor, guardando localmente');
        }
      } catch (serverError) {
        console.warn('⚠️ Servidor no disponible, guardando localmente:', serverError);
      }

      // Si el servidor no está disponible, agregar localmente con texto extraído
      const localDocument = {
        id: Date.now().toString(),
        name: file.name,
        description: `Documento cargado localmente: ${file.name}`,
        type: file.name.split('.').pop() || 'unknown',
        content: extractedText, // Usar texto extraído en lugar del contenido binario
        size: file.size,
        created_at: new Date().toISOString()
      };

      const currentDocs = aiDocuments || [];
      setAiDocuments([...currentDocs, localDocument]);
      console.log('✅ Documento guardado localmente con texto extraído:', localDocument);
      return true;

    } catch (error) {
      console.error('❌ Error subiendo documento:', error);
      alert(`Error cargando documento: ${error.message}`);
      return false;
    }
  };

  // Funciones para gestión de documentos de contexto IA
  const loadAIDocuments = async () => {
    try {
      console.log('📁 Cargando documentos IA...');
      
      // Primero cargar documentos del localStorage
      const localDocs = localStorage.getItem('aiDocuments');
      if (localDocs) {
        const parsedDocs = JSON.parse(localDocs);
        setAiDocuments(parsedDocs);
        console.log('📁 Documentos cargados desde localStorage:', parsedDocs.length);
      }
      
      // Luego intentar cargar del servidor
      const response = await fetch('http://localhost:3001/api/whatsapp/documents', {
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        const serverDocs = data.documents || [];
        setAiDocuments(serverDocs);
        
        // Guardar en localStorage
        localStorage.setItem('aiDocuments', JSON.stringify(serverDocs));
        console.log('📁 Documentos cargados desde servidor:', serverDocs.length);
      } else {
        console.warn('Error cargando documentos del servidor, usando datos locales');
        // Mantener documentos locales si existen
      }
    } catch (error) {
      console.warn('Servidor no disponible, trabajando en modo local:', error);
      // En modo local, mantener los documentos que ya están en el estado
      // Los documentos locales se mantienen en aiDocuments
    }
  };

  // Función para cargar documentos al servidor y persistir localmente si es necesario
  const uploadDocument = async () => {
    if (!documentForm.file || !documentForm.name.trim()) {
      alert('Por favor selecciona un archivo y proporciona un nombre');
      return;
    }

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('file', documentForm.file);
      formData.append('name', documentForm.name);
      formData.append('description', documentForm.description);
      formData.append('type', documentForm.type);

      // Intentar subir al servidor
      try {
        const response = await fetch('http://localhost:3001/api/whatsapp/documents/upload', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(10000) // 10 segundos timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Documento subido:', data);
          
          // Resetear formulario
          setDocumentForm({
            name: '',
            description: '',
            type: 'pdf',
            file: null
          });
          
          setShowDocumentDialog(false);
          loadAIDocuments(); // Recargar lista
          
          alert('Documento subido y procesado exitosamente');
          return;
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }
      } catch (serverError) {
        console.warn('Error con servidor, usando modo local:', serverError);
        
        // Modo local - simular procesamiento
        const localDocument = {
          id: Date.now().toString(),
          name: documentForm.name,
          description: documentForm.description,
          type: documentForm.type,
          file: documentForm.file,
          size: documentForm.file.size,
          uploadedAt: new Date(),
          content: await processDocumentLocally(documentForm.file),
          processed: true
        };

        // Guardar localmente
        const currentDocs = aiDocuments || [];
        const updatedDocs = [...currentDocs, localDocument];
        setAiDocuments(updatedDocs);
        
        // Persistir en localStorage
        localStorage.setItem('aiDocuments', JSON.stringify(updatedDocs));
        console.log('📁 Documento guardado localmente y persistido:', localDocument.name);
        
        // Resetear formulario
        setDocumentForm({
          name: '',
          description: '',
          type: 'pdf',
          file: null
        });
        
        setShowDocumentDialog(false);
        
        alert('Documento procesado localmente (servidor no disponible)');
      }

    } catch (error) {
      console.error('Error general subiendo documento:', error);
      alert(`Error al subir el documento: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploadingDocument(false);
    }
  };

  // Función para procesar documentos localmente
  const processDocumentLocally = async (file: File): Promise<string> => {
    try {
      console.log('🔄 Procesando documento localmente:', file.name);
      
      // Usar la función de extracción mejorada
      const extractedText = await extractTextFromFile(file);
      
      if (extractedText && extractedText.length > 50) {
        console.log('✅ Contenido extraído exitosamente:', extractedText.length, 'caracteres');
        return extractedText;
      } else {
        // Fallback a descripción genérica
        console.log('⚠️ Usando descripción genérica para:', file.name);
        
        if (file.type.includes('pdf')) {
          return `DOCUMENTO PDF: ${file.name}
          
Este documento PDF contiene información importante. Para mejores resultados:
1. Convierte el PDF a archivo de texto (.txt) 
2. O copia y pega el contenido manualmente

Tipo: ${file.type}
Tamaño: ${(file.size / 1024).toFixed(1)} KB`;
        } else if (file.type.includes('word') || file.type.includes('document')) {
          return `DOCUMENTO WORD: ${file.name}
          
Documento Word con información importante. Para mejores resultados, convierte a PDF o texto plano.`;
        } else if (file.type.includes('image')) {
          return `IMAGEN: ${file.name}
          
Imagen que puede contener texto o información visual relevante.`;
        } else {
          return `DOCUMENTO: ${file.name}
          
Documento procesado y disponible para contexto de IA.`;
        }
      }
    } catch (error) {
      console.error('❌ Error procesando documento localmente:', error);
      return `Error procesando "${file.name}", pero está disponible para referencia.`;
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/whatsapp/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadAIDocuments();
        alert('Documento eliminado exitosamente');
      } else {
        alert('Error al eliminar el documento');
      }
    } catch (error) {
      console.error('Error eliminando documento:', error);
      alert('Error al eliminar el documento');
    }
  };

  // Función para procesar medios (imágenes/audio) con IA
  const processMediaWithAI = async (file: File, type: 'image' | 'audio') => {
    setProcessingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      try {
        const response = await fetch('http://localhost:3001/api/whatsapp/analyze-media', {
          method: 'POST',
          body: formData,
          signal: AbortSignal.timeout(15000) // 15 segundos para análisis de medios
        });

        if (response.ok) {
          const data = await response.json();
          setMediaAnalysis(data);
          return data;
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Error HTTP: ${response.status}`);
        }
      } catch (serverError) {
        console.warn('Servidor no disponible, usando análisis local:', serverError);
        
        // Análisis local simulado
        const localAnalysis = await analyzeMediaLocally(file, type);
        setMediaAnalysis(localAnalysis);
        return localAnalysis;
      }

    } catch (error) {
      console.error(`Error procesando ${type}:`, error);
      alert(`Error al procesar ${type}: ${error.message || 'Error desconocido'}`);
      return null;
    } finally {
      setProcessingMedia(false);
    }
  };

  // Función para análisis local de medios
  const analyzeMediaLocally = async (file: File, type: 'image' | 'audio') => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (type === 'image') {
          resolve({
            type: 'image',
            detectedText: `Texto detectado en ${file.name} (análisis local simulado)`,
            objects: ['producto', 'texto', 'imagen'],
            suggestedQuestions: [
              '¿Cuál es el precio de este producto?',
              '¿Qué características tiene?',
              '¿Está disponible en stock?',
              '¿Hay otros colores disponibles?'
            ],
            confidence: 0.75,
            source: 'local-analysis'
          });
        } else if (type === 'audio') {
          resolve({
            type: 'audio',
            transcript: `Transcripción local simulada de ${file.name}: "Consulta sobre productos disponibles"`,
            language: 'es',
            duration: Math.round(file.size / 1000), // Estimación básica
            confidence: 0.70,
            source: 'local-analysis'
          });
        }
      }, 2000); // Simular tiempo de procesamiento
    });
  };

  // Función mejorada para generar respuesta con contexto de documentos
  const generateAIResponseWithContext = async (message: string, agentId: string, contextDocuments: string[] = []) => {
    try {
      console.log('🔍 Buscando agente con ID:', agentId);
      
      // MEJORA: Buscar el agente de manera más robusta
      let agent = null;
      
      // 1. Intentar buscar en el state primero
      agent = aiAgents.find(a => a.id === agentId);
      console.log('🎯 Agente encontrado en state:', !!agent);
      
      // 2. Si no se encuentra en state, buscar en localStorage
      if (!agent) {
        try {
          const savedAgents = localStorage.getItem('aiAgents');
          if (savedAgents) {
            const localAgents = JSON.parse(savedAgents);
            agent = localAgents.find(a => a.id === agentId);
            console.log('💾 Agente encontrado en localStorage:', !!agent);
            console.log('📋 Agentes disponibles en localStorage:', localAgents.length);
          }
        } catch (error) {
          console.warn('⚠️ Error leyendo localStorage para buscar agente:', error);
        }
      }
      
      // 3. Si aún no se encuentra, buscar por nombre como fallback
      if (!agent) {
        console.log('🔄 Buscando agente por nombre como fallback...');
        const savedAgents = localStorage.getItem('aiAgents');
        if (savedAgents) {
          const localAgents = JSON.parse(savedAgents);
          // Intentar encontrar cualquier agente activo como fallback
          agent = localAgents.find(a => a.active && a.working && a.apiKey);
          if (agent) {
            console.log('🎯 Usando agente fallback:', agent.name, 'ID:', agent.id);
          }
        }
      }
      
      if (!agent) {
        console.error('❌ Agente no encontrado en ningún lugar. ID buscado:', agentId);
        console.log('📊 State aiAgents:', aiAgents.length);
        
        // Debug: mostrar todos los agentes disponibles
        try {
          const savedAgents = localStorage.getItem('aiAgents');
          if (savedAgents) {
            const localAgents = JSON.parse(savedAgents);
            console.log('📋 Agentes en localStorage:');
            localAgents.forEach((a, i) => {
              console.log(`  ${i+1}. "${a.name}" (ID: ${a.id})`);
            });
          }
        } catch (e) {
          console.log('📝 Error mostrando agentes de localStorage');
        }
        
        return 'Error: Agente no encontrado';
      }

      console.log('✅ Agente encontrado:', agent.name, '- Proveedor:', agent.provider);

      if (!agent.apiKey) {
        console.error('❌ Agente sin API Key configurada');
        return 'Error: Agente sin API Key configurada';
      }

      // Preparar contexto de documentos
      let documentContext = '';
      if (contextDocuments.length > 0 && agent.capabilities?.contextSearch) {
        const relevantDocs = aiDocuments.filter(doc => contextDocuments.includes(doc.id));
        if (relevantDocs.length > 0) {
          documentContext = '\n\nCONTEXTO DE DOCUMENTOS:\n';
          relevantDocs.forEach(doc => {
            documentContext += `- ${doc.name}: ${doc.content || doc.description}\n`;
          });
          documentContext += '\nUsa esta información para responder si es relevante.\n';
        }
      }

      const fullMessage = message + documentContext;

      // Usar la API directamente según el proveedor
      let response;
      
      if (agent.provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: agent.model,
            messages: [
              {
                role: 'system',
                content: agent.systemPrompt
              },
              {
                role: 'user',
                content: fullMessage
              }
            ],
            max_tokens: agent.maxTokens,
            temperature: agent.temperature
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || 'Sin respuesta';
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error OpenAI:', errorData);
          return `Error OpenAI: ${errorData.error?.message || 'Error desconocido'}`;
        }
      } else if (agent.provider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: agent.model,
            max_tokens: agent.maxTokens,
            messages: [
              {
                role: 'user',
                content: `${agent.systemPrompt}\n\n${fullMessage}`
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return data.content?.[0]?.text || 'Sin respuesta';
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error Anthropic:', errorData);
          return `Error Anthropic: ${errorData.error?.message || 'Error desconocido'}`;
        }
      } else {
        // Fallback al backend si no es un proveedor conocido
        const backendResponse = await fetch('http://localhost:3001/api/whatsapp/ai-response', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: fullMessage,
            agentId,
            contextDocuments,
            includeImageAnalysis: true,
            includeAudioTranscript: true
          })
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          return data.response;
        } else {
          console.error('Error backend:', await backendResponse.text());
          return 'Error: No se pudo generar respuesta';
        }
      }
    } catch (error) {
      console.error('Error en generateAIResponseWithContext:', error);
      return `Error de conexión: ${error.message || 'Error desconocido'}`;
    }
  };

  // Función NUEVA para generar respuesta directamente con objeto agente (más confiable)
  const generateAIResponseWithAgentObject = async (message: string, agent: any, contextDocuments: string[] = [], phoneNumber: string = '', imageFile?: File) => {
    try {
      console.log('');
      console.log('🚀🚀🚀 === INICIANDO GENERACIÓN DE RESPUESTA IA === 🚀🚀🚀');
      console.log('📝 Mensaje usuario:', message);
      console.log('🤖 Agente:', agent.name);
      console.log('🔑 API Key presente:', !!agent.apiKey);
      console.log('⚙️ Proveedor:', agent.provider);
      console.log('📱 Número de teléfono:', phoneNumber);
      console.log('📋 contextDocuments recibidos:', contextDocuments);
      console.log('📊 aiDocuments total disponibles:', aiDocuments.length);
      console.log('🎯 agent.selectedDocuments:', agent.selectedDocuments);
      console.log('🚀🚀🚀 === DATOS INICIALES === 🚀🚀🚀');
      console.log('');
      console.log('🖼️ Imagen incluida:', !!imageFile);
      console.log('🎯 Agente completo:', JSON.stringify(agent, null, 2));
      console.log('📋 contextDocuments recibidos:', contextDocuments);
      
      if (!agent.apiKey) {
        console.error('❌ Agente sin API Key configurada');
        return 'Error: Agente sin API Key configurada';
      }

      // Obtener contexto de conversación previo
      const conversationContext = getConversationContext(phoneNumber);
      console.log('🧠 Contexto de conversación encontrado:', conversationContext.length, 'caracteres');

      // IMPORTANTE: Obtener contexto prioritario de memoria de flujos
      let flowContext = '';
      
      // Buscar si hay algún flujo activo para este teléfono o mensaje
      const activeFlows = [...advancedFlows, ...basicFlows].filter(flow => flow.active);
      
      for (const flow of activeFlows) {
        const flowMemory = getFlowContextMemory(flow.id);
        if (flowMemory) {
          flowContext += `\n--- CONTEXTO PRIORITARIO DEL FLUJO "${flow.name.toUpperCase()}" ---\n`;
          flowContext += flowMemory;
          flowContext += '\n--- FIN CONTEXTO FLUJO ---\n';
          console.log(`🧠💾 Agregando contexto prioritario de flujo "${flow.name}":`, flowMemory.length, 'caracteres');
        }
      }
      
      if (flowContext) {
        console.log('🔥 CONTEXTO PRIORITARIO DE FLUJOS ENCONTRADO:', flowContext.length, 'caracteres');
      }

      // NUEVO: Procesar imagen si se envió una
      let imageAnalysis = '';
      if (imageFile && agent.capabilities?.processImages) {
        console.log('📸 Procesando imagen del usuario con IA...');
        console.log('📸 DEBUG: imageFile existe:', !!imageFile);
        console.log('📸 DEBUG: agent.capabilities.processImages:', agent.capabilities?.processImages);
        console.log('📸 DEBUG: Tamaño del archivo:', imageFile.size, 'bytes');
        console.log('📸 DEBUG: Tipo de archivo:', imageFile.type);
        
        try {
          // Obtener contexto de documentos para usar como referencia
          let referenceContext = flowContext;
          
          // Si no hay contexto de flujos, usar documentos seleccionados del agente
          if (!referenceContext && agent.selectedDocuments) {
            const relevantDocs = aiDocuments.filter(doc => 
              agent.selectedDocuments.includes(doc.id) || 
              agent.selectedDocuments.includes(doc.name)
            );
            
            if (relevantDocs.length > 0) {
              referenceContext = '\n--- INFORMACIÓN DE REFERENCIA ---\n';
              relevantDocs.forEach(doc => {
                referenceContext += `\n${doc.name.toUpperCase()}:\n${doc.content}\n`;
              });
              referenceContext += '\n--- FIN INFORMACIÓN DE REFERENCIA ---\n';
            }
          }
          
          // IMPORTANTE: Si no hay contexto de documentos, usar el systemPrompt del agente
          if (!referenceContext && agent.systemPrompt) {
            console.log('📝 Usando systemPrompt del agente como contexto de referencia');
            referenceContext = '\n--- INFORMACIÓN DEL SISTEMA ---\n' + agent.systemPrompt + '\n--- FIN INFORMACIÓN DEL SISTEMA ---\n';
          }
          
          // Procesar imagen con contexto de referencia
          imageAnalysis = await processImageWithContextualAnalysis(imageFile, referenceContext, agent);
          console.log('✅ Análisis de imagen completado:', imageAnalysis.substring(0, 200) + '...');
          
        } catch (error) {
          console.error('❌ Error procesando imagen:', error);
          imageAnalysis = 'Error al procesar la imagen enviada.';
        }
      } else {
        console.log('❌ NO SE PROCESARÁ IMAGEN:');
        console.log('❌ imageFile existe:', !!imageFile);
        console.log('❌ agent.capabilities existe:', !!agent.capabilities);
        console.log('❌ agent.capabilities.processImages:', agent.capabilities?.processImages);
      }
      
      console.log('📸 RESULTADO ANÁLISIS IMAGEN:', imageAnalysis ? imageAnalysis.substring(0, 200) + '...' : 'Sin análisis');
      
      // Preparar contexto de documentos - MEJORADO
      let documentContext = '';
      
      console.log('📄 === DEBUG DOCUMENTOS ===');
      console.log('📄 contextDocuments recibidos:', contextDocuments);
      console.log('📄 agent.selectedDocuments:', agent.selectedDocuments);
      console.log('📄 aiDocuments disponibles:', aiDocuments.length);
      
      if (aiDocuments.length > 0) {
        console.log('📋 Lista completa de documentos disponibles:');
        aiDocuments.forEach((doc, i) => {
          console.log(`  ${i+1}. Nombre: "${doc.name}" | ID: ${doc.id} | Contenido: ${doc.content ? doc.content.substring(0, 100) + '...' : 'SIN CONTENIDO'}`);
        });
      } else {
        console.log('❌ NO HAY DOCUMENTOS DISPONIBLES EN aiDocuments');
      }
      
      console.log('📄 Agent completo para debug:', JSON.stringify(agent, null, 2));
      console.log('📄 === FIN DEBUG DOCUMENTOS ===');
      
      // NUEVA LÓGICA: Usar documentos si hay cualquier referencia a ellos
      const documentsToUse = [
        ...(contextDocuments || []),
        ...(agent.selectedDocuments || [])
      ];
      
      console.log('📄 Documentos a usar (combinados):', documentsToUse);
      
      if (documentsToUse.length > 0) {
        console.log('🔍 Buscando documentos relevantes...');
        
        // Búsqueda más flexible de documentos
        const relevantDocs = aiDocuments.filter(doc => {
          const matchById = documentsToUse.includes(doc.id);
          const matchByName = documentsToUse.includes(doc.name);
          const matchByPartialName = documentsToUse.some(docRef => 
            doc.name.toLowerCase().includes(docRef.toLowerCase()) ||
            docRef.toLowerCase().includes(doc.name.toLowerCase())
          );
          const matchByIdString = documentsToUse.some(docRef => doc.id.toString() === docRef.toString());
          
          const isMatch = matchById || matchByName || matchByPartialName || matchByIdString;
          
          console.log(`🔍 Documento "${doc.name}" (ID: ${doc.id}):`, {
            matchById, matchByName, matchByPartialName, matchByIdString, isMatch
          });
          
          return isMatch;
        });
        
        console.log('📋 Documentos relevantes encontrados:', relevantDocs.length);
        
        // Si no encuentra documentos por coincidencia exacta, usar TODOS los disponibles si el agente tiene selectedDocuments
        if (relevantDocs.length === 0 && agent.selectedDocuments && agent.selectedDocuments.length > 0) {
          console.log('⚠️ No se encontraron coincidencias exactas, usando todos los documentos disponibles como fallback');
          relevantDocs.push(...aiDocuments);
        }
        
        if (relevantDocs.length > 0) {
          documentContext = '\n\n🔥 INFORMACIÓN CRÍTICA - USAR COMO BASE PRINCIPAL:\n';
          relevantDocs.forEach(doc => {
            console.log(`📄 Agregando documento: ${doc.name}`);
            documentContext += `\n=== ${doc.name.toUpperCase()} ===\n`;
            documentContext += doc.content || doc.description || 'Documento sin contenido específico';
            documentContext += '\n=== FIN ${doc.name.toUpperCase()} ===\n';
          });
          documentContext += `\n🚨 INSTRUCCIONES CRÍTICAS:
- DEBES usar EXCLUSIVAMENTE la información de los documentos anteriores
- Si preguntan "Dame la 1" o similar, busca la pregunta/ejercicio número 1 en los documentos
- Si preguntan sobre un taller, usa el contenido del documento del taller
- NO inventes información que no esté en los documentos
- Si no encuentras la información específica, di "No encuentro esa información en los documentos cargados"
- Responde de forma directa y completa basándote SOLO en los documentos\n`;
          
          console.log('✅ Contexto de documentos preparado:', documentContext.length, 'caracteres');
        } else {
          console.log('⚠️ No se encontraron documentos relevantes para:', documentsToUse);
        }
      } else {
        console.log('📄 No hay documentos especificados para usar');
        
        // FALLBACK: Si el agente tiene selectedDocuments pero no hay contextDocuments, usar los documentos del agente
        if (agent.selectedDocuments && agent.selectedDocuments.length > 0 && aiDocuments.length > 0) {
          console.log('🔄 Fallback: Usando documentos asociados al agente...');
          const agentDocs = aiDocuments.filter(doc => 
            agent.selectedDocuments.includes(doc.id) || 
            agent.selectedDocuments.includes(doc.name) ||
            agent.selectedDocuments.some(selectedId => 
              doc.id.toString() === selectedId.toString() ||
              doc.name.toLowerCase().includes(selectedId.toLowerCase())
            )
          );
          
          if (agentDocs.length > 0) {
            documentContext = '\n\n🔥 INFORMACIÓN CRÍTICA - USAR COMO BASE PRINCIPAL:\n';
            agentDocs.forEach(doc => {
              console.log(`📄 Agregando documento del agente: ${doc.name}`);
              documentContext += `\n=== ${doc.name.toUpperCase()} ===\n`;
              documentContext += doc.content || doc.description || 'Documento sin contenido específico';
              documentContext += `\n=== FIN ${doc.name.toUpperCase()} ===\n`;
            });
            documentContext += `\n🚨 INSTRUCCIONES CRÍTICAS:
- DEBES usar EXCLUSIVAMENTE la información de los documentos anteriores
- Si preguntan "Dame la 1" o similar, busca la pregunta/ejercicio número 1 en los documentos
- Si preguntan sobre un taller, usa el contenido del documento del taller
- NO inventes información que no esté en los documentos
- Si no encuentras la información específica, di "No encuentro esa información en los documentos cargados"
- Responde de forma directa y completa basándote SOLO en los documentos\n`;
            
            console.log('✅ Contexto de documentos del agente preparado:', documentContext.length, 'caracteres');
          }
        }
      }

      // Construir mensaje completo con MÁXIMA PRIORIDAD para documentos del agente
      let fullMessage = '';
      
      // PRIORIDAD 1: Documentos del agente (información crítica)
      if (documentContext) {
        fullMessage += documentContext;
      }
      
      // PRIORIDAD 2: Contexto de flujos
      if (flowContext) {
        fullMessage += flowContext;
      }
      
      // PRIORIDAD 3: Análisis de imagen si está disponible  
      if (imageAnalysis) {
        fullMessage += '\n\n--- ANÁLISIS DE IMAGEN ENVIADA POR EL USUARIO ---\n';
        fullMessage += imageAnalysis;
        fullMessage += '\n--- FIN ANÁLISIS DE IMAGEN ---\n';
        console.log('📸 Análisis de imagen agregado al contexto:', imageAnalysis.length, 'caracteres');
      }
      
      // PRIORIDAD 4: Contexto de conversación
      if (conversationContext) {
        fullMessage += conversationContext;
      }
      
      // FINAL: Mensaje del usuario
      fullMessage += '\n\n🎯 PREGUNTA DEL USUARIO:\n' + (message || 'El usuario envió contenido multimedia');
      
      console.log('💬 Mensaje completo a enviar:', fullMessage.slice(0, 500) + '...');
      console.log('🔥 Incluye documentos:', !!documentContext, '| Flujos:', !!flowContext, '| Conversación:', !!conversationContext, '| Imagen:', !!imageAnalysis);

      // Construir mensajes para la IA con prompt mejorado para documentos
      const enhancedSystemPrompt = documentContext 
        ? `${agent.systemPrompt || 'Eres un asistente útil.'}\n\n🔥 INSTRUCCIONES CRÍTICAS PARA DOCUMENTOS:\n- Tienes acceso a documentos específicos que contienen información crítica\n- DEBES responder basándote EXCLUSIVAMENTE en esos documentos\n- Si preguntan por "la 1", "pregunta 1", "ejercicio 1", etc., busca esa información específica en los documentos\n- Si preguntan por un taller o examen, usa SOLO la información de esos documentos\n- NO uses conocimiento general, SOLO lo que está en los documentos proporcionados\n- Si no encuentras la información específica en los documentos, dilo claramente`
        : agent.systemPrompt || 'Eres un asistente útil.';

      let messages = [
        {
          role: 'system',
          content: enhancedSystemPrompt
        },
        {
          role: 'user',
          content: fullMessage
        }
      ];

      // Usar la API directamente según el proveedor
      let response;
      
      if (agent.provider === 'openai') {
        console.log('🤖 Usando OpenAI API...');
        const model = agent.model || 'gpt-3.5-turbo';
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: 500,
            temperature: 0.7
          })
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          response = data.choices[0]?.message?.content || 'Sin respuesta';
          console.log('✅ Respuesta OpenAI recibida:', response.slice(0, 100) + '...');
          
          // 💰 Tracking de costos
          const usage = data.usage;
          if (usage) {
            trackAIUsage(
              'openai',
              model,
              fullMessage,
              response,
              { input: usage.prompt_tokens, output: usage.completion_tokens },
              undefined,
              phoneNumber
            );
          } else {
            // Fallback con estimación
            trackAIUsage('openai', model, fullMessage, response, undefined, undefined, phoneNumber);
          }
        } else {
          const errorData = await openaiResponse.text();
          console.error('❌ Error OpenAI:', errorData);
          return `Error OpenAI: ${openaiResponse.status}`;
        }
      } else if (agent.provider === 'anthropic') {
        console.log('🤖 Usando Anthropic API...');
        
        // Para Anthropic, filtrar solo mensajes user/assistant (no system)
        const anthropicMessages = messages.filter(msg => msg.role !== 'system');
        const model = agent.model || 'claude-3-sonnet-20240229';
        
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 500,
            system: agent.systemPrompt || 'Eres un asistente útil.',
            messages: anthropicMessages
          })
        });

        if (anthropicResponse.ok) {
          const data = await anthropicResponse.json();
          response = data.content[0]?.text || 'Sin respuesta';
          console.log('✅ Respuesta Anthropic recibida:', response.slice(0, 100) + '...');
          
          // 💰 Tracking de costos
          const usage = data.usage;
          if (usage) {
            trackAIUsage(
              'anthropic',
              model,
              fullMessage,
              response,
              { input: usage.input_tokens, output: usage.output_tokens },
              undefined,
              phoneNumber
            );
          } else {
            // Fallback con estimación
            trackAIUsage('anthropic', model, fullMessage, response, undefined, undefined, phoneNumber);
          }
        } else {
          const errorData = await anthropicResponse.text();
          console.error('❌ Error Anthropic:', errorData);
          return `Error Anthropic: ${anthropicResponse.status}`;
        }
      } else {
        console.error('❌ Proveedor no soportado:', agent.provider);
        return 'Error: Proveedor no soportado';
      }

      // Guardar el mensaje del usuario y la respuesta de la IA en la memoria
      if (phoneNumber && response) {
        console.log('💾 Guardando en memoria de conversación...');
        addToConversationMemory(phoneNumber, 'user', message); // Mensaje del usuario
        addToConversationMemory(phoneNumber, 'assistant', response); // Respuesta de la IA
      }

      return response || 'Sin respuesta';
    } catch (error) {
      console.error('💥 Error en generateAIResponseWithAgentObject:', error);
      return `Error de conexión: ${error.message || 'Error desconocido'}`;
    }
  };

  // Función para procesar mensaje con agente inteligente
  const processMessageWithAIAgent = async (message: any, agentId: string) => {
    try {
      const agent = aiAgents.find(a => a.id === agentId);
      if (!agent) return null;

      let processedMessage = { ...message };
      let additionalContext = '';

      // Procesar imagen si el agente tiene esa capacidad habilitada
      if (message.type === 'image' && agent.capabilities?.processImages) {
        const imageAnalysis = await processMediaWithAI(message.file, 'image');
        if (imageAnalysis) {
          additionalContext += `\nAnálisis de imagen: ${JSON.stringify(imageAnalysis)}`;
          processedMessage.mediaAnalysis = imageAnalysis;
        }
      }

      // Transcribir audio si el agente tiene esa capacidad habilitada
      if (message.type === 'audio' && agent.capabilities?.transcribeAudio) {
        const audioAnalysis = await processMediaWithAI(message.file, 'audio');
        if (audioAnalysis) {
          additionalContext += `\nTranscripción de audio: ${audioAnalysis.transcript}`;
          processedMessage.mediaAnalysis = audioAnalysis;
        }
      }

      // Generar respuesta con contexto de documentos si está habilitado
      let finalMessage = message.text || message.caption || '';
      if (additionalContext) {
        finalMessage += additionalContext;
      }

      const response = await generateAIResponseWithContext(
        finalMessage,
        agentId,
        agent.selectedDocuments || []
      );

      return {
        response,
        processedMessage,
        usedCapabilities: {
          processedImages: message.type === 'image' && agent.capabilities?.processImages,
          transcribedAudio: message.type === 'audio' && agent.capabilities?.transcribeAudio,
          searchedDocuments: agent.capabilities?.contextSearch && agent.selectedDocuments?.length > 0,
          usedSmartResponse: agent.capabilities?.smartResponses
        }
      };

    } catch (error) {
      console.error('Error procesando mensaje con agente IA:', error);
      return null;
    }
  };

  // Función para obtener estadísticas de uso de IA
  const getAIUsageStats = () => {
    return {
      totalAgents: aiAgents.length,
      documentsLoaded: aiDocuments.length,
      agentsWithDocuments: aiAgents.filter(agent => agent.selectedDocuments?.length > 0).length,
      capabilitiesEnabled: aiAgents.reduce((acc, agent) => {
        if (agent.capabilities?.processImages) acc.imageProcessing++;
        if (agent.capabilities?.transcribeAudio) acc.audioTranscription++;
        if (agent.capabilities?.contextSearch) acc.documentSearch++;
        if (agent.capabilities?.smartResponses) acc.smartResponses++;
        return acc;
      }, {
        imageProcessing: 0,
        audioTranscription: 0,
        documentSearch: 0,
        smartResponses: 0
      })
    };
  };

  // Check service status and setup WebSocket
  useEffect(() => {
    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 5000);
    
    // Cargar flujos básicos, documentos y agentes IA al inicializar
    loadBasicFlows();
    loadAIDocuments();
    loadAIAgents();
    
    // Configurar WebSocket
    setupWebSocket();
    
    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Setup WebSocket connection
  const setupWebSocket = () => {
    socketRef.current = io('http://localhost:3001');
    
    socketRef.current.on('connect', () => {
      console.log('🔌 WebSocket conectado');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      setIsConnected(false);
    });

    // Escuchar nuevos mensajes
    socketRef.current.on('new_message', (data) => {
      console.log('📨 Nuevo mensaje recibido:', data);
      console.log('📊 Estado actual aiAgents:', aiAgents);
      console.log('📊 Agentes activos:', aiAgents.filter(a => a.active));
      console.log('📊 Agentes funcionando:', aiAgents.filter(a => a.working === true));
      
      // Siempre actualizar la lista de chats cuando llegue un mensaje
      if (data.instanceId === selectedInstance) {
        // Actualización más eficiente: solo actualizar el chat específico
        setChats(prevChats => {
          return prevChats.map(chat => {
            const phoneWithoutCountry = chat.phone_number.replace(/^\+\d+/, '');
            const dataPhoneWithoutCountry = data.fromNumber.replace(/^\+\d+/, '');
            
            if (phoneWithoutCountry === dataPhoneWithoutCountry || data.fromNumber === chat.phone_number) {
              return {
                ...chat,
                last_message: data.text,
                last_message_time: data.timestamp,
                unread_count: selectedChat?.phone_number === chat.phone_number ? 0 : (chat.unread_count || 0) + 1
              };
            }
            return chat;
          });
        });
      }
      
      // Solo agregar el mensaje si es del chat seleccionado
      if (selectedChat && data.instanceId === selectedInstance) {
        const phoneWithoutCountry = selectedChat.phone_number.replace(/^\+\d+/, '');
        const dataPhoneWithoutCountry = data.fromNumber.replace(/^\+\d+/, '');
        
        if (phoneWithoutCountry === dataPhoneWithoutCountry || data.fromNumber === selectedChat.phone_number) {
          const newMessage = {
            id: data.messageId,
            instance_id: data.instanceId,
            chat_id: `${data.fromNumber}@s.whatsapp.net`,
            from_number: data.fromNumber,
            to_number: 'self',
            message_text: data.text,
            message_type: 'text',
            timestamp: data.timestamp,
            is_from_me: data.isFromMe,
            status: 'received'
          };
          
          setMessages(prevMessages => {
            // Evitar duplicados
            if (prevMessages.some(msg => msg.id === newMessage.id)) {
              return prevMessages;
            }
            return [...prevMessages, newMessage];
          });
        }
      }
      
      // Respuesta automática con agentes IA activos
      console.log('🤖 Verificando si debe responder automáticamente...');
      console.log('🤖 Es de mí?', data.isFromMe);
      console.log('🤖 Tiene texto?', !!data.text);
      console.log('🤖 Tiene imagen?', !!data.mediaUrl || !!data.media);
      
      if (!data.isFromMe && (data.text || data.mediaUrl || data.media)) {
        console.log('✅ Condiciones cumplidas, llamando a handleAutoResponse');
        handleAutoResponse(data);
      } else {
        console.log('❌ No cumple condiciones para respuesta automática');
      }
    });

    // Escuchar mensajes enviados
    socketRef.current.on('message_sent', (data) => {
      console.log('📤 Mensaje enviado:', data);
      
      // Actualizar la lista de chats cuando se envíe un mensaje
      if (data.instanceId === selectedInstance) {
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.phone_number === data.toNumber) {
              return {
                ...chat,
                last_message: data.text,
                last_message_time: data.timestamp || new Date().toISOString()
              };
            }
            return chat;
          });
        });
      }
      
      if (selectedChat && data.instanceId === selectedInstance) {
        const newMessage = {
          id: data.messageId,
          instance_id: data.instanceId,
          chat_id: `${selectedChat.phone_number}@s.whatsapp.net`,
          from_number: 'self',
          to_number: selectedChat.phone_number,
          message_text: data.text,
          message_type: 'text',
          timestamp: data.timestamp || new Date().toISOString(),
          is_from_me: true,
          status: 'sent'
        };
        
        setMessages(prevMessages => {
          // Evitar duplicados
          if (prevMessages.some(msg => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      }
    });

    // Escuchar mensajes de Facebook
    socketRef.current.on('facebook_message', (data) => {
      console.log('📨 Mensaje de Facebook:', data);
      
      // Actualizar chats de Facebook
      if (data.instanceId === selectedFacebookInstance) {
        setFacebookChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.chat_id === data.fromId) {
              return {
                ...chat,
                last_message: data.text,
                last_message_time: data.timestamp,
                unread_count: selectedFacebookChat?.chat_id === chat.chat_id ? 0 : (chat.unread_count || 0) + 1
              };
            }
            return chat;
          });
        });
      }
      
      // Agregar mensaje al chat seleccionado
      if (selectedFacebookChat && data.instanceId === selectedFacebookInstance && data.fromId === selectedFacebookChat.chat_id) {
        const newMessage: FacebookMessage = {
          id: data.messageId,
          chat_id: data.fromId,
          message_text: data.text,
          timestamp: data.timestamp,
          is_from_me: false,
          sender_name: data.senderName || 'Unknown'
        };
        
        setFacebookMessages(prevMessages => {
          if (prevMessages.some(msg => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      }
    });

    // Escuchar mensajes enviados de Facebook
    socketRef.current.on('facebook_message_sent', (data) => {
      console.log('📤 Mensaje de Facebook enviado:', data);
      
      if (selectedFacebookChat && data.instanceId === selectedFacebookInstance && data.chatId === selectedFacebookChat.chat_id) {
        const newMessage: FacebookMessage = {
          id: data.messageId,
          chat_id: data.chatId,
          message_text: data.text,
          timestamp: data.timestamp || new Date().toISOString(),
          is_from_me: true
        };
        
        setFacebookMessages(prevMessages => {
          if (prevMessages.some(msg => msg.id === newMessage.id)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      }
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    facebookMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [facebookMessages]);

  useEffect(() => {
    if (serviceStatus === 'online') {
      loadInstances();
      loadFacebookInstances();
    }
  }, [serviceStatus]);

  useEffect(() => {
    if (selectedInstance) {
      loadChats(selectedInstance);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedFacebookInstance) {
      loadFacebookChats(selectedFacebookInstance);
    }
  }, [selectedFacebookInstance]);

  useEffect(() => {
    if (selectedChat && selectedInstance) {
      loadMessages(selectedInstance, selectedChat.phone_number);
    }
  }, [selectedChat, selectedInstance]);

  useEffect(() => {
    if (selectedFacebookChat && selectedFacebookInstance) {
      loadFacebookMessages(selectedFacebookInstance, selectedFacebookChat.chat_id);
    }
  }, [selectedFacebookChat, selectedFacebookInstance]);

  // Recargar documentos cuando se cierre el diálogo de documentos (para actualizar la lista en el agente)
  useEffect(() => {
    if (!showDocumentDialog) {
      loadAIDocuments();
    }
  }, [showDocumentDialog]);

  // Funciones para manejar el formulario de agente IA
  const loadAIAgents = () => {
    try {
      const savedAgents = localStorage.getItem('aiAgents');
      if (savedAgents) {
        setAiAgents(JSON.parse(savedAgents));
      }
    } catch (error) {
      console.error('Error al cargar agentes IA:', error);
    }
  };

  const resetAIAgentForm = () => {
    setAiAgentForm({
      name: '',
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      systemPrompt: 'Eres un asistente de atención al cliente profesional y amigable.',
      temperature: 0.7,
      maxTokens: 300,
      selectedDocuments: [],
      capabilities: {
        processImages: true,
        transcribeAudio: true,
        contextSearch: true,
        smartResponses: true
      }
    });
  };

  const closeAIAgentDialog = () => {
    resetAIAgentForm();
    setShowAIAgentDialog(false);
  };

  // Funciones para tracking de costos de IA
  const loadAIUsageRecords = () => {
    try {
      const savedRecords = localStorage.getItem('aiUsageRecords');
      if (savedRecords) {
        const records = JSON.parse(savedRecords);
        setAiUsageRecords(records);
        calculateUsageStats(records);
      }
    } catch (error) {
      console.error('Error al cargar registros de uso de IA:', error);
    }
  };

  const saveAIUsageRecord = (record: AIUsageRecord) => {
    try {
      const updatedRecords = [...aiUsageRecords, record];
      setAiUsageRecords(updatedRecords);
      localStorage.setItem('aiUsageRecords', JSON.stringify(updatedRecords));
      calculateUsageStats(updatedRecords);
      
      console.log('💰 Costo registrado:', {
        provider: record.provider,
        model: record.model,
        tokens: record.tokensUsed,
        cost: `$${record.cost.toFixed(4)}`
      });
    } catch (error) {
      console.error('Error al guardar registro de uso de IA:', error);
    }
  };

  const calculateUsageStats = (records: AIUsageRecord[]) => {
    const stats: AIUsageStats = {
      totalCost: 0,
      totalTokens: 0,
      totalRequests: records.length,
      costByProvider: { openai: 0, anthropic: 0 },
      requestsByProvider: { openai: 0, anthropic: 0 },
      dailyCosts: {},
      monthlyCosts: {}
    };

    records.forEach(record => {
      stats.totalCost += record.cost;
      stats.totalTokens += record.tokensUsed;
      stats.costByProvider[record.provider] += record.cost;
      stats.requestsByProvider[record.provider]++;

      // Costos diarios
      const date = new Date(record.timestamp).toDateString();
      stats.dailyCosts[date] = (stats.dailyCosts[date] || 0) + record.cost;

      // Costos mensuales
      const month = new Date(record.timestamp).toISOString().substring(0, 7); // YYYY-MM
      stats.monthlyCosts[month] = (stats.monthlyCosts[month] || 0) + record.cost;
    });

    setAiUsageStats(stats);
  };

  const estimateTokens = (text: string): number => {
    // Estimación aproximada: 1 token ≈ 4 caracteres para inglés, 3 caracteres para español
    return Math.ceil(text.length / 3.5);
  };

  const calculateCost = (
    provider: 'openai' | 'anthropic', 
    model: string, 
    inputTokens: number, 
    outputTokens: number
  ): number => {
    const pricing = AI_PRICING[provider]?.[model];
    if (!pricing) return 0;

    return (inputTokens * pricing.input) + (outputTokens * pricing.output);
  };

  const trackAIUsage = (
    provider: 'openai' | 'anthropic',
    model: string,
    inputText: string,
    outputText: string,
    actualTokens?: { input: number; output: number },
    chat_id?: string,
    phone_number?: string
  ) => {
    const inputTokens = actualTokens?.input || estimateTokens(inputText);
    const outputTokens = actualTokens?.output || estimateTokens(outputText);
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateCost(provider, model, inputTokens, outputTokens);

    const record: AIUsageRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      provider,
      model,
      tokensUsed: totalTokens,
      cost,
      messageLength: inputText.length,
      responseLength: outputText.length,
      chat_id,
      phone_number
    };

    saveAIUsageRecord(record);
  };

  const resetCostTracking = () => {
    setAiUsageRecords([]);
    setAiUsageStats({
      totalCost: 0,
      totalTokens: 0,
      totalRequests: 0,
      costByProvider: { openai: 0, anthropic: 0 },
      requestsByProvider: { openai: 0, anthropic: 0 },
      dailyCosts: {},
      monthlyCosts: {}
    });
    localStorage.removeItem('aiUsageRecords');
    console.log('🧹 Estadísticas de costos limpiadas');
  };

  // Cargar registros al inicializar
  useEffect(() => {
    loadAIUsageRecords();
  }, []);

  // 🔧 FUNCIÓN DE DEBUG GLOBAL - Se puede ejecutar desde consola del navegador
  useEffect(() => {
    // Hacer funciones disponibles globalmente para debug
    (window as any).debugWhatsApp = {
      testDocuments: () => {
        console.log('🔧 === DIAGNÓSTICO COMPLETO DE DOCUMENTOS ===');
        console.log('📊 Total aiDocuments:', aiDocuments.length);
        console.log('📋 Lista completa de aiDocuments:');
        aiDocuments.forEach((doc, i) => {
          console.log(`  ${i+1}. "${doc.name}" (ID: ${doc.id})`);
          console.log(`     Contenido: ${doc.content ? doc.content.length + ' caracteres' : 'SIN CONTENIDO'}`);
          if (doc.content) {
            console.log(`     Preview: "${doc.content.substring(0, 200)}..."`);
          }
        });
        
        console.log('🤖 Agentes disponibles:', aiAgents.length);
        aiAgents.forEach((agent, i) => {
          console.log(`  ${i+1}. "${agent.name}" - Documentos: ${agent.selectedDocuments?.length || 0}`);
          console.log(`     selectedDocuments:`, agent.selectedDocuments);
        });
        
        const localStorage_docs = localStorage.getItem('aiDocuments');
        if (localStorage_docs) {
          const parsed = JSON.parse(localStorage_docs);
          console.log('💾 Documentos en localStorage:', parsed.length);
        } else {
          console.log('💾 No hay documentos en localStorage');
        }
        
        console.log('🔧 === FIN DIAGNÓSTICO ===');
      },
      
      testAgentResponse: async (message = "Dame la 1 del taller") => {
        const agent = aiAgents.find(a => a.name === 'prueba img');
        if (!agent) {
          console.log('❌ No se encontró agente "prueba img"');
          return;
        }
        
        console.log('🧪 Probando respuesta del agente...');
        const response = await generateAIResponseWithAgentObject(
          message,
          agent,
          agent.selectedDocuments || [],
          'debug-test'
        );
        console.log('📝 Respuesta:', response);
        return response;
      },
      
      testImageProcessing: async (base64Image: string) => {
        console.log('🧪 === TESTING IMAGE PROCESSING ===');
        
        if (!base64Image) {
          console.log('❌ Por favor proporciona una imagen en base64');
          return;
        }
        
        try {
          // Simular creación de archivo
          const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const file = new File([byteArray], 'test-image.jpg', { type: 'image/jpeg' });
          
          console.log('📸 Archivo creado:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          
          // Obtener agente activo
          const activeAgent = aiAgents.find((a: any) => a.active) || aiAgents[0];
          
          if (!activeAgent) {
            console.log('❌ No hay agente activo');
            return;
          }
          
          console.log('🤖 Usando agente:', activeAgent.name);
          
          // Procesar imagen
          const result = await processImageWithContextualAnalysis(file, 'Información de referencia de prueba', activeAgent);
          console.log('✅ Resultado:', result);
          
          return result;
          
        } catch (error) {
          console.error('❌ Error:', error);
          return null;
        }
      },
      
      testMessageStructure: (messageData: any) => {
        console.log('🔍 === TESTING MESSAGE STRUCTURE ===');
        console.log('📨 messageData completo:', JSON.stringify(messageData, null, 2));
        
        const imagePaths = [
          'mediaUrl',
          'media.url',
          'media.link', 
          'attachments[0].url',
          'file.url',
          '_data.media.url',
          'type',
          'data'
        ];
        
        console.log('🔍 Buscando imagen en:');
        imagePaths.forEach(path => {
          const value = getNestedProperty(messageData, path);
          console.log(`  ${path}:`, value || 'null/undefined');
        });
        
        return messageData;
      },
      
      getCurrentAgents: () => {
        console.log('🤖 Agentes disponibles:');
        aiAgents.forEach((agent: any, index: number) => {
          console.log(`  ${index + 1}. ${agent.name}:`, {
            provider: agent.provider,
            active: agent.active,
            processImages: agent.capabilities?.processImages
          });
        });
        return aiAgents;
      }
    };
    
    // Función auxiliar para acceder a propiedades anidadas
    const getNestedProperty = (obj: any, path: string): any => {
      return path.split('.').reduce((current, key) => {
        if (key.includes('[') && key.includes(']')) {
          const arrayKey = key.substring(0, key.indexOf('['));
          const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
          return current?.[arrayKey]?.[index];
        }
        return current?.[key];
      }, obj);
    };

    console.log('🚀 Funciones de debug disponibles en: window.debugWhatsApp');
    console.log('  - debugWhatsApp.testDocuments()');
    console.log('  - debugWhatsApp.testAgentResponse(message)');
    console.log('  - debugWhatsApp.testImageProcessing(base64String)');
    console.log('  - debugWhatsApp.testMessageStructure(messageData)');  
    console.log('  - debugWhatsApp.getCurrentAgents()');
  }, []); // Remove dependencies to prevent hook order changes

  // ===== FUNCIONES PARA PROCESAMIENTO INTELIGENTE DE DOCUMENTOS/IMÁGENES =====
  
  // Función para extraer texto de documentos (PDFs, Word, TXT)
  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          let text = '';
          
          if (file.type === 'text/plain') {
            // Archivo de texto plano
            text = e.target?.result as string;
          } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            // Para PDFs, intentar extraer texto legible
            const content = e.target?.result as string;
            
            console.log('🔍 Procesando PDF, buscando texto legible...');
            
            // Buscar patrones de texto en PDF
            const textPatterns = [
              /\(([^)]+)\)/g,  // Texto entre paréntesis
              /\[([^\]]+)\]/g, // Texto entre corchetes  
              /BT\s+([^ET]+)\s+ET/g, // Texto entre BT y ET
              /Tj\s*([^T]+)/g, // Comandos Tj
              /TJ\s*\[([^\]]+)\]/g // Comandos TJ
            ];
            
            let extractedText = '';
            
            // Intentar extraer texto usando diferentes patrones
            textPatterns.forEach(pattern => {
              const matches = content.match(pattern);
              if (matches) {
                matches.forEach(match => {
                  let cleanText = match
                    .replace(/[()[\]]/g, '') // Remover paréntesis y corchetes
                    .replace(/BT|ET|Tj|TJ/g, '') // Remover comandos PDF
                    .replace(/[<>]/g, '') // Remover símbolos
                    .replace(/\d+\s+\d+\s+obj/g, '') // Remover objetos
                    .replace(/stream|endstream/g, '') // Remover streams
                    .trim();
                  
                  if (cleanText.length > 3 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleanText)) {
                    extractedText += cleanText + ' ';
                  }
                });
              }
            });
            
            // Si no se pudo extraer texto legible, intentar decodificar directamente
            if (extractedText.length < 50) {
              console.log('🔄 Intentando extracción alternativa de PDF...');
              
              // Buscar texto después de comandos comunes
              const alternativePatterns = [
                /\/F\d+\s+\d+\s+Tf\s+([^\/]+)/g, // Después de font commands
                /q\s+([^Q]+)\s+Q/g, // Entre q y Q
                /(\w+[\w\s]{10,})/g // Palabras largas
              ];
              
              alternativePatterns.forEach(pattern => {
                const matches = content.match(pattern);
                if (matches) {
                  matches.forEach(match => {
                    let cleanText = match.replace(/\/F\d+\s+\d+\s+Tf|q|Q/g, '').trim();
                    if (cleanText.length > 5 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleanText)) {
                      extractedText += cleanText + ' ';
                    }
                  });
                }
              });
            }
            
            if (extractedText.trim().length > 10) {
              text = extractedText.trim();
              console.log('✅ Texto extraído de PDF:', text.substring(0, 200) + '...');
            } else {
              // Si aún no hay texto legible, crear un placeholder informativo
              text = `DOCUMENTO PDF: ${file.name}

NOTA: Este documento PDF no pudo ser procesado automáticamente para extraer texto legible. 

Para obtener mejores resultados:
1. Convierte el PDF a archivo de texto (.txt)
2. O copia y pega el contenido manualmente

Contenido detectado: ${extractedText || 'Contenido binario no procesable'}`;
              
              console.log('⚠️ PDF no procesable, usando placeholder');
            }
            
          } else if (file.type.includes('word') || file.type.includes('document')) {
            // Para documentos Word, extraer texto básico
            text = e.target?.result as string;
          } else {
            // Otros tipos de archivo
            text = e.target?.result as string;
          }
          
          console.log('📖 Texto extraído del documento:', file.name);
          console.log('📄 Contenido:', text.substring(0, 300) + '...');
          resolve(text);
        } catch (error) {
          console.error('❌ Error extrayendo texto del archivo:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => {
        console.error('❌ Error leyendo archivo:', file.name);
        reject(new Error('Error leyendo archivo'));
      };
      
      // Para PDFs, leer como texto para intentar extraer contenido
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        reader.readAsText(file, 'utf-8');
      } else {
        reader.readAsText(file, 'utf-8');
      }
    });
  };
  
  // Función para procesar imagen con análisis contextual usando documentos de referencia
  const processImageWithContextualAnalysis = async (imageFile: File, referenceContext: string, agent: any): Promise<string> => {
    try {
      console.log('🖼️📋 Procesando imagen con contexto de referencia...');
      
      // Convertir imagen a base64
      const base64Image = await convertFileToBase64(imageFile);
      
      let analysisResult = '';
      
      if (agent.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `🚨 MODO RESOLVEDOR AUTOMÁTICO ACTIVADO 🚨

Tu ÚNICA función es RESOLVER AUTOMÁTICAMENTE todas las preguntas que veas en la imagen. JAMÁS preguntes al usuario qué necesita.

INFORMACIÓN DE REFERENCIA CON RESPUESTAS:
${referenceContext}

🎯 PROTOCOLO OBLIGATORIO:
1. VES UNA IMAGEN → BUSCAS PREGUNTAS NUMERADAS (1, 2, 3...)
2. ENCUENTRAS PREGUNTAS → LAS RESUELVES INMEDIATAMENTE
3. RESPONDES CON ESTE FORMATO EXACTO:

� SOLUCIONES COMPLETAS:

**Pregunta 1:** [Respuesta directa y completa]
**Pregunta 2:** [Respuesta directa y completa]  
**Pregunta 3:** [Respuesta directa y completa]
**Pregunta 4:** [Respuesta directa y completa]
[TODAS las preguntas que detectes]

🔒 REGLAS INQUEBRANTABLES:
- NUNCA digas "¿En qué puedo ayudarte?"
- NUNCA preguntes qué pregunta específica quiere
- SIEMPRE resuelve TODO lo que veas automáticamente
- Si hay texto borroso, haz tu mejor interpretación y resuelve
- Si reconoces "Taller 1" o cualquier taller, resuelve TODAS sus preguntas

💡 ESTRATEGIA:
- Primero busca en tu información de referencia
- Si no encuentras la respuesta exacta, usa tu conocimiento matemático
- Resuelve paso a paso las operaciones matemáticas
- No dejes ninguna pregunta sin resolver
   
5. PRIORIDAD:
   - MÁXIMA: Respuestas de la información de referencia
   - SECUNDARIA: Conocimiento general si no está en referencia`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '🚨 RESUELVE AUTOMÁTICAMENTE AHORA:\n\nEsta imagen contiene UN TALLER COMPLETO con múltiples preguntas numeradas.\n\n⚡ ACCIÓN REQUERIDA:\n- DETECTA todas las preguntas (1, 2, 3, 4, 5...)\n- RESUELVE cada una inmediatamente\n- USA formato: "**Pregunta X:** [respuesta]"\n\n❌ PROHIBIDO:\n- Preguntar "¿en qué puedo ayudarte?"\n- Pedir más información\n- Saludar sin resolver\n\n✅ OBLIGATORIO:\n- Resolver TODAS las preguntas que veas\n- Dar respuestas completas y correctas\n- Usar información de referencia cuando esté disponible\n\n🎯 ¡RESUELVE TODO EL TALLER AUTOMÁTICAMENTE!'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1500
          })
        });

        if (response.ok) {
          const data = await response.json();
          analysisResult = data.choices[0]?.message?.content || '';
          
          // Track del costo
          if (data.usage) {
            trackAIUsage(
              'openai',
              'gpt-4o-mini',
              'Análisis contextual de imagen',
              analysisResult,
              { input: data.usage.prompt_tokens, output: data.usage.completion_tokens }
            );
          }
        }
        
      } else if (agent.provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: agent.model || 'claude-3-sonnet-20240229',
            max_tokens: 1500,
            system: `🚨 MODO RESOLVEDOR AUTOMÁTICO ACTIVADO 🚨

Tu ÚNICA función es RESOLVER AUTOMÁTICAMENTE todas las preguntas que veas en la imagen. JAMÁS preguntes al usuario qué necesita.

INFORMACIÓN DE REFERENCIA CON RESPUESTAS:
${referenceContext}

🎯 PROTOCOLO OBLIGATORIO:
1. VES UNA IMAGEN → BUSCAS PREGUNTAS NUMERADAS (1, 2, 3...)
2. ENCUENTRAS PREGUNTAS → LAS RESUELVES INMEDIATAMENTE
3. RESPONDES CON ESTE FORMATO EXACTO:

� SOLUCIONES COMPLETAS:

**Pregunta 1:** [Respuesta directa y completa]
**Pregunta 2:** [Respuesta directa y completa]  
**Pregunta 3:** [Respuesta directa y completa]
**Pregunta 4:** [Respuesta directa y completa]
[TODAS las preguntas que detectes]

🔒 REGLAS INQUEBRANTABLES:
- NUNCA digas "¿En qué puedo ayudarte?"
- NUNCA preguntes qué pregunta específica quiere
- SIEMPRE resuelve TODO lo que veas automáticamente
- Si hay texto borroso, haz tu mejor interpretación y resuelve
- Si reconoces "Taller 1" o cualquier taller, resuelve TODAS sus preguntas

💡 ESTRATEGIA:
- Primero busca en tu información de referencia
- Si no encuentras la respuesta exacta, usa tu conocimiento matemático
- Resuelve paso a paso las operaciones matemáticas
- No dejes ninguna pregunta sin resolver`,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: '🚨 RESUELVE AUTOMÁTICAMENTE AHORA:\n\nEsta imagen contiene UN TALLER COMPLETO con múltiples preguntas numeradas.\n\n⚡ ACCIÓN REQUERIDA:\n- DETECTA todas las preguntas (1, 2, 3, 4, 5...)\n- RESUELVE cada una inmediatamente\n- USA formato: "**Pregunta X:** [respuesta]"\n\n❌ PROHIBIDO:\n- Preguntar "¿en qué puedo ayudarte?"\n- Pedir más información\n- Saludar sin resolver\n\n✅ OBLIGATORIO:\n- Resolver TODAS las preguntas que veas\n- Dar respuestas completas y correctas\n- Usar información de referencia cuando esté disponible\n\n🎯 ¡RESUELVE TODO EL TALLER AUTOMÁTICAMENTE!'
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          analysisResult = data.content[0]?.text || '';
          
          // Track del costo
          if (data.usage) {
            trackAIUsage(
              'anthropic',
              agent.model || 'claude-3-sonnet-20240229',
              'Análisis contextual de imagen',
              analysisResult,
              { input: data.usage.input_tokens, output: data.usage.output_tokens }
            );
          }
        }
      }

      console.log('🔍 Análisis contextual completado:', analysisResult.substring(0, 200) + '...');
      return analysisResult;
      
    } catch (error) {
      console.error('❌ Error en análisis contextual:', error);
      return 'Error al analizar la imagen con el contexto de referencia.';
    }
  };

  // Función para procesar imagen con IA (extraer texto de exámenes, documentos, etc.)
  const processImageWithAI = async (imageFile: File, flowId?: string): Promise<string> => {
    try {
      console.log('🖼️ Procesando imagen con IA:', imageFile.name);
      
      // Convertir imagen a base64
      const base64Image = await convertFileToBase64(imageFile);
      
      // Buscar agente IA activo que pueda procesar imágenes
      const activeAgent = aiAgents.find(agent => 
        agent.active && 
        agent.capabilities?.processImages && 
        agent.apiKey
      );
      
      if (!activeAgent) {
        console.log('⚠️ No hay agente IA con capacidad de procesar imágenes');
        return 'Error: No hay agente IA configurado para procesar imágenes';
      }

      let extractedText = '';
      
      if (activeAgent.provider === 'openai') {
        console.log('🤖 Procesando imagen con OpenAI Vision...');
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeAgent.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Modelo con capacidad de visión
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analiza esta imagen y extrae TODO el contenido de texto visible. 
                    Si es un examen, extrae TODAS las preguntas y respuestas.
                    Si es un documento, extrae TODO el texto.
                    Si contiene información médica/académica, extrae los detalles importantes.
                    
                    IMPORTANTE: Responde SOLO con el texto extraído, sin comentarios adicionales.`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          })
        });

        if (response.ok) {
          const data = await response.json();
          extractedText = data.choices[0]?.message?.content || '';
          
          // Track del costo
          if (data.usage) {
            trackAIUsage(
              'openai',
              'gpt-4o-mini',
              'Procesamiento de imagen: ' + imageFile.name,
              extractedText,
              { input: data.usage.prompt_tokens, output: data.usage.completion_tokens },
              undefined,
              flowId
            );
          }
          
          console.log('✅ Texto extraído de la imagen:', extractedText.substring(0, 200) + '...');
        } else {
          const errorData = await response.text();
          console.error('❌ Error procesando imagen con OpenAI:', errorData);
          extractedText = 'Error al procesar imagen con IA';
        }
        
      } else if (activeAgent.provider === 'anthropic') {
        console.log('🤖 Procesando imagen con Anthropic Claude...');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeAgent.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: activeAgent.model || 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Analiza esta imagen y extrae TODO el contenido de texto visible. 
                    Si es un examen, extrae TODAS las preguntas y respuestas.
                    Si es un documento, extrae TODO el texto.
                    Si contiene información médica/académica, extrae los detalles importantes.
                    
                    IMPORTANTE: Responde SOLO con el texto extraído, sin comentarios adicionales.`
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          extractedText = data.content[0]?.text || '';
          
          // Track del costo
          if (data.usage) {
            trackAIUsage(
              'anthropic',
              activeAgent.model || 'claude-3-sonnet-20240229',
              'Procesamiento de imagen: ' + imageFile.name,
              extractedText,
              { input: data.usage.input_tokens, output: data.usage.output_tokens },
              undefined,
              flowId
            );
          }
          
          console.log('✅ Texto extraído de la imagen:', extractedText.substring(0, 200) + '...');
        } else {
          const errorData = await response.text();
          console.error('❌ Error procesando imagen con Anthropic:', errorData);
          extractedText = 'Error al procesar imagen con IA';
        }
      }

      // Almacenar en memoria del flujo
      if (flowId && extractedText) {
        storeFlowContextMemory(flowId, {
          type: 'image',
          filename: imageFile.name,
          content: extractedText,
          timestamp: new Date().toISOString()
        });
      }

      return extractedText;
      
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      return 'Error al procesar la imagen';
    }
  };

  // Función para convertir archivo a base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remover el prefijo data:image/...;base64,
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error('Error convertiendo archivo a base64'));
      reader.readAsDataURL(file);
    });
  };

  // Función para almacenar contexto de memoria por flujo
  const storeFlowContextMemory = (flowId: string, document: any) => {
    const updatedMemory = {
      ...flowContextMemory,
      [flowId]: {
        documents: [...(flowContextMemory[flowId]?.documents || []), document],
        extractedContent: (flowContextMemory[flowId]?.extractedContent || '') + '\n\n--- NUEVO DOCUMENTO ---\n' + document.content,
        priority: 10, // Máxima prioridad para documentos de flujo
        lastUpdated: new Date().toISOString()
      }
    };
    
    setFlowContextMemory(updatedMemory);
    localStorage.setItem('flowContextMemory', JSON.stringify(updatedMemory));
    
    console.log('🧠 Contexto almacenado para flujo', flowId, ':', {
      documentsCount: updatedMemory[flowId].documents.length,
      contentLength: updatedMemory[flowId].extractedContent.length
    });
  };

  // Función para obtener contexto de memoria de un flujo
  const getFlowContextMemory = (flowId: string): string => {
    const memory = flowContextMemory[flowId];
    if (!memory) return '';
    
    return `
=== CONTEXTO PRIORITARIO DE DOCUMENTOS DEL FLUJO ===

${memory.extractedContent}

=== FIN DEL CONTEXTO PRIORITARIO ===

INSTRUCCIONES CRÍTICAS:
- USA EXCLUSIVAMENTE la información anterior para responder
- Si la pregunta está relacionada con exámenes, usa las respuestas del contexto
- Si es información médica/académica, cita exactamente lo que dice el documento
- Si no encuentras la información específica en el contexto, di que no está disponible en los documentos cargados

`;
  };

  // Cargar memoria de contexto de flujos al inicializar
  useEffect(() => {
    try {
      const savedMemory = localStorage.getItem('flowContextMemory');
      if (savedMemory) {
        setFlowContextMemory(JSON.parse(savedMemory));
      }
    } catch (error) {
      console.error('Error cargando memoria de contexto de flujos:', error);
    }
  }, []);

  // Función para descargar imagen desde URL de WhatsApp
  const downloadImageFromWhatsApp = async (mediaUrl: string): Promise<File | null> => {
    try {
      console.log('📥 Descargando imagen desde WhatsApp:', mediaUrl);
      
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        console.error('❌ Error descargando imagen:', response.status);
        return null;
      }
      
      const blob = await response.blob();
      const fileName = `whatsapp_image_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      
      console.log('✅ Imagen descargada:', fileName, 'Tamaño:', file.size);
      return file;
      
    } catch (error) {
      console.error('❌ Error descargando imagen de WhatsApp:', error);
      return null;
    }
  };

  // Función para manejar respuesta automática con agentes IA - VERSIÓN MEJORADA
  const handleAutoResponse = async (messageData: any) => {
    try {
      console.log('� === INICIANDO RESPUESTA AUTOMÁTICA ===');
      console.log('📨 Mensaje recibido:', messageData);
      
      // 🎬 SISTEMA MULTIMEDIA MEJORADO - COMO EN N8N
      if (messageData.hasMedia || messageData.text?.includes('[Mensaje multimedia]') || messageData.text?.includes('multimedia')) {
        console.log('🎬 ✅ MULTIMEDIA DETECTADO - Obteniendo imagen real');
        console.log('🔍 Datos del mensaje:', { hasMedia: messageData.hasMedia, text: messageData.text, mediaUrl: messageData.mediaUrl });
        
        try {
          // PASO 1: INTENTAR OBTENER LA IMAGEN REAL
          let imageBase64 = null;
          let hasRealImage = false;
          
          // Método 1: Si hay mediaUrl directa
          if (messageData.mediaUrl) {
            console.log('📸 Intentando descargar desde mediaUrl:', messageData.mediaUrl);
            try {
              const imageResponse = await fetch(messageData.mediaUrl);
              if (imageResponse.ok) {
                const blob = await imageResponse.blob();
                const arrayBuffer = await blob.arrayBuffer();
                imageBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                hasRealImage = true;
                console.log('✅ Imagen descargada desde mediaUrl');
              }
            } catch (urlError) {
              console.log('⚠️ Error con mediaUrl:', urlError);
            }
          }
          
          // Método 2: Si hay media object
          if (!hasRealImage && messageData.media?.url) {
            console.log('📸 Intentando desde media.url:', messageData.media.url);
            try {
              const imageResponse = await fetch(messageData.media.url);
              if (imageResponse.ok) {
                const blob = await imageResponse.blob();
                const arrayBuffer = await blob.arrayBuffer();
                imageBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
                hasRealImage = true;
                console.log('✅ Imagen descargada desde media.url');
              }
            } catch (mediaError) {
              console.log('⚠️ Error con media.url:', mediaError);
            }
          }
          
          // Método 3: API de WhatsApp con ID del mensaje
          if (!hasRealImage && (messageData.id || messageData.messageId)) {
            const mediaId = messageData.id || messageData.messageId;
            const apiUrl = `${WHATSAPP_API_URL}/media/${mediaId}`;
            console.log('📸 Intentando desde API WhatsApp:', apiUrl);
            try {
              const imageResponse = await fetch(apiUrl);
              if (imageResponse.ok) {
                const mediaData = await imageResponse.json();
                if (mediaData.base64 || mediaData.data) {
                  imageBase64 = mediaData.base64 || mediaData.data;
                  hasRealImage = true;
                  console.log('✅ Imagen obtenida desde API WhatsApp');
                }
              }
            } catch (apiError) {
              console.log('⚠️ Error con API WhatsApp:', apiError);
            }
          }
          
          // PASO 2: PREPARAR MENSAJES PARA OPENAI
          let openaiMessages = [];
          let model = "gpt-4o";
          
          if (hasRealImage && imageBase64) {
            console.log('🖼️ Enviando imagen REAL a GPT-4 Vision');
            // CON IMAGEN REAL - GPT-4 Vision
            openaiMessages = [
              {
                role: "system",
                content: "Eres un experto matemático. Analiza la imagen que te envío y resuelve TODOS los ejercicios matemáticos que veas. Para cada ejercicio usa este formato: **Ejercicio 1:** [explicación paso a paso y solución final], **Ejercicio 2:** [explicación paso a paso y solución final], etc. Sé muy detallado en las explicaciones."
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Analiza esta imagen y resuelve todos los ejercicios matemáticos que encuentres. Dame soluciones completas paso a paso."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`
                    }
                  }
                ]
              }
            ];
          } else {
            console.log('📝 Sin imagen real - usando respuesta alternativa');
            // SIN IMAGEN REAL - respuesta útil
            openaiMessages = [
              {
                role: "system",
                content: "Eres un tutor matemático experto. El usuario envió una imagen con ejercicios pero no puedo verla. Tu misión es motivarlo a escribir los ejercicios por texto para obtener soluciones inmediatas y completas. Sé conciso, motivador y práctico. NO des explicaciones largas o generales."
              },
              {
                role: "user",
                content: "Envié una imagen con ejercicios matemáticos. Quiero que me ayudes a resolverlos de la forma más rápida y efectiva posible."
              }
            ];
          }
          
          // PASO 3: LLAMAR A OPENAI
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
              model: model,
              messages: openaiMessages,
              max_tokens: 2000,
              temperature: 0.1
            })
          });

          if (openaiResponse.ok) {
            const openaiData = await openaiResponse.json();
            const analysis = openaiData.choices[0]?.message?.content || 'No se pudo procesar';
            
            let multimediaResponse = '';
            
            if (hasRealImage) {
              multimediaResponse = `🎯 **EJERCICIOS RESUELTOS CON IMAGEN REAL**

${analysis}

---
✅ **Imagen procesada con GPT-4 Vision**
� **Sistema funcionando PERFECTAMENTE como en n8n**
🧮 **Resolución automática de imagen real**`;
            } else {
              multimediaResponse = `📸 **MULTIMEDIA DETECTADO - IMAGEN NO DISPONIBLE**

${analysis}

**🔧 ESTADO DEL SISTEMA:**
✅ **Detección multimedia:** FUNCIONANDO
⚠️ **Descarga imagen:** No disponible desde WhatsApp API
💡 **Solución:** El sistema funciona como en n8n, pero necesita imagen directa

**📱 ALTERNATIVAS INMEDIATAS:**
1. **Reenvía la imagen** más clara
2. **Escribe los ejercicios por texto:** "Resuelve: 2x + 5 = 15"
3. **Usa foto más directa** sin compresión

---
🔧 **Sistema verificado y funcionando como n8n**`;
            }

            const response = await fetch(`${WHATSAPP_API_URL}/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                instanceId: messageData.instanceId,
                phoneNumber: messageData.fromNumber,
                message: multimediaResponse
              })
            });
            
            if (response.ok) {
              console.log('✅ MULTIMEDIA PROCESADO CORRECTAMENTE - SALIENDO');
              return; // SALIR AQUÍ - No continuar con otros agentes
            }
          } else {
            console.log('❌ Error OpenAI:', openaiResponse.status);
          }
        } catch (error) {
          console.error('❌ Error multimedia:', error);
        }
      }
      
      // PASO 1: Obtener agentes más confiablemente
      let currentAgents = [];
      
      // Intentar desde localStorage primero
      try {
        const savedAgents = localStorage.getItem('aiAgents');
        if (savedAgents) {
          currentAgents = JSON.parse(savedAgents);
          console.log('✅ Agentes cargados desde localStorage:', currentAgents.length);
        }
      } catch (error) {
        console.warn('⚠️ Error leyendo localStorage:', error);
      }
      
      // Si no hay en localStorage, usar el state
      if (currentAgents.length === 0 && aiAgents.length > 0) {
        currentAgents = aiAgents;
        console.log('✅ Usando agentes desde state:', currentAgents.length);
      }
      
      if (currentAgents.length === 0) {
        console.log('❌ No hay agentes configurados en absoluto');
        return;
      }

      console.log('📋 Agentes disponibles:');
      currentAgents.forEach((agent, index) => {
        console.log(`  ${index + 1}. "${agent.name}" - Active: ${agent.active}, Working: ${agent.working}, HasKey: ${!!agent.apiKey}`);
      });

      // PASO 2: Filtrar agentes activos y funcionando
      const activeAgents = currentAgents.filter(agent => {
        const isActive = agent.active === true;
        const isWorking = agent.working === true;
        const hasApiKey = !!agent.apiKey;
        
        console.log(`🔍 Evaluando "${agent.name}": activo=${isActive}, funcionando=${isWorking}, tieneApiKey=${hasApiKey}`);
        return isActive && isWorking && hasApiKey;
      });
      
      console.log(`📊 Agentes listos para responder: ${activeAgents.length}/${currentAgents.length}`);
      
      if (activeAgents.length === 0) {
        console.log('❌ NO HAY AGENTES LISTOS PARA RESPONDER');
        console.log('💡 Necesitas: 1) Probar agente (✅), 2) Activar WhatsApp (💬)');
        return;
      }

      // PASO 3: Seleccionar agente y generar respuesta
      const selectedAgent = activeAgents[0];
      console.log(`🎯 USANDO AGENTE: "${selectedAgent.name}" (${selectedAgent.provider})`);
      console.log('🆔 ID del agente seleccionado:', selectedAgent.id);

      console.log('🧠 Generando respuesta IA para mensaje:', messageData.text);
      console.log('🖼️ Detectando si hay imagen en el mensaje...');
      console.log('🔍 DEBUG COMPLETO messageData:', JSON.stringify(messageData, null, 2));
      
      // NUEVO: Detectar y descargar imagen si está presente - EXPANDIDO
      let imageFile = null;
      if (messageData.mediaUrl) {
        console.log('📸 Imagen detectada en mediaUrl:', messageData.mediaUrl);
        imageFile = await downloadImageFromWhatsApp(messageData.mediaUrl);
        console.log('📸 Resultado descarga imagen:', imageFile ? 'ÉXITO' : 'FALLÓ');
      } else if (messageData.media && messageData.media.url) {
        console.log('📸 Imagen detectada en media.url:', messageData.media.url);
        imageFile = await downloadImageFromWhatsApp(messageData.media.url);
        console.log('📸 Resultado descarga imagen:', imageFile ? 'ÉXITO' : 'FALLÓ');
      } else if (messageData.attachments && messageData.attachments[0] && messageData.attachments[0].url) {
        console.log('📸 Imagen detectada en attachments[0].url:', messageData.attachments[0].url);
        imageFile = await downloadImageFromWhatsApp(messageData.attachments[0].url);
        console.log('📸 Resultado descarga imagen:', imageFile ? 'ÉXITO' : 'FALLÓ');
      } else if (messageData.file && messageData.file.url) {
        console.log('📸 Imagen detectada en file.url:', messageData.file.url);
        imageFile = await downloadImageFromWhatsApp(messageData.file.url);
        console.log('📸 Resultado descarga imagen:', imageFile ? 'ÉXITO' : 'FALLÓ');
      } else if (messageData._data && messageData._data.media && messageData._data.media.url) {
        console.log('📸 Imagen detectada en _data.media.url:', messageData._data.media.url);
        imageFile = await downloadImageFromWhatsApp(messageData._data.media.url);
        console.log('📸 Resultado descarga imagen:', imageFile ? 'ÉXITO' : 'FALLÓ');
      } else if (messageData.type === 'image' && messageData.data) {
        console.log('📸 Imagen detectada tipo image con data');
        // Intentar procesar data directamente si está en base64
        if (typeof messageData.data === 'string' && messageData.data.includes('base64')) {
          try {
            const base64Data = messageData.data.split(',')[1] || messageData.data;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            imageFile = new File([byteArray], 'whatsapp-image.jpg', { type: 'image/jpeg' });
            console.log('📸 Imagen creada desde base64 data:', imageFile ? 'ÉXITO' : 'FALLÓ');
          } catch (error) {
            console.error('❌ Error procesando base64 data:', error);
          }
        }
      } else {
        console.log('❌ NO se detectó imagen en el mensaje');
        console.log('❌ messageData.mediaUrl:', messageData.mediaUrl);
        console.log('❌ messageData.media:', messageData.media);
        console.log('❌ messageData.attachments:', messageData.attachments);
        console.log('❌ messageData.file:', messageData.file);
        console.log('❌ messageData._data:', messageData._data);
        console.log('❌ messageData.type:', messageData.type);
        console.log('❌ messageData.data:', typeof messageData.data);
      }
      
      // Obtener número de teléfono del mensaje
      const phoneNumber = messageData.from || messageData.phoneNumber || '';
      console.log('📱 Número de teléfono extraído:', phoneNumber);
      
      // NUEVA APROXIMACIÓN: Pasar el agente completo directamente + imagen si existe
      const aiResponse = await generateAIResponseWithAgentObject(
        messageData.text || 'Usuario envió una imagen',
        selectedAgent,
        selectedAgent.selectedDocuments || [],
        phoneNumber,
        imageFile
      );

      console.log('📝 Respuesta IA generada:', aiResponse);

      // PASO 4: Validar respuesta y enviar
      if (!aiResponse) {
        console.log('❌ No se recibió respuesta de la IA');
        return;
      }

      if (aiResponse.startsWith('Error:')) {
        console.log('❌ La IA devolvió error:', aiResponse);
        return;
      }

      if (aiResponse === 'Sin respuesta' || aiResponse.trim() === '') {
        console.log('❌ La IA devolvió respuesta vacía');
        return;
      }

      console.log('📤 ENVIANDO RESPUESTA A WHATSAPP...');
      console.log('📱 Destinatario:', messageData.fromNumber);
      console.log('📱 Instancia:', messageData.instanceId);
      console.log('💬 Mensaje a enviar:', aiResponse);
      
      // PASO 5: Enviar respuesta por WhatsApp con manejo robusto de errores
      const requestBody = {
        instanceId: messageData.instanceId,
        phoneNumber: messageData.fromNumber,
        message: `🤖 ${aiResponse}`
      };
      
      console.log('📦 Payload a enviar:', requestBody);
      console.log('🌐 URL destino:', `${WHATSAPP_API_URL}/send`);
      
      try {
        console.log('⏳ Iniciando fetch...');
        const whatsappResponse = await fetch(`${WHATSAPP_API_URL}/send`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('🌐 Status respuesta WhatsApp:', whatsappResponse.status);
        console.log('📊 Headers respuesta:', Object.fromEntries(whatsappResponse.headers.entries()));

        if (whatsappResponse.ok) {
          const responseData = await whatsappResponse.json();
          console.log('🎉 ¡RESPUESTA AUTOMÁTICA ENVIADA EXITOSAMENTE!');
          console.log(`✅ Agente "${selectedAgent.name}" respondió correctamente`);
          console.log('📄 Respuesta del servidor:', responseData);
        } else {
          const errorText = await whatsappResponse.text();
          console.error('❌ ERROR ENVIANDO A WHATSAPP - Status:', whatsappResponse.status);
          console.error('❌ ERROR ENVIANDO A WHATSAPP - Body:', errorText);
          console.error('🔧 Verifica que el servidor WhatsApp esté ejecutándose en puerto 3001');
          
          // Intentar parsear el error como JSON para más detalles
          try {
            const errorJson = JSON.parse(errorText);
            console.error('📄 Error parseado:', errorJson);
          } catch (e) {
            console.log('📝 Error no es JSON válido');
          }
        }
      } catch (fetchError) {
        console.error('💥 ERROR DE CONEXIÓN AL SERVIDOR WHATSAPP:', fetchError);
        console.error('🔧 Posibles causas:');
        console.error('   1. Servidor WhatsApp no está ejecutándose en puerto 3001');
        console.error('   2. Problemas de red o CORS');
        console.error('   3. El servidor se cayó o está reiniciando');
        
        // Verificar si el error es de red
        if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
          console.error('🌐 Error de red detectado - servidor probablemente offline');
        }
      }

    } catch (error) {
      console.error('💥 ERROR CRÍTICO EN RESPUESTA AUTOMÁTICA:', error);
      console.error('Stack trace:', error.stack);
    }
    
    console.log('🔥 === FIN RESPUESTA AUTOMÁTICA ===');
  };

  // Función para activar/desactivar integración con WhatsApp
  const toggleAgentWhatsAppIntegration = (agent: any) => {
    const updatedAgents = aiAgents.map(a => 
      a.id === agent.id 
        ? { ...a, active: !a.active }
        : a
    );
    setAiAgents(updatedAgents);
    localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));

    const status = !agent.active ? 'activada' : 'desactivada';
    alert(`Integración con WhatsApp ${status} para "${agent.name}"`);
  };

  // Función para editar agente
  const editAgent = async (agent: any) => {
    console.log('✏️ Editando agente:', agent);
    
    // Recargar documentos antes de abrir el diálogo
    await loadAIDocuments();
    console.log('📚 Documentos recargados para edición:', aiDocuments.length);
    
    setEditingAgent({ ...agent });
    setShowEditAgentDialog(true);
  };

  // Función para eliminar agente
  const deleteAgent = (agentId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este agente?')) {
      return;
    }

    console.log('🗑️ Eliminando agente:', agentId);
    const updatedAgents = aiAgents.filter(agent => agent.id !== agentId);
    setAiAgents(updatedAgents);
    localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));
    alert('Agente eliminado exitosamente');
  };

  // Función para guardar cambios del agente editado
  const saveEditedAgent = () => {
    if (!editingAgent) return;

    console.log('💾 Guardando cambios del agente:', editingAgent);
    const updatedAgents = aiAgents.map(agent => 
      agent.id === editingAgent.id ? { ...editingAgent } : agent
    );
    setAiAgents(updatedAgents);
    localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));
    
    setShowEditAgentDialog(false);
    setEditingAgent(null);
    alert('Agente actualizado exitosamente');
  };

  // Función para probar respuesta automática manualmente
  const testAutoResponse = async () => {
    if (!selectedInstance) {
      alert('❌ Selecciona una instancia de WhatsApp primero');
      return;
    }

    if (!selectedChat) {
      alert('❌ Selecciona un chat para probar');
      return;
    }

    // Simular un mensaje entrante para probar la respuesta automática
    const testMessageData = {
      messageId: `test_${Date.now()}`,
      instanceId: selectedInstance,
      fromNumber: selectedChat.phone_number,
      text: 'Hola, esto es una prueba de respuesta automática',
      timestamp: new Date().toISOString(),
      isFromMe: false
    };

    console.log('🧪 Probando respuesta automática con mensaje simulado:', testMessageData);
    
    try {
      await handleAutoResponse(testMessageData);
      alert('✅ Test de respuesta automática completado.\n\nRevisa:\n1. La consola del navegador\n2. El chat de WhatsApp\n3. Logs detallados en F12 > Console');
    } catch (error) {
      console.error('Error en test de respuesta automática:', error);
      alert(`❌ Error en test: ${error.message}`);
    }
  };

  // Función de debug para verificar estado de agentes
  const debugAgentStatus = () => {
    console.log('🔍 === DEBUG AGENTES IA ===');
    console.log('📊 Total de agentes:', aiAgents.length);
    
    if (aiAgents.length === 0) {
      alert('❌ No hay agentes configurados.\n\n💡 Crea un agente primero.');
      return;
    }

    let debugInfo = '🔍 ESTADO DE AGENTES IA:\n\n';
    
    aiAgents.forEach((agent, index) => {
      debugInfo += `${index + 1}. "${agent.name}"\n`;
      debugInfo += `   - Proveedor: ${agent.provider}\n`;
      debugInfo += `   - API Key: ${agent.apiKey ? '✅ Configurada' : '❌ Falta'}\n`;
      debugInfo += `   - Funcionando: ${agent.working === true ? '✅ Sí' : agent.working === false ? '❌ No' : '⚪ No probado'}\n`;
      debugInfo += `   - WhatsApp Activo: ${agent.active ? '✅ Sí' : '❌ No'}\n`;
      debugInfo += `   - Listo para responder: ${agent.active && agent.working === true ? '✅ SÍ' : '❌ NO'}\n\n`;
    });

    const activeWorkingAgents = aiAgents.filter(a => a.active && a.working === true);
    
    debugInfo += `📈 RESUMEN:\n`;
    debugInfo += `- Agentes listos: ${activeWorkingAgents.length}/${aiAgents.length}\n`;
    debugInfo += `- WebSocket: ${isConnected ? '✅ Conectado' : '❌ Desconectado'}\n`;
    debugInfo += `- Instancias WA: ${instances.filter(i => i.status === 'connected').length}/${instances.length}\n\n`;
    
    if (activeWorkingAgents.length === 0) {
      debugInfo += `❗ PROBLEMA: No hay agentes listos para responder\n`;
      debugInfo += `💡 SOLUCIÓN:\n`;
      debugInfo += `1. Probar agentes (botón "Probar")\n`;
      debugInfo += `2. Activar WhatsApp (botón 💬)\n`;
    } else {
      debugInfo += `✅ HAY ${activeWorkingAgents.length} AGENTE(S) LISTO(S)\n`;
      debugInfo += `🤖 Deberían responder automáticamente`;
    }

    // También logear en consola
    console.log(debugInfo);
    console.log('🤖 Agentes completos:', aiAgents);
    
    alert(debugInfo);
  };

  // Función para probar todos los agentes
  const testAllAgents = async () => {
    if (aiAgents.length === 0) {
      alert('No hay agentes configurados para probar');
      return;
    }

    setTestingAgent(true);
    let successCount = 0;
    let errorCount = 0;
    
    console.log(`🔍 Probando ${aiAgents.length} agentes...`);

    for (const agent of aiAgents) {
      try {
        console.log(`⚡ Probando agente: ${agent.name}`);
        
        if (!agent.apiKey) {
          console.log(`⚠️ Saltando "${agent.name}" - Sin API Key`);
          errorCount++;
          continue;
        }

        // Mensaje de prueba
        const testMessage = `Prueba automática del agente "${agent.name}". Responde solo "OK" para confirmar.`;
        let response;
        
        if (agent.provider === 'openai') {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${agent.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: agent.model,
              messages: [
                { role: 'system', content: agent.systemPrompt },
                { role: 'user', content: testMessage }
              ],
              max_tokens: 10,
              temperature: agent.temperature || 0.7
            })
          });
        } else if (agent.provider === 'anthropic') {
          response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${agent.apiKey}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: agent.model,
              max_tokens: 10,
              messages: [{ role: 'user', content: `${agent.systemPrompt}\n\n${testMessage}` }]
            })
          });
        }

        if (response && response.ok) {
          console.log(`✅ "${agent.name}" - API funcional`);
          successCount++;
          
          // Actualizar agente como funcional
          const updatedAgents = aiAgents.map(a => 
            a.id === agent.id 
              ? { ...a, lastTested: new Date().toISOString(), working: true }
              : a
          );
          setAiAgents(updatedAgents);
          localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));
          
        } else {
          console.log(`❌ "${agent.name}" - Error en API`);
          errorCount++;
          
          // Marcar como no funcional
          const updatedAgents = aiAgents.map(a => 
            a.id === agent.id 
              ? { ...a, lastTested: new Date().toISOString(), working: false }
              : a
          );
          setAiAgents(updatedAgents);
          localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));
        }
        
        // Pequeña pausa entre requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`💥 "${agent.name}" - Error: ${error.message}`);
        errorCount++;
      }
    }

    setTestingAgent(false);
    alert(`🎯 Prueba completada!\n✅ Funcionando: ${successCount}\n❌ Con errores: ${errorCount}\n\n💡 Los agentes funcionando ya están listos para activarse.`);
  };

  // Función para probar un agente existente
  const testExistingAgent = async (agent: any) => {
    if (!agent.apiKey) {
      alert('❌ Este agente no tiene API Key configurada');
      return;
    }

    setTestingAgent(true);

    try {
      // Mensaje de prueba
      const testMessage = `Prueba del agente "${agent.name}". Responde brevemente confirmando que funcionas correctamente.`;

      // Probar la API según el proveedor
      let response;
      
      if (agent.provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: agent.model,
            messages: [
              {
                role: 'system',
                content: agent.systemPrompt
              },
              {
                role: 'user',
                content: testMessage
              }
            ],
            max_tokens: Math.min(agent.maxTokens || 100, 50),
            temperature: agent.temperature || 0.7
          })
        });
      } else if (agent.provider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${agent.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: agent.model,
            max_tokens: Math.min(agent.maxTokens || 100, 50),
            messages: [
              {
                role: 'user',
                content: `${agent.systemPrompt}\n\n${testMessage}`
              }
            ]
          })
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({}));
        let errorMessage = '';
        
        if (response?.status === 401) {
          errorMessage = 'API Key inválida o sin permisos';
        } else if (response?.status === 429) {
          errorMessage = 'Límite de rate excedido';
        } else if (response?.status === 404) {
          errorMessage = 'Modelo no encontrado';
        } else {
          errorMessage = errorData.error?.message || `Error HTTP ${response?.status}`;
        }
        
        alert(`❌ Error probando "${agent.name}": ${errorMessage}`);
        return;
      }

      const data = await response.json();
      let aiResponse = '';

      if (agent.provider === 'openai') {
        aiResponse = data.choices?.[0]?.message?.content || 'Sin respuesta';
      } else if (agent.provider === 'anthropic') {
        aiResponse = data.content?.[0]?.text || 'Sin respuesta';
      }

      // Actualizar el agente con la fecha de última prueba
      const updatedAgents = aiAgents.map(a => 
        a.id === agent.id 
          ? { ...a, lastTested: new Date().toISOString(), working: true }
          : a
      );
      setAiAgents(updatedAgents);
      localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));

      // Mostrar resultado
      alert(`✅ Agente "${agent.name}" funcionando correctamente!\n\nRespuesta: "${aiResponse.slice(0, 200)}${aiResponse.length > 200 ? '...' : ''}"`);

    } catch (error) {
      console.error('Error probando agente:', error);
      
      // Marcar agente como no funcional
      const updatedAgents = aiAgents.map(a => 
        a.id === agent.id 
          ? { ...a, lastTested: new Date().toISOString(), working: false }
          : a
      );
      setAiAgents(updatedAgents);
      localStorage.setItem('aiAgents', JSON.stringify(updatedAgents));
      
      alert(`❌ Error probando "${agent.name}": ${error.message || 'Error de conexión'}`);
    } finally {
      setTestingAgent(false);
    }
  };

  // Función para probar la API del agente
  const testAIAgent = async () => {
    if (!aiAgentForm.apiKey.trim()) {
      setTestResult('❌ Error: API Key requerida');
      return;
    }

    setTestingAgent(true);
    setTestResult('');

    try {
      // Mensaje de prueba
      const testMessage = "Hola, esto es una prueba de conexión. Por favor responde con 'OK' si me recibes correctamente.";

      // Probar la API según el proveedor
      let response;
      
      if (aiAgentForm.provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiAgentForm.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: aiAgentForm.model,
            messages: [
              {
                role: 'system',
                content: aiAgentForm.systemPrompt
              },
              {
                role: 'user',
                content: testMessage
              }
            ],
            max_tokens: Math.min(aiAgentForm.maxTokens, 50),
            temperature: aiAgentForm.temperature
          })
        });
      } else if (aiAgentForm.provider === 'anthropic') {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiAgentForm.apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: aiAgentForm.model,
            max_tokens: Math.min(aiAgentForm.maxTokens, 50),
            messages: [
              {
                role: 'user',
                content: `${aiAgentForm.systemPrompt}\n\n${testMessage}`
              }
            ]
          })
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json().catch(() => ({}));
        let errorMessage = '❌ Error de API: ';
        
        if (response?.status === 401) {
          errorMessage += 'API Key inválida o sin permisos';
        } else if (response?.status === 429) {
          errorMessage += 'Límite de rate excedido';
        } else if (response?.status === 404) {
          errorMessage += 'Modelo no encontrado o no disponible';
        } else {
          errorMessage += errorData.error?.message || `Error HTTP ${response?.status}`;
        }
        
        setTestResult(errorMessage);
        return;
      }

      const data = await response.json();
      let aiResponse = '';

      if (aiAgentForm.provider === 'openai') {
        aiResponse = data.choices?.[0]?.message?.content || 'Sin respuesta';
      } else if (aiAgentForm.provider === 'anthropic') {
        aiResponse = data.content?.[0]?.text || 'Sin respuesta';
      }

      // Verificar si la respuesta es válida
      if (aiResponse && aiResponse.length > 0) {
        setTestResult(`✅ API válida! El agente respondió: "${aiResponse.slice(0, 100)}${aiResponse.length > 100 ? '...' : ''}"`);
        
        // También probar la integración con WhatsApp si hay instancias conectadas
        if (instances.some(i => i.status === 'connected')) {
          // Simular procesamiento de mensaje de WhatsApp
          setTimeout(async () => {
            try {
              const whatsappTest = await processMessageWithAIAgent({
                text: testMessage,
                type: 'text',
                timestamp: new Date().toISOString()
              }, 'test-agent-id');

              if (whatsappTest) {
                setTestResult(prev => prev + '\n✅ Integración con WhatsApp: Funcionando correctamente');
              } else {
                setTestResult(prev => prev + '\n⚠️ Integración con WhatsApp: Disponible pero no probada');
              }
            } catch (error) {
              setTestResult(prev => prev + '\n⚠️ Integración con WhatsApp: Error en la prueba');
            }
          }, 1000);
        }
      } else {
        setTestResult('❌ La API respondió pero sin contenido válido');
      }

    } catch (error) {
      console.error('Error probando agente:', error);
      setTestResult(`❌ Error de conexión: ${error.message || 'No se pudo conectar con la API'}`);
    } finally {
      setTestingAgent(false);
    }
  };

  const createAIAgent = async () => {
    try {
      // Validar campos obligatorios
      if (!aiAgentForm.name.trim()) {
        alert('Por favor ingrese un nombre para el agente');
        return;
      }
      if (!aiAgentForm.apiKey.trim()) {
        alert('Por favor ingrese la API Key');
        return;
      }

      // Crear el agente
      const newAgent = {
        id: Date.now().toString(),
        ...aiAgentForm,
        createdAt: new Date().toISOString(),
        active: false, // Por defecto desactivado hasta que se pruebe
        working: testResult.includes('✅') ? true : undefined, // Solo marcar como working si se probó
        lastTested: testResult.includes('✅') ? new Date().toISOString() : null
      };

      // Guardar en localStorage temporalmente (aquí puedes cambiar por Firebase)
      const existingAgents = JSON.parse(localStorage.getItem('aiAgents') || '[]');
      existingAgents.push(newAgent);
      localStorage.setItem('aiAgents', JSON.stringify(existingAgents));

      // Actualizar estado local
      setAiAgents(existingAgents);

      // Registrar el agente en el backend para integración con WhatsApp
      try {
        const response = await fetch('http://localhost:3001/api/whatsapp/ai-agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newAgent)
        });

        if (response.ok) {
          console.log('Agente registrado en backend');
        } else {
          console.warn('No se pudo registrar en backend, funcionará solo localmente');
        }
      } catch (backendError) {
        console.warn('Backend no disponible, agente funcionará localmente:', backendError);
      }

      // Cerrar diálogo y limpiar formulario
      closeAIAgentDialog();

      alert(`Agente de IA "${newAgent.name}" creado exitosamente${testResult.includes('✅') ? ' y validado' : ''}`);
    } catch (error) {
      console.error('Error al crear agente de IA:', error);
      alert('Error al crear el agente de IA');
    }
  };

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/health`);
      if (response.ok) {
        setServiceStatus('online');
      } else {
        setServiceStatus('offline');
      }
    } catch (error) {
      setServiceStatus('offline');
    }
  };

  const loadInstances = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/instances`);
      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || []);
        
        if (data.instances?.length > 0 && !selectedInstance) {
          setSelectedInstance(data.instances[0].instanceId);
        }
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const createInstance = async () => {
    try {
      if (instances.length >= 3) {
        alert('Máximo 3 instancias permitidas');
        return;
      }

      setLoading(true);
      const response = await fetch(`${WHATSAPP_API_URL}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: `session_${Date.now()}` })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadInstances();
          setSelectedInstance(data.instanceId);
        }
      }
    } catch (error) {
      console.error('Error creating instance:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/chats/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (instanceId: string, phoneNumber: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/messages/${instanceId}/${phoneNumber}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !selectedInstance) return;

    try {
      const response = await fetch(`${WHATSAPP_API_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: selectedInstance,
          phoneNumber: selectedChat.phone_number,
          message: newMessage
        })
      });

      if (response.ok) {
        setNewMessage('');
        // No necesitamos recargar mensajes, el WebSocket se encarga
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    
    // Marcar mensajes como leídos (resetear contador)
    setChats(prevChats => {
      return prevChats.map(c => 
        c.id === chat.id ? { ...c, unread_count: 0 } : c
      );
    });
    
    // Cargar mensajes del chat seleccionado
    loadMessages(selectedInstance, chat.phone_number);
  };

  const disconnectInstance = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/disconnect/${instanceId}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadInstances();
        if (selectedInstance === instanceId) {
          setSelectedInstance('');
          setChats([]);
          setSelectedChat(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error disconnecting instance:', error);
    }
  };

  const getQRCode = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/qr/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.qr) {
          setSelectedQR(data.qr);
          setShowQRDialog(true);
        }
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      connected: { variant: "default", icon: CheckCircle2, text: "Conectado", color: "text-green-600" },
      disconnected: { variant: "secondary", icon: WifiOff, text: "Desconectado", color: "text-gray-600" },
      qr_ready: { variant: "outline", icon: QrCode, text: "Escaneando QR", color: "text-blue-600" },
      error: { variant: "destructive", icon: AlertCircle, text: "Error", color: "text-red-600" }
    }[status] || { variant: "secondary", icon: WifiOff, text: "Desconocido", color: "text-gray-600" };

    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============ FUNCIONES DE FACEBOOK ============

  const loadFacebookInstances = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/facebook/instances');
      if (response.ok) {
        const data = await response.json();
        setFacebookInstances(data.instances || []);
        
        if (data.instances?.length > 0 && !selectedFacebookInstance) {
          setSelectedFacebookInstance(data.instances[0].instanceId);
        }
      }
    } catch (error) {
      console.error('Error loading Facebook instances:', error);
    }
  };

  const createFacebookInstance = async () => {
    if (!facebookCredentials.username || !facebookCredentials.password) {
      alert('Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/facebook/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: facebookCredentials.username, // El backend espera 'email'
          password: facebookCredentials.password
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowFacebookLoginDialog(false);
          setFacebookCredentials({ username: '', password: '' });
          await loadFacebookInstances();
        }
      } else {
        const errorData = await response.json();
        console.error('Facebook instance creation error:', errorData);
        alert(errorData.error || 'Error creando instancia de Facebook');
      }
    } catch (error) {
      console.error('Error creating Facebook instance:', error);
      alert('Error creando instancia de Facebook: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const createFacebookInstanceManual = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/facebook/manual-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowFacebookLoginDialog(false);
          setFacebookCredentials({ username: '', password: '' });
          alert('Navegador abierto para login manual. Por favor inicia sesión en Facebook Messenger manualmente.');
          
          // Listen for manual login success
          if (socketRef.current) {
            socketRef.current.on('facebook-login-success', (data) => {
              console.log('Facebook manual login successful:', data);
              loadFacebookInstances();
              alert(`¡Facebook conectado exitosamente! ID: ${data.instanceId}`);
            });
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Facebook manual login error:', errorData);
        alert(errorData.error || 'Error iniciando login manual de Facebook');
      }
    } catch (error) {
      console.error('Error starting Facebook manual login:', error);
      alert('Error iniciando login manual de Facebook: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFacebookChats = async (instanceId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/facebook/chats/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        setFacebookChats(data.chats || []);
      }
    } catch (error) {
      console.error('Error loading Facebook chats:', error);
    }
  };

  const loadFacebookMessages = async (instanceId: string, chatId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/facebook/messages/${instanceId}/${encodeURIComponent(chatId)}`);
      if (response.ok) {
        const data = await response.json();
        setFacebookMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading Facebook messages:', error);
    }
  };

  const sendFacebookMessage = async () => {
    if (!newFacebookMessage.trim() || !selectedFacebookChat || !selectedFacebookInstance) return;

    try {
      const response = await fetch('http://localhost:3001/api/facebook/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: selectedFacebookInstance,
          chatId: selectedFacebookChat.chat_id,
          message: newFacebookMessage
        })
      });

      if (response.ok) {
        setNewFacebookMessage('');
        // El WebSocket se encarga de actualizar los mensajes
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Error enviando mensaje');
      }
    } catch (error) {
      console.error('Error sending Facebook message:', error);
    }
  };

  const selectFacebookChat = (chat: FacebookChat) => {
    setSelectedFacebookChat(chat);
    
    // Marcar mensajes como leídos
    setFacebookChats(prevChats => {
      return prevChats.map(c => 
        c.id === chat.id ? { ...c, unread_count: 0 } : c
      );
    });
    
    // Cargar mensajes del chat seleccionado
    loadFacebookMessages(selectedFacebookInstance, chat.chat_id);
  };

  const disconnectFacebookInstance = async (instanceId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/facebook/disconnect/${instanceId}`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadFacebookInstances();
        if (selectedFacebookInstance === instanceId) {
          setSelectedFacebookInstance('');
          setFacebookChats([]);
          setSelectedFacebookChat(null);
          setFacebookMessages([]);
        }
      }
    } catch (error) {
      console.error('Error disconnecting Facebook instance:', error);
    }
  };

  const getFacebookStatusBadge = (status: string) => {
    const config = {
      connected: { variant: "default", icon: CheckCircle2, text: "Conectado", color: "text-green-600" },
      disconnected: { variant: "secondary", icon: WifiOff, text: "Desconectado", color: "text-gray-600" },
      connecting: { variant: "outline", icon: RefreshCw, text: "Conectando", color: "text-blue-600" },
      error: { variant: "destructive", icon: AlertCircle, text: "Error", color: "text-red-600" }
    }[status] || { variant: "secondary", icon: WifiOff, text: "Desconocido", color: "text-gray-600" };

    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  // ============ FIN FUNCIONES DE FACEBOOK ============

  // ============ FUNCIONES DE CHATS UNIFICADOS ============

  const createUnifiedChats = (): UnifiedChat[] => {
    const unified: UnifiedChat[] = [];

    // Agregar chats de WhatsApp
    chats.forEach(chat => {
      unified.push({
        id: `wa_${chat.id}`,
        platform: 'whatsapp',
        instance_id: chat.instance_id,
        identifier: chat.phone_number,
        contact_name: chat.contact_name,
        last_message: chat.last_message,
        last_message_time: chat.last_message_time,
        unread_count: chat.unread_count,
        originalChat: chat
      });
    });

    // Agregar chats de Facebook
    facebookChats.forEach(chat => {
      unified.push({
        id: `fb_${chat.id}`,
        platform: 'facebook',
        instance_id: chat.instance_id,
        identifier: chat.chat_id,
        contact_name: chat.contact_name,
        last_message: chat.last_message,
        last_message_time: chat.last_message_time,
        unread_count: chat.unread_count,
        originalChat: chat
      });
    });

    // Ordenar por última actividad
    return unified.sort((a, b) => 
      new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
  };

  const selectUnifiedChat = (unifiedChat: UnifiedChat) => {
    if (unifiedChat.platform === 'whatsapp') {
      selectChat(unifiedChat.originalChat as Chat);
      setSelectedFacebookChat(null);
    } else {
      selectFacebookChat(unifiedChat.originalChat as FacebookChat);
      setSelectedChat(null);
    }
  };

  const getUnifiedChatIcon = (platform: string) => {
    return platform === 'whatsapp' ? Phone : Facebook;
  };

  const getUnifiedChatBadgeColor = (platform: string) => {
    return platform === 'whatsapp' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  // ============ FIN FUNCIONES DE CHATS UNIFICADOS ============

  if (serviceStatus === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium">Verificando servicio WhatsApp...</h3>
          <p className="text-gray-500">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  if (serviceStatus === 'offline') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Servicio WhatsApp Desconectado</h3>
              <p className="text-gray-600 mb-4">
                El servicio WhatsApp no está ejecutándose. Por favor, inicia el servicio.
              </p>
              <Alert className="mb-4">
                <AlertDescription>
                  Ejecuta el comando: <code className="bg-gray-100 px-2 py-1 rounded">cd whatsapp-service && node index.js</code>
                </AlertDescription>
              </Alert>
              <Button onClick={checkServiceStatus} className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Reintentar Conexión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Función para conectar el bot de Telegram
  const connectTelegramBot = async () => {
    if (!telegramBotToken.trim()) {
      alert('Por favor ingresa el token del bot de Telegram');
      return;
    }

    try {
      setLoading(true);
      setTelegramBotStatus('Conectando...');
      addTelegramLog('Iniciando conexión del bot...', 'info');

      // Configurar el bot en el servidor backend
      const response = await fetch('http://localhost:3003/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botToken: telegramBotToken,
          openaiKey: openaiApiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botInfo = data.botInfo;
        
        // Guardar configuración localmente
        const botConfig = {
          token: telegramBotToken,
          openaiKey: openaiApiKey,
          botInfo: botInfo,
          connected: true,
          connectedAt: new Date().toISOString()
        };
        
        localStorage.setItem('telegramBotConfig', JSON.stringify(botConfig));
        
        // Actualizar estados
        setTelegramBotConnected(true);
        setTelegramBotStatus('Conectado');
        setTelegramBotInfo(botInfo);
        
        addTelegramLog(`Bot conectado: ${botInfo.first_name} (@${botInfo.username})`, 'success');
        addTelegramLog('Webhook configurado automáticamente', 'success');
        addTelegramLog('Sistema listo para procesar imágenes', 'success');
        
        // Iniciar polling de estadísticas
        startStatsPolling();
        
        alert(`¡Bot conectado exitosamente! 🎉\n\nBot: ${botInfo.first_name} (@${botInfo.username})\n\nAhora los usuarios pueden enviar imágenes de ejercicios a tu bot y recibirán soluciones automáticas usando GPT-4 Vision.`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error del servidor');
      }
    } catch (error) {
      console.error('Error conectando bot:', error);
      addTelegramLog(`Error: ${error.message}`, 'error');
      alert('Error conectando el bot: ' + error.message);
      setTelegramBotStatus('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  // Función para desconectar el bot
  const disconnectTelegramBot = () => {
    if (confirm('¿Estás seguro de desconectar el bot de Telegram?')) {
      localStorage.removeItem('telegramBotConfig');
      setTelegramBotConnected(false);
      setTelegramBotStatus('Desconectado');
      setTelegramBotInfo(null);
      setTelegramBotToken('');
      setTelegramMessages(0);
      setTelegramExercises(0);
      addTelegramLog('Bot desconectado', 'info');
      
      // Detener polling de estadísticas
      if (telegramStatsIntervalRef.current) {
        clearInterval(telegramStatsIntervalRef.current);
        telegramStatsIntervalRef.current = null;
      }
    }
  };

  // Función para obtener estadísticas del servidor
  const updateTelegramStats = async () => {
    try {
      const response = await fetch('http://localhost:3003/stats');
      if (response.ok) {
        const stats = await response.json();
        setTelegramMessages(stats.totalMessages);
        setTelegramExercises(stats.exercisesSolved);
        
        // Actualizar chats y mensajes si están disponibles
        if (stats.recentChats) {
          setTelegramChats(stats.recentChats);
        }
        if (stats.recentMessages) {
          setTelegramChatMessages(stats.recentMessages);
        }
      }
    } catch (error) {
      console.warn('Error obteniendo estadísticas:', error);
    }
  };

  // Función para iniciar polling de estadísticas
  const startStatsPolling = () => {
    // Limpiar interval anterior si existe
    if (telegramStatsIntervalRef.current) {
      clearInterval(telegramStatsIntervalRef.current);
    }
    
    // NO actualizar inmediatamente para evitar problemas de hooks
    // La primera actualización se hará cuando se ejecute el interval
    
    // Actualizar cada 5 segundos
    telegramStatsIntervalRef.current = setInterval(updateTelegramStats, 5000);
    
    // Hacer la primera actualización después de 1 segundo para evitar problemas de orden de hooks
    setTimeout(updateTelegramStats, 1000);
  };

  // Función para agregar logs
  const addTelegramLog = (message: string, type: 'info' | 'success' | 'error') => {
    const log = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setTelegramLogs(prev => [...prev.slice(-9), log]); // Mantener solo últimos 10 logs
  };

  // TEMPORALMENTE DESHABILITADO - Cargar configuración del bot al inicializar
  /*
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('telegramBotConfig');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.connected && config.token) {
          // Configurar estado sin llamar funciones adicionales
          setTelegramBotToken(config.token);
          if (config.openaiKey) {
            setOpenaiApiKey(config.openaiKey);
          }
          setTelegramBotConnected(true);
          setTelegramBotStatus('Conectado');
          setTelegramBotInfo(config.botInfo);
          
          // NO llamar funciones que puedan modificar estado durante el render inicial
          // startStatsPolling();
        }
      }
    } catch (error) {
      console.error('Error cargando configuración del bot:', error);
    }
    
    // Limpiar interval al desmontar componente
    return () => {
      if (telegramStatsIntervalRef.current) {
        clearInterval(telegramStatsIntervalRef.current);
      }
    };
  }, []); // Mantener dependencias vacías

  // useEffect separado para inicializar funciones después del montaje
  useEffect(() => {
    if (telegramBotConnected) {
      // Iniciar polling después de que el componente esté montado
      const timer = setTimeout(() => {
        startStatsPolling();
        addTelegramLog('Bot reconectado desde configuración guardada', 'success');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [telegramBotConnected]);
  */

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">WhatsApp Business</h1>
              <p className="text-sm text-gray-500">
                Sistema avanzado de automatización - {instances.filter(i => i.status === 'connected').length} instancias activas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600">
              Servicio Online
            </Badge>
            <Badge 
              variant="outline" 
              className={isConnected ? "text-green-600" : "text-red-600"}
            >
              {isConnected ? "🔌 WebSocket Conectado" : "❌ WebSocket Desconectado"}
            </Badge>
            <Button
              onClick={createInstance}
              disabled={instances.length >= 3 || loading}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Instancia ({instances.length}/3)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowCostDialog(true)}
              className="flex items-center gap-2"
            >
              💰 ${aiUsageStats.totalCost.toFixed(2)}
            </Button>
            
            <Button variant="outline" onClick={loadInstances}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panel de Diagnóstico Rápido */}
      <div className="bg-blue-50 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1 rounded">
              <Settings className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-900">Diagnóstico IA & WhatsApp</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const activeAgents = aiAgents.filter(a => a.active && a.working && a.apiKey);
                if (activeAgents.length === 0) {
                  alert('❌ No hay agentes activos. Primero crea y prueba un agente.');
                  return;
                }
                
                const testMessage = {
                  text: 'Hola, esto es una prueba',
                  fromNumber: '+1234567890',
                  instanceId: selectedInstance,
                  isFromMe: false,
                  timestamp: new Date().toISOString()
                };
                
                console.log('🧪 === PRUEBA MANUAL DE RESPUESTA AUTOMÁTICA ===');
                await handleAutoResponse(testMessage);
                console.log('🧪 === FIN PRUEBA MANUAL ===');
              }}
              className="text-xs"
            >
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log('🔍 === DIAGNÓSTICO COMPLETO ===');
                console.log('📱 Instancia seleccionada:', selectedInstance);
                console.log('🔌 WebSocket conectado:', isConnected);
                console.log('🤖 Total agentes:', aiAgents.length);
                console.log('✅ Agentes activos:', aiAgents.filter(a => a.active).length);
                console.log('⚡ Agentes funcionando:', aiAgents.filter(a => a.working === true).length);
                console.log('🔑 Agentes con API key:', aiAgents.filter(a => a.apiKey).length);
                console.log('🎯 Agentes listos:', aiAgents.filter(a => a.active && a.working && a.apiKey).length);
                
                if (aiAgents.length > 0) {
                  console.log('📋 Detalle de agentes:');
                  aiAgents.forEach((agent, i) => {
                    console.log(`  ${i+1}. "${agent.name}":`, {
                      activo: agent.active,
                      funcionando: agent.working,
                      proveedor: agent.provider,
                      tieneApiKey: !!agent.apiKey,
                      documentos: agent.selectedDocuments?.length || 0
                    });
                  });
                }
                
                alert('🔍 Diagnóstico completado. Revisa la consola del navegador (F12)');
              }}
              className="text-xs"
            >
              🔍 Diagnóstico Completo
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  console.log('🌐 === PRUEBA DE CONECTIVIDAD ===');
                  
                  // Probar servicio WhatsApp
                  const whatsappTest = await fetch(`${WHATSAPP_API_URL}/status`);
                  console.log('📱 WhatsApp Service:', whatsappTest.ok ? '✅ OK' : '❌ Error');
                  
                  // Probar WebSocket
                  console.log('🔌 WebSocket:', isConnected ? '✅ Conectado' : '❌ Desconectado');
                  
                  // Probar agentes
                  const activeAgents = aiAgents.filter(a => a.active && a.working && a.apiKey);
                  console.log('🤖 Agentes listos:', activeAgents.length);
                  
                  if (activeAgents.length > 0) {
                    const agent = activeAgents[0];
                    console.log('🧠 Probando IA con agente:', agent.name);
                    
                    const response = await generateAIResponseWithContext(
                      'Hola, responde con "IA funcionando correctamente"',
                      agent.id,
                      []
                    );
                    
                    console.log('💬 Respuesta IA:', response);
                  }
                  
                  alert('🌐 Prueba de conectividad completada. Revisa la consola (F12)');
                } catch (error) {
                  console.error('❌ Error en prueba de conectividad:', error);
                  alert('❌ Error en la prueba. Revisa la consola (F12)');
                }
              }}
              className="text-xs"
            >
              🌐 Test Conectividad
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                console.log('� === DIAGNÓSTICO DE DOCUMENTOS ===');
                
                // Verificar agentes
                const activeAgents = aiAgents.filter(a => a.active && a.working && a.apiKey);
                console.log('🤖 Agentes activos:', activeAgents.length);
                
                if (activeAgents.length > 0) {
                  const agent = activeAgents[0];
                  console.log('📋 Agente seleccionado:', agent.name);
                  console.log('📄 Documentos del agente:', agent.selectedDocuments);
                  
                  // Verificar localStorage también
                  try {
                    const savedAgents = localStorage.getItem('aiAgents');
                    if (savedAgents) {
                      const localAgents = JSON.parse(savedAgents);
                      const localAgent = localAgents.find(a => a.id === agent.id);
                      console.log('💾 Documentos en localStorage:', localAgent?.selectedDocuments);
                    }
                  } catch (e) {
                    console.log('❌ Error verificando localStorage');
                  }
                }
                
                // Verificar documentos disponibles
                console.log('📚 Total documentos cargados:', aiDocuments.length);
                if (aiDocuments.length > 0) {
                  console.log('📋 Lista completa de documentos:');
                  aiDocuments.forEach((doc, i) => {
                    console.log(`  ${i+1}. "${doc.name}" (ID: ${doc.id})`);
                    console.log(`     Contenido: ${doc.content ? doc.content.length + ' caracteres' : 'Sin contenido'}`);
                  });
                  
                  // Buscar específicamente el documento "taller"
                  const tallerDoc = aiDocuments.find(doc => 
                    doc.name.toLowerCase().includes('taller') ||
                    doc.content?.toLowerCase().includes('taller')
                  );
                  
                  if (tallerDoc) {
                    console.log('🎯 ¡DOCUMENTO TALLER ENCONTRADO!');
                    console.log('📄 Nombre:', tallerDoc.name);
                    console.log('📄 ID:', tallerDoc.id);
                    console.log('📄 Contenido preview:', tallerDoc.content?.slice(0, 300) + '...');
                  } else {
                    console.log('❌ Documento "taller" NO encontrado');
                  }
                } else {
                  console.log('❌ No hay documentos cargados');
                }
                
                alert('📄 Diagnóstico de documentos completado. Revisa la consola (F12)');
              }}
              className="text-xs"
            >
              📄 Debug Documentos
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                console.log('�📱 === PRUEBA DIRECTA SERVIDOR WHATSAPP ===');
                
                try {
                  console.log('🔍 Probando conectividad a:', WHATSAPP_API_URL);
                  
                  // Probar endpoint de status
                  const statusResponse = await fetch(`${WHATSAPP_API_URL}/status`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  console.log('📊 Status del servidor:', statusResponse.status);
                  const statusData = await statusResponse.text();
                  console.log('📄 Respuesta del servidor:', statusData);
                  
                  if (statusResponse.ok) {
                    console.log('✅ Servidor WhatsApp está ONLINE');
                    
                    // Probar envío de mensaje de prueba
                    if (selectedInstance) {
                      console.log('📤 Probando envío de mensaje...');
                      
                      const testMessage = {
                        instanceId: selectedInstance,
                        phoneNumber: '+1234567890', // Número de prueba
                        message: '🧪 Mensaje de prueba desde diagnóstico'
                      };
                      
                      const sendResponse = await fetch(`${WHATSAPP_API_URL}/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(testMessage)
                      });
                      
                      console.log('📤 Status envío:', sendResponse.status);
                      const sendData = await sendResponse.text();
                      console.log('📄 Respuesta envío:', sendData);
                      
                      if (sendResponse.ok) {
                        console.log('✅ Envío de mensajes FUNCIONANDO');
                      } else {
                        console.log('❌ Error en envío de mensajes');
                      }
                    } else {
                      console.log('⚠️ No hay instancia seleccionada para probar envío');
                    }
                    
                  } else {
                    console.log('❌ Servidor WhatsApp NO responde correctamente');
                  }
                  
                } catch (error) {
                  console.error('💥 ERROR conectando al servidor WhatsApp:', error);
                  console.error('🔧 Servidor probablemente OFFLINE en puerto 3001');
                  
                  if (error.name === 'TypeError') {
                    console.error('🌐 Error de red - verifica que el servidor esté ejecutándose');
                  }
                }
                
                alert('📱 Prueba del servidor completada. Revisa la consola (F12)');
              }}
              className="text-xs"
            >
              📱 Test Servidor WhatsApp
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Instance Management */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900 mb-3">Instancias WhatsApp</h2>
            
            <div className="space-y-2">
              {instances.map((instance) => (
                <div
                  key={instance.instanceId}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedInstance === instance.instanceId
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedInstance(instance.instanceId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-sm">
                        {instance.phoneNumber || instance.instanceId.slice(-8)}
                      </span>
                    </div>
                    {getStatusBadge(instance.status)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {instance.status === 'qr_ready' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          getQRCode(instance.instanceId);
                        }}
                      >
                        <QrCode className="w-3 h-3 mr-1" />
                        Ver QR
                      </Button>
                    )}
                    
                    {instance.status === 'connected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectInstance(instance.instanceId);
                        }}
                      >
                        <WifiOff className="w-3 h-3 mr-1" />
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facebook Instances Section */}
          <div className="p-4 border-b bg-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook Messenger
              </h2>
              <Button
                size="sm"
                onClick={() => setShowFacebookLoginDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-3 h-3 mr-1" />
                Conectar
              </Button>
            </div>
            
            <div className="space-y-2">
              {facebookInstances.map((instance) => (
                <div
                  key={instance.instanceId}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFacebookInstance === instance.instanceId
                      ? 'bg-blue-100 border-blue-300'
                      : 'bg-white hover:bg-blue-50'
                  }`}
                  onClick={() => setSelectedFacebookInstance(instance.instanceId)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{instance.instanceId}</p>
                      {instance.username && (
                        <p className="text-xs text-gray-600">{instance.username}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getFacebookStatusBadge(instance.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectFacebookInstance(instance.instanceId);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {facebookInstances.length === 0 && (
                <div className="text-center py-4">
                  <Facebook className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-600 text-sm">No hay instancias de Facebook</p>
                  <p className="text-xs text-gray-600">Conecta tu cuenta para empezar</p>
                </div>
              )}
            </div>
          </div>

          {/* Facebook Chat List */}
          {selectedFacebookInstance && (
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook Chats ({facebookChats.length})
              </h3>
            </div>
          )}

          {/* Combined Chat List */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">
                {unifiedChatsView ? 'Todos los Chats' : 'WhatsApp Chats'} 
                ({unifiedChatsView ? createUnifiedChats().length : chats.length})
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="unified-view" className="text-sm">
                  Vista Unificada
                </Label>
                <Switch
                  id="unified-view"
                  checked={unifiedChatsView}
                  onCheckedChange={setUnifiedChatsView}
                />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {unifiedChatsView ? (
                /* Vista Unificada */
                <>
                  {createUnifiedChats().map((unifiedChat) => {
                    const IconComponent = getUnifiedChatIcon(unifiedChat.platform);
                    const isSelected = unifiedChat.platform === 'whatsapp' 
                      ? selectedChat?.id === unifiedChat.originalChat.id
                      : selectedFacebookChat?.id === unifiedChat.originalChat.id;
                    
                    return (
                      <div
                        key={unifiedChat.id}
                        className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                          isSelected
                            ? unifiedChat.platform === 'whatsapp' 
                              ? 'bg-green-50 border-green-200 border'
                              : 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => selectUnifiedChat(unifiedChat)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              unifiedChat.platform === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                            }`}>
                              <IconComponent className={`w-4 h-4 ${
                                unifiedChat.platform === 'whatsapp' ? 'text-green-600' : 'text-blue-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm text-gray-900 truncate">
                                  {unifiedChat.contact_name || unifiedChat.identifier}
                                </p>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getUnifiedChatBadgeColor(unifiedChat.platform)}`}
                                >
                                  {unifiedChat.platform === 'whatsapp' ? 'WA' : 'FB'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {unifiedChat.last_message}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {formatTime(unifiedChat.last_message_time)}
                            </p>
                            {unifiedChat.unread_count > 0 && (
                              <Badge 
                                variant="default" 
                                className={`text-xs ${getUnifiedChatBadgeColor(unifiedChat.platform)}`}
                              >
                                {unifiedChat.unread_count}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {createUnifiedChats().length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No hay chats disponibles</p>
                      <p className="text-xs text-gray-400">Conecta WhatsApp o Facebook para ver conversaciones</p>
                    </div>
                  )}
                </>
              ) : (
                /* Vista Separada */
                <>
                  {/* WhatsApp Chats */}
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                        selectedChat?.id === chat.id
                          ? 'bg-green-50 border-green-200 border'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectChat(chat)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Phone className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {chat.contact_name || chat.phone_number}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {chat.last_message}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatTime(chat.last_message_time)}
                          </p>
                          {chat.unread_count > 0 && (
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                              {chat.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {chats.length === 0 && selectedInstance && (
                    <div className="text-center py-8">
                      <MessageCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No hay chats de WhatsApp disponibles</p>
                    </div>
                  )}

                  {/* Facebook Chats */}
                  {selectedFacebookInstance && facebookChats.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium text-sm text-blue-600 mb-2 flex items-center gap-2">
                        <Facebook className="w-3 h-3" />
                        Facebook Chats
                      </h4>
                    </div>
                  )}
                  
                  {selectedFacebookInstance && facebookChats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                        selectedFacebookChat?.id === chat.id
                          ? 'bg-blue-50 border-blue-200 border'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => selectFacebookChat(chat)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Facebook className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {chat.contact_name || chat.chat_id}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {chat.last_message}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatTime(chat.last_message_time)}
                          </p>
                          {chat.unread_count > 0 && (
                            <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                              {chat.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {selectedFacebookInstance && facebookChats.length === 0 && (
                    <div className="text-center py-8">
                      <Facebook className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No hay chats de Facebook disponibles</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-7 mx-4 mt-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="telegram" className="flex items-center gap-2">
                <TelegramIcon className="w-4 h-4" />
                Telegram
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Automatización
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Avanzada IA
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Campañas
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analíticas
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-4 mt-0">
              {(selectedChat || selectedFacebookChat) ? (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {selectedChat ? (
                          <>
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Phone className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {selectedChat.contact_name || selectedChat.phone_number}
                                </CardTitle>
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  WhatsApp
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                {selectedChat.phone_number}
                              </p>
                            </div>
                          </>
                        ) : selectedFacebookChat ? (
                          <>
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Facebook className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                  {selectedFacebookChat.contact_name || selectedFacebookChat.chat_id}
                                </CardTitle>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                  Facebook Messenger
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-500">
                                {selectedFacebookChat.chat_id}
                              </p>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="flex flex-col space-y-4">
                        {selectedChat ? (
                          /* Mensajes de WhatsApp */
                          messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex w-full ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.is_from_me
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.message_text}
                                </p>
                                <p className={`text-xs mt-1 ${
                                  message.is_from_me ? 'text-green-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : selectedFacebookChat ? (
                          /* Mensajes de Facebook */
                          facebookMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex w-full ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.is_from_me
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                {!message.is_from_me && message.sender_name && (
                                  <p className="text-xs font-medium text-blue-600 mb-1">
                                    {message.sender_name}
                                  </p>
                                )}
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.message_text}
                                </p>
                                <p className={`text-xs mt-1 ${
                                  message.is_from_me ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {formatTime(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : null}
                        <div ref={selectedChat ? messagesEndRef : facebookMessagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        {selectedChat ? (
                          <>
                            <Input
                              placeholder="Escribe un mensaje de WhatsApp..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                              className="flex-1"
                            />
                            <Button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-green-600 hover:bg-green-700">
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        ) : selectedFacebookChat ? (
                          <>
                            <Input
                              placeholder="Escribe un mensaje de Facebook..."
                              value={newFacebookMessage}
                              onChange={(e) => setNewFacebookMessage(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendFacebookMessage()}
                              className="flex-1"
                            />
                            <Button onClick={sendFacebookMessage} disabled={!newFacebookMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
                              <Send className="w-4 h-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Selecciona un chat
                    </h3>
                    <p className="text-gray-500">
                      Elige una conversación de WhatsApp o Facebook Messenger para comenzar a chatear
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        <Phone className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Badge>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">
                        <Facebook className="w-3 h-3 mr-1" />
                        Facebook
                      </Badge>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Facebook Messenger Tab */}
            <TabsContent value="facebook" className="flex-1 flex flex-col m-4 mt-0">
              {selectedFacebookChat ? (
                <div className="flex-1 flex">
                  {/* Facebook Chat List */}
                  <div className="w-80 border-r border-gray-200 bg-white rounded-l-lg overflow-hidden">
                    <div className="p-4 border-b bg-blue-50">
                      <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Facebook className="w-5 h-5 text-blue-600" />
                        Facebook Chats
                      </h3>
                      {selectedFacebookInstance && (
                        <p className="text-sm text-gray-600 mt-1">
                          Instancia: {selectedFacebookInstance}
                        </p>
                      )}
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-2 space-y-1">
                        {facebookChats.map((chat) => (
                          <div
                            key={chat.id}
                            onClick={() => selectFacebookChat(chat)}
                            className={`p-3 rounded-md cursor-pointer transition-all duration-200 ${
                              selectedFacebookChat?.id === chat.id
                                ? 'bg-blue-100 border border-blue-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm truncate">
                                    {chat.contact_name || chat.chat_id}
                                  </h4>
                                  {chat.unread_count > 0 && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                      {chat.unread_count}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {chat.last_message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatTime(chat.last_message_time)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Facebook Message Area */}
                  <div className="flex-1 flex flex-col bg-white rounded-r-lg overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b bg-blue-50 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <Facebook className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {selectedFacebookChat.contact_name || selectedFacebookChat.chat_id}
                        </h3>
                        <p className="text-xs text-gray-600">Facebook Messenger</p>
                      </div>
                    </div>

                    {/* Messages Area */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4 mb-4">
                        {facebookMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg shadow-sm ${
                                message.is_from_me
                                  ? 'bg-blue-600 text-white ml-auto'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {!message.is_from_me && message.sender_name && (
                                <p className="text-xs font-medium text-gray-600 mb-1">
                                  {message.sender_name}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.message_text}
                              </p>
                              <p className={`text-xs mt-1 ${
                                message.is_from_me ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={facebookMessagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="p-4 border-t bg-gray-50">
                      <div className="flex gap-2">
                        <Input
                          value={newFacebookMessage}
                          onChange={(e) => setNewFacebookMessage(e.target.value)}
                          placeholder="Escribe tu mensaje..."
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendFacebookMessage();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button 
                          onClick={sendFacebookMessage}
                          disabled={!newFacebookMessage.trim()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Facebook className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Selecciona un chat de Facebook
                    </h3>
                    <p className="text-gray-500">
                      Elige una conversación para comenzar a chatear en Facebook Messenger
                    </p>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Pestaña de Automatización Básica */}
            <TabsContent value="automation" className="flex-1 m-4 mt-0">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Bot className="w-6 h-6 text-blue-600" />
                      Automatización Simple
                    </h2>
                    <p className="text-gray-600">
                      Crea respuestas automáticas simples sin IA
                    </p>
                  </div>
                  <Button onClick={() => setShowBasicFlowDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Flujo
                  </Button>
                </div>

                {/* Lista de flujos básicos */}
                <div className="grid gap-4">
                  {basicFlows.map((flow) => (
                    <Card key={flow.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-lg">{flow.name}</CardTitle>
                              <Badge variant={flow.is_active ? "default" : "secondary"}>
                                {flow.is_active ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm">{flow.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Llenar el formulario con los datos del flujo para editarlo
                                const triggers = JSON.parse(flow.trigger_keywords || '[]');
                                const steps = JSON.parse(flow.steps || '[]');
                                const responses = steps.map((step: any) => step.content || '');
                                
                                setBasicFlowForm({
                                  name: flow.name,
                                  description: flow.description,
                                  triggers: triggers.length > 0 ? triggers : [''],
                                  responses: responses.length > 0 ? responses : [''],
                                  delay: steps[0]?.delay || 0,
                                  active: flow.is_active
                                });
                                
                                // Marcar como edición y abrir el diálogo
                                setEditingFlowId(flow.id);
                                setShowBasicFlowDialog(true);
                                
                                console.log('🔧 Editando flujo:', flow.name, 'ID:', flow.id);
                              }}
                              title="Editar flujo"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleBasicFlow(flow.id, flow.is_active)}
                              title={flow.is_active ? "Desactivar" : "Activar"}
                            >
                              {flow.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteBasicFlow(flow.id)}
                              title="Eliminar flujo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {/* Triggers */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Palabras que activan:</h4>
                            <div className="flex flex-wrap gap-1">
                              {JSON.parse(flow.trigger_keywords || '[]').map((trigger: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  "{trigger}"
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {/* Responses */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Respuestas:</h4>
                            <div className="space-y-1">
                              {JSON.parse(flow.steps || '[]').map((step: any, index: number) => (
                                <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                                  {index + 1}. {step.content}
                                  {step.delay > 0 && (
                                    <span className="text-gray-500 ml-2">(espera {step.delay}s)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {basicFlows.length === 0 && (
                    <Card>
                      <CardContent className="flex items-center justify-center h-48">
                        <div className="text-center">
                          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-600 mb-2">
                            No hay flujos configurados
                          </h3>
                          <p className="text-gray-500 mb-4">
                            Crea tu primer flujo de automatización
                          </p>
                          <Button onClick={() => setShowBasicFlowDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Crear primer flujo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Ejemplos de uso */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">💡 Ejemplos de flujos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded">
                        <h4 className="font-medium text-blue-800">Saludo</h4>
                        <p className="text-blue-600 text-xs mt-1">
                          Triggers: "hola", "buenos días"<br/>
                          Respuesta: "¡Hola! ¿En qué puedo ayudarte?"
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded">
                        <h4 className="font-medium text-green-800">Horarios</h4>
                        <p className="text-green-600 text-xs mt-1">
                          Triggers: "horario", "abierto"<br/>
                          Respuesta: "Abrimos de 9am a 6pm"
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded">
                        <h4 className="font-medium text-purple-800">Precios</h4>
                        <p className="text-purple-600 text-xs mt-1">
                          Triggers: "precio", "costo"<br/>
                          Respuesta: "Te envío nuestra lista de precios"
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Nueva pestaña de IA Avanzada */}
            <TabsContent value="advanced" className="flex-1 m-4 mt-0">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Brain className="w-6 h-6 text-blue-600" />
                      Automatización IA Avanzada
                    </h2>
                    <p className="text-gray-600">
                      Configure agentes de IA y flujos inteligentes de automatización
                    </p>
                  </div>
                  
                  {/* Indicador de estado del servidor */}
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      isConnected 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      {isConnected ? 'Servidor conectado' : 'Modo local'}
                    </div>
                    
                    {aiDocuments.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {aiDocuments.length} documentos
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tabs internos para IA */}
                <Tabs defaultValue="agents" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="agents" className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      Agentes IA
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Documentos
                    </TabsTrigger>
                    <TabsTrigger value="flows" className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Flujos Avanzados
                    </TabsTrigger>
                    <TabsTrigger value="memory" className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      Memoria IA
                    </TabsTrigger>
                  </TabsList>

                  {/* Pestaña de Agentes IA */}
                  <TabsContent value="agents" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Agentes de IA</h3>
                        <p className="text-gray-600">Configura APIs de diferentes proveedores de IA</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={testAllAgents}
                          disabled={testingAgent || aiAgents.length === 0}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          {testingAgent ? 'Probando...' : 'Probar Todos'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={debugAgentStatus}
                          className="bg-yellow-50 hover:bg-yellow-100"
                        >
                          <Activity className="w-4 h-4 mr-2" />
                          Debug
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={testAutoResponse}
                          className="bg-purple-50 hover:bg-purple-100"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Test Auto
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            console.log('🧪 === DEBUG DOCUMENTOS ===');
                            console.log('📚 Total documentos en aiDocuments:', aiDocuments.length);
                            aiDocuments.forEach((doc, i) => {
                              console.log(`📄 ${i+1}. "${doc.name}" (ID: ${doc.id})`);
                              console.log(`   Contenido: ${doc.content?.substring(0, 100)}...`);
                            });
                            
                            console.log('👥 Agentes con documentos:');
                            aiAgents.forEach(agent => {
                              console.log(`🤖 ${agent.name}: ${agent.selectedDocuments?.length || 0} documentos`);
                              if (agent.selectedDocuments?.length > 0) {
                                console.log(`   IDs: ${agent.selectedDocuments.join(', ')}`);
                              }
                            });
                            
                            alert('Revisa la consola (F12) para ver el debug de documentos');
                          }}
                          className="bg-orange-50 hover:bg-orange-100"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Debug Docs
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            console.log('🔧 === REPARANDO DOCUMENTOS PDF ===');
                            
                            const pdfDocs = aiDocuments.filter(doc => 
                              doc.name.toLowerCase().endsWith('.pdf') && 
                              doc.content?.startsWith('%PDF')
                            );
                            
                            if (pdfDocs.length === 0) {
                              alert('No hay documentos PDF que necesiten reparación');
                              return;
                            }
                            
                            console.log(`🔍 Encontrados ${pdfDocs.length} PDFs con contenido binario`);
                            
                            alert(`Se encontraron ${pdfDocs.length} PDFs que necesitan reparación. Por ahora, te recomiendo:\n\n1. Convertir el PDF a texto plano (.txt)\n2. Volver a cargar el archivo\n\nEsto dará mejor precisión para la IA.`);
                          }}
                          className="bg-yellow-50 hover:bg-yellow-100"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Reparar PDFs
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            // Crear un documento de prueba con contenido real
                            const testDocument = {
                              id: Date.now().toString(),
                              name: 'Taller_Test_Completo.txt',
                              description: 'Documento de prueba con contenido del taller',
                              type: 'txt',
                              content: `TALLER DE CAPACITACIÓN EMPRESARIAL

PREGUNTA 1: ¿Cuáles son los principios fundamentales de la gestión empresarial?
RESPUESTA: Los principios fundamentales incluyen planificación estratégica, organización eficiente, dirección efectiva y control de resultados.

PREGUNTA 2: ¿Cómo se implementa un sistema de calidad en la empresa?
RESPUESTA: Se implementa a través de definición de procesos, capacitación del personal, medición de indicadores y mejora continua.

PREGUNTA 3: ¿Qué importancia tiene la comunicación interna?
RESPUESTA: La comunicación interna es vital para la coordinación, motivación del equipo y el logro de objetivos organizacionales.

PREGUNTA 4: ¿Cuáles son las herramientas de análisis financiero más importantes?
RESPUESTA: Las principales herramientas incluyen estados financieros, ratios de liquidez, rentabilidad y endeudamiento.

PREGUNTA 5: ¿Cómo se desarrolla un plan de marketing efectivo?
RESPUESTA: Se desarrolla mediante análisis de mercado, definición de objetivos, segmentación de clientes y estrategias de promoción.`,
                              size: 1024,
                              created_at: new Date().toISOString()
                            };
                            
                            setAiDocuments(prev => [...prev, testDocument]);
                            console.log('✅ Documento de prueba creado:', testDocument);
                            alert('Documento de prueba "Taller_Test_Completo.txt" creado exitosamente.\n\nAhora puedes:\n1. Editar tu agente\n2. Seleccionar este documento\n3. Probar preguntas sobre el taller');
                          }}
                          className="bg-green-50 hover:bg-green-100"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Test Doc
                        </Button>
                        <Button onClick={() => setShowAIAgentDialog(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Nuevo Agente
                        </Button>
                      </div>
                    </div>

                    {/* Lista de agentes */}
                    <div className="grid gap-4">
                      {aiAgents.map((agent) => (
                        <Card key={agent.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-blue-600" />
                                <div>
                                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="outline">{agent.provider}</Badge>
                                {agent.active && (
                                      <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
                                        <MessageCircle className="w-3 h-3 mr-1" />
                                        WhatsApp Activo
                                      </Badge>
                                    )}
                                    {agent.working === true && (
                                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Funcionando
                                      </Badge>
                                    )}
                                    {agent.working === false && (
                                      <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Error
                                      </Badge>
                                    )}
                                    {agent.working === undefined && (
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                                        <TestTube className="w-3 h-3 mr-1" />
                                        No probado
                                      </Badge>
                                    )}
                                    {agent.selectedDocuments && agent.selectedDocuments.length > 0 && (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        <FileText className="w-3 h-3 mr-1" />
                                        {agent.selectedDocuments.length} doc{agent.selectedDocuments.length > 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => testExistingAgent(agent)}
                                  disabled={testingAgent}
                                  title="Probar conexión del agente"
                                >
                                  {testingAgent ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                  ) : (
                                    <TestTube className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={async () => {
                                    const testMessage = "Dame la pregunta 1 del taller";
                                    console.log(`🧪 === PRUEBA COMPLETA DEL AGENTE "${agent.name}" ===`);
                                    console.log('📋 Documentos del agente (selectedDocuments):', agent.selectedDocuments);
                                    console.log('� Total documentos disponibles (aiDocuments):', aiDocuments.length);
                                    console.log('📄 Lista de aiDocuments:');
                                    aiDocuments.forEach((doc, i) => {
                                      console.log(`  ${i+1}. "${doc.name}" (ID: ${doc.id}) - Contenido: ${doc.content ? doc.content.length + ' chars' : 'SIN CONTENIDO'}`);
                                    });
                                    
                                    console.log('🎯 Mensaje de prueba:', testMessage);
                                    console.log('⚙️ Llamando a generateAIResponseWithAgentObject...');
                                    
                                    const response = await generateAIResponseWithAgentObject(
                                      testMessage,
                                      agent,
                                      agent.selectedDocuments || [],
                                      'test-phone-debug'
                                    );
                                    
                                    console.log('📝 Respuesta completa del test:', response);
                                    console.log(`🧪 === FIN PRUEBA AGENTE "${agent.name}" ===`);
                                    
                                    // Mostrar resultado con más información
                                    let debugInfo = `AGENTE: ${agent.name}\n`;
                                    debugInfo += `DOCUMENTOS ASOCIADOS: ${agent.selectedDocuments?.length || 0}\n`;
                                    debugInfo += `DOCUMENTOS DISPONIBLES: ${aiDocuments.length}\n\n`;
                                    debugInfo += `PREGUNTA: ${testMessage}\n\n`;
                                    debugInfo += `RESPUESTA:\n${response}\n\n`;
                                    debugInfo += `REVISA LA CONSOLA PARA MÁS DETALLES`;
                                    
                                    alert(debugInfo);
                                  }}
                                  disabled={testingAgent}
                                  title="Probar agente con documentos (debug completo)"
                                  className="bg-green-50 hover:bg-green-100"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant={agent.active ? "default" : "outline"} 
                                  size="sm"
                                  onClick={() => toggleAgentWhatsAppIntegration(agent)}
                                  title={agent.active ? "Desactivar integración con WhatsApp" : "Activar integración con WhatsApp"}
                                >
                                  {agent.active ? (
                                    <MessageCircle className="w-4 h-4 text-white" />
                                  ) : (
                                    <MessageCircleOff className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => editAgent(agent)}
                                  title="Editar agente"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteAgent(agent.id)}
                                  title="Eliminar agente"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Modelo:</span>
                                  <span className="ml-2 font-medium">{agent.model}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Temperatura:</span>
                                  <span className="ml-2 font-medium">{agent.temperature}</span>
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500 text-sm">Prompt del Sistema:</span>
                                <p className="text-sm mt-1 bg-gray-50 p-2 rounded">
                                  {agent.systemPrompt}
                                </p>
                              </div>
                              
                              {/* Información de prueba */}
                              <div className="pt-2 border-t">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Estado:</span>
                                  <div className="flex items-center gap-2">
                                    {agent.working === true && (
                                      <span className="text-green-600 font-medium">✅ API Funcionando</span>
                                    )}
                                    {agent.working === false && (
                                      <span className="text-red-600 font-medium">❌ Error en API</span>
                                    )}
                                    {agent.working === undefined && (
                                      <span className="text-gray-500">⚪ No probado</span>
                                    )}
                                  </div>
                                </div>
                                
                                {agent.lastTested && (
                                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                    <span>Última prueba:</span>
                                    <span>{new Date(agent.lastTested).toLocaleString('es-ES')}</span>
                                  </div>
                                )}
                                
                                {!agent.lastTested && (
                                  <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                    <span>⚠️ Recomendado:</span>
                                    <span>Probar API antes de usar</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {aiAgents.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-32">
                            <div className="text-center">
                              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No hay agentes configurados</p>
                              <p className="text-sm text-gray-400">Crea tu primer agente de IA</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Panel de información para activar agentes */}
                      {aiAgents.length > 0 && (
                        <Card className="bg-blue-50 border-blue-200">
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-5 h-5 text-blue-600" />
                              <CardTitle className="text-sm text-blue-800">Activar Respuestas Automáticas</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3 text-sm">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="text-center">
                                  <div className="font-medium text-gray-700 mb-1">Paso 1</div>
                                  <div className="flex items-center justify-center mb-2">
                                    <TestTube className="w-6 h-6 text-orange-500" />
                                  </div>
                                  <p className="text-gray-600">Probar API del agente</p>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-gray-700 mb-1">Paso 2</div>
                                  <div className="flex items-center justify-center mb-2">
                                    <MessageCircle className="w-6 h-6 text-blue-500" />
                                  </div>
                                  <p className="text-gray-600">Activar integración WhatsApp</p>
                                </div>
                                <div className="text-center">
                                  <div className="font-medium text-gray-700 mb-1">Resultado</div>
                                  <div className="flex items-center justify-center mb-2">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                  </div>
                                  <p className="text-gray-600">Respuestas automáticas</p>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t border-blue-200">
                                <p className="text-blue-700 font-medium">
                                  📊 Estado actual: 
                                  <span className="ml-2">
                                    {aiAgents.filter(a => a.working === true).length} probados ✅ | 
                                    {aiAgents.filter(a => a.active === true && a.working === true).length} activos 🤖
                                  </span>
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Pestaña de Documentos de Contexto */}
                  <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Documentos de Contexto</h3>
                        <p className="text-gray-600">Sube documentos PDF, Word, imágenes y audios para entrenar la IA</p>
                      </div>
                      <Button onClick={() => setShowDocumentDialog(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Documento
                      </Button>
                    </div>

                    {/* Panel de análisis de medios */}
                    {mediaAnalysis && (
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="w-5 h-5 text-blue-600" />
                            Análisis de Medios
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {mediaAnalysis.type === 'image' && (
                            <div className="space-y-2">
                              <p><strong>Texto detectado:</strong> {mediaAnalysis.detectedText || 'No se detectó texto'}</p>
                              <p><strong>Objetos:</strong> {mediaAnalysis.objects?.join(', ') || 'Ninguno'}</p>
                              <p><strong>Preguntas sugeridas:</strong></p>
                              <ul className="list-disc list-inside ml-4">
                                {mediaAnalysis.suggestedQuestions?.map((q: string, i: number) => (
                                  <li key={i} className="text-sm">{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {mediaAnalysis.type === 'audio' && (
                            <div className="space-y-2">
                              <p><strong>Transcripción:</strong> {mediaAnalysis.transcript || 'No se pudo transcribir'}</p>
                              <p><strong>Idioma detectado:</strong> {mediaAnalysis.language || 'Desconocido'}</p>
                              <p><strong>Duración:</strong> {mediaAnalysis.duration || 'N/A'} segundos</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Subir archivo para análisis rápido */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-md flex items-center gap-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          Análisis Rápido de Medios
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">
                          Sube una imagen o audio para análisis inmediato con IA
                        </p>
                        <div className="flex gap-4">
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              id="quick-image"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) processMediaWithAI(file, 'image');
                              }}
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => document.getElementById('quick-image')?.click()}
                              disabled={processingMedia}
                            >
                              <Image className="w-4 h-4 mr-2" />
                              Analizar Imagen
                            </Button>
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="audio/*"
                              id="quick-audio"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) processMediaWithAI(file, 'audio');
                              }}
                            />
                            <Button 
                              variant="outline" 
                              onClick={() => document.getElementById('quick-audio')?.click()}
                              disabled={processingMedia}
                            >
                              <Mic className="w-4 h-4 mr-2" />
                              Analizar Audio
                            </Button>
                          </div>
                        </div>
                        {processingMedia && (
                          <p className="text-sm text-blue-600 mt-2">
                            🧠 Procesando con IA...
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Lista de documentos */}
                    <div className="grid gap-4">
                      {aiDocuments.map((doc) => (
                        <Card key={doc.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {doc.type === 'pdf' && <FileText className="w-5 h-5 text-red-600" />}
                                {doc.type === 'word' && <FileText className="w-5 h-5 text-blue-600" />}
                                {doc.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                                {doc.type === 'audio' && <Volume2 className="w-5 h-5 text-purple-600" />}
                                <div>
                                  <CardTitle className="text-md">{doc.name}</CardTitle>
                                  <p className="text-gray-600 text-sm">{doc.description || 'Sin descripción'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                  {doc.type}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteDocument(doc.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <p className="text-gray-600">
                                <strong>Subido:</strong> {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                              {doc.extractedContent && (
                                <div>
                                  <p className="text-gray-600 font-medium">Contenido extraído:</p>
                                  <p className="text-gray-700 bg-gray-50 p-2 rounded text-xs">
                                    {doc.extractedContent.substring(0, 200)}...
                                  </p>
                                </div>
                              )}
                              {doc.keywords && doc.keywords.length > 0 && (
                                <div>
                                  <p className="text-gray-600 font-medium">Palabras clave:</p>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {doc.keywords.slice(0, 10).map((keyword: string, i: number) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {aiDocuments.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-32">
                            <div className="text-center">
                              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No hay documentos cargados</p>
                              <p className="text-sm text-gray-400">Sube documentos para entrenar tu IA</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Pestaña de Flujos Avanzados */}
                  <TabsContent value="flows" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Flujos Avanzados</h3>
                        <p className="text-gray-600">Crea flujos de automatización con IA</p>
                      </div>
                      <Button onClick={() => setShowAdvancedFlowDialog(true)} disabled={aiAgents.length === 0}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Flujo
                      </Button>
                    </div>

                    {/* Lista de flujos avanzados */}
                    <div className="grid gap-4">
                      {advancedFlows.map((flow) => (
                        <Card key={flow.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{flow.name}</CardTitle>
                                <p className="text-gray-600 text-sm">{flow.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={flow.active ? "default" : "secondary"}>
                                  {flow.active ? "Activo" : "Inactivo"}
                                </Badge>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => editAdvancedFlow(flow)}
                                  title="Editar flujo"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => toggleAdvancedFlow(flow.id, flow.active)}
                                  title={flow.active ? "Desactivar" : "Activar"}
                                >
                                  {flow.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteAdvancedFlow(flow.id)}
                                  title="Eliminar flujo"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Trigger:</span>
                                <span className="ml-2 font-medium">{flow.triggerType}: {flow.triggerValue}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Agente:</span>
                                <span className="ml-2 font-medium">
                                  {aiAgents.find(a => a.id === flow.aiAgentId)?.name || 'Sin asignar'}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {advancedFlows.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-32">
                            <div className="text-center">
                              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No hay flujos avanzados</p>
                              <p className="text-sm text-gray-400">
                                {aiAgents.length === 0 ? 'Primero crea un agente de IA' : 'Crea tu primer flujo avanzado'}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  {/* Pestaña de Memoria IA */}
                  <TabsContent value="memory" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Memoria de Conversaciones</h3>
                        <p className="text-gray-600">Gestiona la memoria de conversaciones de la IA</p>
                      </div>
                      <Button
                        onClick={() => {
                          setConversationMemory({});
                          localStorage.removeItem('conversationMemory');
                        }}
                        variant="outline"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpiar Todo
                      </Button>
                    </div>

                    {/* Lista de conversaciones en memoria */}
                    <div className="grid gap-4">
                      {Object.keys(conversationMemory).length === 0 ? (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <Brain className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-medium mb-2">No hay conversaciones en memoria</h3>
                            <p className="text-gray-600">Las conversaciones con la IA aparecerán aquí automáticamente</p>
                          </CardContent>
                        </Card>
                      ) : (
                        Object.entries(conversationMemory).map(([phoneNumber, messages]) => (
                          <Card key={phoneNumber}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-lg">📱 {phoneNumber}</CardTitle>
                                  <p className="text-gray-600">{messages.length} mensajes en memoria</p>
                                </div>
                                <Button
                                  onClick={() => clearConversationMemory(phoneNumber)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-48">
                                <div className="space-y-2">
                                  {messages.map((msg, index) => (
                                    <div
                                      key={index}
                                      className={`p-2 rounded ${
                                        msg.role === 'user' 
                                          ? 'bg-blue-100 ml-8' 
                                          : 'bg-gray-100 mr-8'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        {msg.role === 'user' ? '👤 Usuario' : '🤖 IA'}
                                        <span className="text-xs text-gray-500">
                                          {new Date(msg.timestamp).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-sm">{msg.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="campaigns" className="flex-1 m-4 mt-0">
              <Card className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Campañas de Marketing
                  </h3>
                  <p className="text-gray-500">
                    Funcionalidad en desarrollo
                  </p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="flex-1 m-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Instancias Activas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Activity className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">
                          {instances.filter(i => i.status === 'connected').length}
                        </p>
                        <p className="text-xs text-gray-500">de {instances.length} total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Chats Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <MessageSquare className="w-8 h-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{chats.length}</p>
                        <p className="text-xs text-gray-500">conversaciones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Mensajes No Leídos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Bell className="w-8 h-8 text-orange-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">
                          {chats.reduce((sum, chat) => sum + chat.unread_count, 0)}
                        </p>
                        <p className="text-xs text-gray-500">pendientes</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Telegram Bot Tab */}
            <TabsContent value="telegram" className="flex-1 m-4 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configuración del Bot */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TelegramIcon className="w-5 h-5" />
                      Configuración Bot Telegram
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="telegram-token">Token del Bot</Label>
                      <Input
                        id="telegram-token"
                        placeholder="Pega aquí el token de @BotFather"
                        className="mt-1"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Obten tu token desde @BotFather en Telegram
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="openai-key">OpenAI API Key</Label>
                      <Input
                        id="openai-key"
                        type="password"
                        placeholder="sk-proj-..."
                        className="mt-1"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        disabled={loading}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Tu API key de OpenAI para GPT-4 Vision
                      </p>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={connectTelegramBot}
                      disabled={loading || telegramBotConnected}
                    >
                      <Bot className="w-4 h-4 mr-2" />
                      {loading ? 'Conectando...' : telegramBotConnected ? 'Bot Conectado' : 'Conectar Bot'}
                    </Button>

                    {telegramBotConnected && (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={disconnectTelegramBot}
                      >
                        Desconectar Bot
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Estado y Actividad */}
                <Card>
                  <CardHeader>
                    <CardTitle>Estado del Bot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Estado:</span>
                        <Badge 
                          variant="outline" 
                          className={telegramBotConnected ? "text-green-600 border-green-600" : "text-gray-600 border-gray-600"}
                        >
                          {telegramBotStatus}
                        </Badge>
                      </div>
                      
                      {telegramBotInfo && (
                        <>
                          <div className="flex items-center justify-between">
                            <span>Bot:</span>
                            <span className="font-medium text-sm">@{telegramBotInfo.username}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Nombre:</span>
                            <span className="font-medium text-sm">{telegramBotInfo.first_name}</span>
                          </div>
                        </>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span>Mensajes procesados:</span>
                        <span className="font-medium">{telegramMessages}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Ejercicios resueltos:</span>
                        <span className="font-medium">{telegramExercises}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Logs de Actividad */}
                {telegramLogs.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32 w-full">
                        <div className="space-y-1">
                          {telegramLogs.map((log, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-gray-500 font-mono text-xs">{log.time}</span>
                              <span className={`${
                                log.type === 'success' ? 'text-green-600' :
                                log.type === 'error' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {log.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Mensajes del Bot */}
                {telegramBotConnected && telegramChatMessages.length > 0 && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle>📨 Mensajes del Bot</CardTitle>
                      <CardDescription>
                        Últimos mensajes procesados por el bot
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64 w-full">
                        <div className="space-y-4">
                          {telegramChatMessages.map((msg, index) => (
                            <div key={msg.id || index} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded-r-lg">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {msg.userName?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <span className="font-medium text-sm">{msg.userName}</span>
                                  {msg.hasImage && (
                                    <Badge variant="outline" className="text-xs">
                                      <Image className="w-3 h-3 mr-1" />
                                      Imagen
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="bg-white p-2 rounded border">
                                  <p className="text-sm text-gray-800">
                                    {msg.messageText}
                                  </p>
                                </div>
                                
                                {msg.response && (
                                  <div className="bg-blue-100 p-2 rounded border-l-4 border-blue-400">
                                    <p className="text-sm text-blue-800">
                                      <Bot className="w-4 h-4 inline mr-2" />
                                      {msg.response.length > 200 
                                        ? msg.response.substring(0, 200) + '...'
                                        : msg.response
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Instrucciones */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>📚 Cómo usar el Bot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                        <div>
                          <p className="font-medium">Crear el Bot</p>
                          <p className="text-gray-600">Busca @BotFather en Telegram, envía /newbot y sigue las instrucciones</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                        <div>
                          <p className="font-medium">Configurar Token</p>
                          <p className="text-gray-600">Copia el token que te da BotFather y pégalo arriba</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                        <div>
                          <p className="font-medium">Enviar Ejercicios</p>
                          <p className="text-gray-600">Los usuarios envían fotos de ejercicios al bot y reciben la solución automática</p>
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-green-800 text-sm">
                          <CheckCircle2 className="w-4 h-4 inline mr-2" />
                          El bot resolverá automáticamente matemáticas, física, química y más usando GPT-4 Vision
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escanea el código QR</DialogTitle>
            <DialogDescription>
              Usa WhatsApp en tu teléfono para escanear este código
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {selectedQR && (
              <img 
                src={selectedQR} 
                alt="QR Code" 
                className="w-64 h-64 border rounded-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowQRDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facebook Login Dialog */}
      <Dialog open={showFacebookLoginDialog} onOpenChange={setShowFacebookLoginDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              Conectar Facebook Messenger
            </DialogTitle>
            <DialogDescription>
              Ingresa tus credenciales de Facebook para conectar Messenger
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="facebook-username">Usuario o Email</Label>
              <Input
                id="facebook-username"
                type="text"
                placeholder="tu@email.com o nombre_usuario"
                value={facebookCredentials.username}
                onChange={(e) => setFacebookCredentials(prev => ({
                  ...prev,
                  username: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook-password">Contraseña</Label>
              <Input
                id="facebook-password"
                type="password"
                placeholder="Tu contraseña de Facebook"
                value={facebookCredentials.password}
                onChange={(e) => setFacebookCredentials(prev => ({
                  ...prev,
                  password: e.target.value
                }))}
              />
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Login Automático:</strong> Tus credenciales se almacenan de forma segura y cifrada. Se usan únicamente para automatizar el acceso a Facebook Messenger.
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">¿Problemas con el login automático?</div>
              <Button 
                variant="outline"
                onClick={createFacebookInstanceManual}
                disabled={loading}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Usar Login Manual (Recomendado)
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFacebookLoginDialog(false);
                setFacebookCredentials({ username: '', password: '' });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={createFacebookInstance}
              disabled={loading || !facebookCredentials.username || !facebookCredentials.password}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Facebook className="w-4 h-4 mr-2" />
                  Login Automático
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para subir documentos */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Subir Documento de Contexto
            </DialogTitle>
            <DialogDescription>
              Sube documentos PDF, Word, imágenes o audios para entrenar tu agente de IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre del Documento</Label>
              <Input
                value={documentForm.name}
                onChange={(e) => setDocumentForm(prev => ({...prev, name: e.target.value}))}
                placeholder="Ej: Manual de productos, FAQ, Catálogo..."
              />
            </div>

            <div>
              <Label>Descripción (Opcional)</Label>
              <Textarea
                value={documentForm.description}
                onChange={(e) => setDocumentForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Describe qué información contiene este documento..."
                rows={3}
              />
            </div>

            <div>
              <Label>Tipo de Archivo</Label>
              <Select 
                value={documentForm.type} 
                onValueChange={(value: 'pdf' | 'word' | 'image' | 'audio') => 
                  setDocumentForm(prev => ({...prev, type: value}))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-600" />
                      PDF
                    </div>
                  </SelectItem>
                  <SelectItem value="word">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Word (.docx)
                    </div>
                  </SelectItem>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-green-600" />
                      Imagen (JPG, PNG)
                    </div>
                  </SelectItem>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-600" />
                      Audio (MP3, WAV)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Archivo</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {documentForm.file ? (
                  <div className="space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-green-600" />
                    <p className="text-sm font-medium">{documentForm.file.name}</p>
                    <p className="text-xs text-gray-600">
                      {(documentForm.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDocumentForm(prev => ({...prev, file: null}))}
                    >
                      Cambiar archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600">Arrastra un archivo aquí o haz clic para seleccionar</p>
                    <input
                      type="file"
                      accept={
                        documentForm.type === 'pdf' ? '.pdf' :
                        documentForm.type === 'word' ? '.docx,.doc' :
                        documentForm.type === 'image' ? '.jpg,.jpeg,.png,.webp' :
                        documentForm.type === 'audio' ? '.mp3,.wav,.m4a,.ogg' :
                        '*'
                      }
                      className="hidden"
                      id="document-file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setDocumentForm(prev => ({...prev, file}));
                        }
                      }}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('document-file')?.click()}
                    >
                      Seleccionar Archivo
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {documentForm.file && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-900 mb-2">Capacidades de IA:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {documentForm.type === 'pdf' && (
                    <>
                      <li>• Extracción de texto completo</li>
                      <li>• Identificación de secciones y títulos</li>
                      <li>• Generación de palabras clave</li>
                    </>
                  )}
                  {documentForm.type === 'word' && (
                    <>
                      <li>• Extracción de texto y formato</li>
                      <li>• Análisis de estructura del documento</li>
                      <li>• Preservación de metadatos</li>
                    </>
                  )}
                  {documentForm.type === 'image' && (
                    <>
                      <li>• Reconocimiento óptico de caracteres (OCR)</li>
                      <li>• Detección de objetos y texto</li>
                      <li>• Análisis visual con IA</li>
                    </>
                  )}
                  {documentForm.type === 'audio' && (
                    <>
                      <li>• Transcripción automática de voz</li>
                      <li>• Detección de idioma</li>
                      <li>• Análisis de sentimientos</li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDocumentDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={uploadDocument} 
              disabled={uploadingDocument || !documentForm.file || !documentForm.name.trim()}
            >
              {uploadingDocument ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Subir y Procesar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear agente IA */}
      <Dialog open={showAIAgentDialog} onOpenChange={(open) => {
        // Solo cerrar si explícitamente se hace clic en cerrar o cancelar
        // No cerrar por pérdida de foco o cambio de pestañas
        if (!open) {
          return; // No hacer nada cuando se intenta cerrar por pérdida de foco
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Configurar Agente de IA
            </DialogTitle>
            <DialogDescription>
              Configure la API de IA y el comportamiento del agente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre del Agente</Label>
              <Input
                value={aiAgentForm.name}
                onChange={(e) => setAiAgentForm({...aiAgentForm, name: e.target.value})}
                placeholder="Ej: Asistente de Ventas"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Proveedor de IA</Label>
                <Select 
                  value={aiAgentForm.provider} 
                  onValueChange={(value) => setAiAgentForm({...aiAgentForm, provider: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="custom">API Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Modelo</Label>
                <Input
                  value={aiAgentForm.model}
                  onChange={(e) => setAiAgentForm({...aiAgentForm, model: e.target.value})}
                  placeholder="gpt-3.5-turbo"
                />
              </div>
            </div>

            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={aiAgentForm.apiKey}
                onChange={(e) => setAiAgentForm({...aiAgentForm, apiKey: e.target.value})}
                placeholder="Ingresa tu API key"
              />
            </div>

            <div>
              <Label>Prompt del Sistema</Label>
              <Textarea
                value={aiAgentForm.systemPrompt}
                onChange={(e) => setAiAgentForm({...aiAgentForm, systemPrompt: e.target.value})}
                placeholder="Define el comportamiento del agente..."
                rows={4}
              />
            </div>

            {/* Selección de documentos de contexto */}
            <div>
              <Label className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Documentos de Contexto
              </Label>
              <p className="text-sm text-gray-600 mb-2">
                Selecciona documentos que el agente usará como contexto para responder
              </p>
              {aiDocuments.length > 0 ? (
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {aiDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        id={`doc-${doc.id}`}
                        className="rounded"
                        checked={aiAgentForm.selectedDocuments.includes(doc.id)}
                        onChange={(e) => {
                          const updatedDocuments = e.target.checked
                            ? [...aiAgentForm.selectedDocuments, doc.id]
                            : aiAgentForm.selectedDocuments.filter(id => id !== doc.id);
                          setAiAgentForm({...aiAgentForm, selectedDocuments: updatedDocuments});
                        }}
                      />
                      <label htmlFor={`doc-${doc.id}`} className="flex items-center gap-2 text-sm cursor-pointer">
                        {doc.type === 'pdf' && <FileText className="w-4 h-4 text-red-600" />}
                        {doc.type === 'word' && <FileText className="w-4 h-4 text-blue-600" />}
                        {doc.type === 'image' && <Image className="w-4 h-4 text-green-600" />}
                        {doc.type === 'audio' && <Volume2 className="w-4 h-4 text-purple-600" />}
                        <span>{doc.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{doc.type}</Badge>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg p-4 text-center">
                  <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">No hay documentos cargados</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => {
                      // No cerrar el diálogo del agente para no perder los datos
                      setShowDocumentDialog(true);
                    }}
                  >
                    Subir documentos primero
                  </Button>
                </div>
              )}
            </div>

            {/* Configuración avanzada de procesamiento */}
            <div>
              <Label className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Capacidades Avanzadas
              </Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="process-images"
                    checked={aiAgentForm.capabilities?.processImages !== false}
                    onChange={(e) => setAiAgentForm({
                      ...aiAgentForm, 
                      capabilities: {...aiAgentForm.capabilities, processImages: e.target.checked}
                    })}
                  />
                  <label htmlFor="process-images" className="text-sm">
                    Procesar imágenes automáticamente
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="transcribe-audio"
                    checked={aiAgentForm.capabilities?.transcribeAudio !== false}
                    onChange={(e) => setAiAgentForm({
                      ...aiAgentForm, 
                      capabilities: {...aiAgentForm.capabilities, transcribeAudio: e.target.checked}
                    })}
                  />
                  <label htmlFor="transcribe-audio" className="text-sm">
                    Transcribir audios recibidos
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="context-search"
                    checked={aiAgentForm.capabilities?.contextSearch !== false}
                    onChange={(e) => setAiAgentForm({
                      ...aiAgentForm, 
                      capabilities: {...aiAgentForm.capabilities, contextSearch: e.target.checked}
                    })}
                  />
                  <label htmlFor="context-search" className="text-sm">
                    Búsqueda en documentos
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="smart-responses"
                    checked={aiAgentForm.capabilities?.smartResponses !== false}
                    onChange={(e) => setAiAgentForm({
                      ...aiAgentForm, 
                      capabilities: {...aiAgentForm.capabilities, smartResponses: e.target.checked}
                    })}
                  />
                  <label htmlFor="smart-responses" className="text-sm">
                    Respuestas inteligentes
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temperatura ({aiAgentForm.temperature})</Label>
                <Input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiAgentForm.temperature}
                  onChange={(e) => setAiAgentForm({...aiAgentForm, temperature: parseFloat(e.target.value)})}
                />
              </div>

              <div>
                <Label>Máx. Tokens</Label>
                <Input
                  type="number"
                  value={aiAgentForm.maxTokens}
                  onChange={(e) => setAiAgentForm({...aiAgentForm, maxTokens: parseInt(e.target.value)})}
                  min="1"
                  max="4000"
                />
              </div>
            </div>

            {testResult && (
              <Alert className={testResult.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className="whitespace-pre-line text-sm">
                  {testResult}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={testAIAgent}
              disabled={!aiAgentForm.apiKey.trim() || testingAgent}
              className="flex items-center gap-2"
            >
              <TestTube className="w-4 h-4" />
              {testingAgent ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                  Probando API...
                </>
              ) : (
                'Probar API & Integración'
              )}
            </Button>
            <Button variant="outline" onClick={closeAIAgentDialog}>
              Cancelar
            </Button>
            <Button onClick={createAIAgent}>
              <Save className="w-4 h-4 mr-2" />
              Guardar Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear flujo avanzado */}
      <Dialog open={showAdvancedFlowDialog} onOpenChange={setShowAdvancedFlowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Crear Flujo Avanzado
            </DialogTitle>
            <DialogDescription>
              Configure un flujo de automatización con IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre del Flujo</Label>
              <Input
                value={advancedFlowForm.name}
                onChange={(e) => setAdvancedFlowForm({...advancedFlowForm, name: e.target.value})}
                placeholder="Ej: Consultas de Productos"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={advancedFlowForm.description}
                onChange={(e) => setAdvancedFlowForm({...advancedFlowForm, description: e.target.value})}
                placeholder="Describe qué hace este flujo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Activador</Label>
                <Select 
                  value={advancedFlowForm.triggerType} 
                  onValueChange={(value) => setAdvancedFlowForm({...advancedFlowForm, triggerType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palabra Clave</SelectItem>
                    <SelectItem value="intent">Intención (IA)</SelectItem>
                    <SelectItem value="pattern">Patrón de Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Valor del Activador</Label>
                <Input
                  value={advancedFlowForm.triggerValue}
                  onChange={(e) => setAdvancedFlowForm({...advancedFlowForm, triggerValue: e.target.value})}
                  placeholder={advancedFlowForm.triggerType === 'keyword' ? 'precio, producto' : 
                             advancedFlowForm.triggerType === 'intent' ? 'consulta_precio' : '.*precio.*'}
                />
              </div>

              <div>
                <Label>Agente de IA</Label>
                <Select 
                  value={advancedFlowForm.aiAgentId} 
                  onValueChange={(value) => setAdvancedFlowForm({...advancedFlowForm, aiAgentId: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {aiAgents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Configuración del Flujo</h4>
              <p className="text-sm text-gray-600">
                Este flujo se activará cuando detecte "{advancedFlowForm.triggerValue}" 
                y procesará la respuesta con el agente de IA seleccionado.
              </p>
            </div>

            {/* Sección de Documentos/Imágenes del Flujo */}
            <div className="border border-dashed border-gray-300 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                📚 Documentos de Contexto (Opcional)
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  PRIORIDAD MÁXIMA
                </span>
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Sube imágenes de exámenes, documentos PDF, o cualquier archivo. 
                La IA los leerá automáticamente y usará esa información para responder.
              </p>
              
              <div className="space-y-3">
                <Input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    setAdvancedFlowForm({
                      ...advancedFlowForm,
                      flowDocuments: [...advancedFlowForm.flowDocuments, ...files]
                    });
                  }}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                
                {advancedFlowForm.flowDocuments.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-green-600">
                      📁 Archivos seleccionados ({advancedFlowForm.flowDocuments.length}):
                    </div>
                    {advancedFlowForm.flowDocuments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {file.type.startsWith('image/') ? '🖼️' : '📄'}
                          </span>
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({Math.round(file.size / 1024)}KB)
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const newFiles = [...advancedFlowForm.flowDocuments];
                            newFiles.splice(index, 1);
                            setAdvancedFlowForm({...advancedFlowForm, flowDocuments: newFiles});
                          }}
                        >
                          ❌
                        </Button>
                      </div>
                    ))}
                    
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      💡 <strong>Importante:</strong> Estos archivos se procesarán automáticamente con IA 
                      y tendrán prioridad máxima para responder consultas relacionadas.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvancedFlowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                // Guardar flujo avanzado
                const success = await saveAdvancedFlow({
                  ...advancedFlowForm,
                  active: true
                });
                
                if (success) {
                  setShowAdvancedFlowDialog(false);
                  setAdvancedFlowForm({
                    name: '',
                    description: '',
                    triggerType: 'keyword',
                    triggerValue: '',
                    aiAgentId: '',
                    steps: [],
                    flowDocuments: []
                  });
                }
              }}
              disabled={!advancedFlowForm.name || !advancedFlowForm.triggerValue || !advancedFlowForm.aiAgentId}
            >
              <Save className="w-4 h-4 mr-2" />
              Crear Flujo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear/editar flujo básico */}
      <Dialog open={showBasicFlowDialog} onOpenChange={(open) => {
        setShowBasicFlowDialog(open);
        if (!open) {
          // Limpiar formulario y estado de edición cuando se cierra
          setBasicFlowForm({
            name: '',
            description: '',
            triggers: [''],
            responses: [''],
            delay: 0,
            active: true
          });
          setEditingFlowId(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              {editingFlowId ? 'Editar Flujo de Automatización' : 'Crear Flujo de Automatización Simple'}
            </DialogTitle>
            <DialogDescription>
              {editingFlowId 
                ? 'Modifica la configuración del flujo de automatización' 
                : 'Configure respuestas automáticas simples que se activan por palabras clave'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Nombre del Flujo</Label>
                <Input
                  value={basicFlowForm.name}
                  onChange={(e) => setBasicFlowForm({...basicFlowForm, name: e.target.value})}
                  placeholder="Ej: Saludo de Bienvenida"
                />
              </div>
              
              <div>
                <Label>Descripción</Label>
                <Input
                  value={basicFlowForm.description}
                  onChange={(e) => setBasicFlowForm({...basicFlowForm, description: e.target.value})}
                  placeholder="Describe qué hace este flujo"
                />
              </div>
            </div>

            {/* Palabras que activan */}
            <div>
              <Label className="flex items-center gap-2">
                🔍 Palabras que Activan el Flujo
                <span className="text-xs text-gray-500">(Una por línea)</span>
              </Label>
              <div className="space-y-2">
                {basicFlowForm.triggers.map((trigger, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={trigger}
                      onChange={(e) => {
                        const newTriggers = [...basicFlowForm.triggers];
                        newTriggers[index] = e.target.value;
                        setBasicFlowForm({...basicFlowForm, triggers: newTriggers});
                      }}
                      placeholder="Ej: hola, buenos días, hey"
                    />
                    {basicFlowForm.triggers.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newTriggers = basicFlowForm.triggers.filter((_, i) => i !== index);
                          setBasicFlowForm({...basicFlowForm, triggers: newTriggers});
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBasicFlowForm({
                      ...basicFlowForm,
                      triggers: [...basicFlowForm.triggers, '']
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Palabra
                </Button>
              </div>
            </div>

            {/* Respuestas */}
            <div>
              <Label className="flex items-center gap-2">
                💬 Respuestas Automáticas
                <span className="text-xs text-gray-500">(Se envían en orden)</span>
              </Label>
              <div className="space-y-2">
                {basicFlowForm.responses.map((response, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Textarea
                        value={response}
                        onChange={(e) => {
                          const newResponses = [...basicFlowForm.responses];
                          newResponses[index] = e.target.value;
                          setBasicFlowForm({...basicFlowForm, responses: newResponses});
                        }}
                        placeholder={`Respuesta ${index + 1}: Ej: ¡Hola! ¿En qué puedo ayudarte?`}
                        rows={2}
                      />
                    </div>
                    {basicFlowForm.responses.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newResponses = basicFlowForm.responses.filter((_, i) => i !== index);
                          setBasicFlowForm({...basicFlowForm, responses: newResponses});
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBasicFlowForm({
                      ...basicFlowForm,
                      responses: [...basicFlowForm.responses, '']
                    });
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Respuesta
                </Button>
              </div>
            </div>

            {/* Configuraciones adicionales */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Demora entre mensajes (segundos)</Label>
                <Input
                  type="number"
                  value={basicFlowForm.delay}
                  onChange={(e) => setBasicFlowForm({...basicFlowForm, delay: parseInt(e.target.value) || 0})}
                  min="0"
                  max="60"
                  placeholder="0"
                />
                <span className="text-xs text-gray-500">
                  Tiempo de espera entre cada respuesta
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={basicFlowForm.active}
                  onCheckedChange={(checked) => setBasicFlowForm({...basicFlowForm, active: checked})}
                />
                <Label>Activar flujo inmediatamente</Label>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Vista previa del flujo:</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Cuando el usuario escriba:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {basicFlowForm.triggers.filter(t => t.trim()).map((trigger, i) => (
                      <Badge key={i} variant="outline" className="text-xs">"{trigger}"</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-600">El bot responderá:</span>
                  <div className="mt-1 space-y-1">
                    {basicFlowForm.responses.filter(r => r.trim()).map((response, i) => (
                      <div key={i} className="bg-blue-100 p-2 rounded text-xs">
                        {i + 1}. {response}
                        {i < basicFlowForm.responses.filter(r => r.trim()).length - 1 && basicFlowForm.delay > 0 && (
                          <span className="text-gray-500 ml-2">(espera {basicFlowForm.delay}s)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBasicFlowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                // Crear el flujo
                const flowToSave = {
                  name: basicFlowForm.name,
                  description: basicFlowForm.description,
                  triggers: basicFlowForm.triggers.filter(t => t.trim()),
                  responses: basicFlowForm.responses.filter(r => r.trim()),
                  delay: basicFlowForm.delay,
                  active: basicFlowForm.active
                };
                
                const success = await saveBasicFlow(flowToSave);
                if (success) {
                  setShowBasicFlowDialog(false);
                  
                  // Resetear formulario
                  setBasicFlowForm({
                    name: '',
                    description: '',
                    triggers: [''],
                    responses: [''],
                    delay: 0,
                    active: true
                  });
                }
              }}
              disabled={
                !basicFlowForm.name.trim() || 
                !basicFlowForm.triggers.some(t => t.trim()) || 
                !basicFlowForm.responses.some(r => r.trim())
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {editingFlowId ? 'Actualizar Flujo' : 'Crear Flujo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar flujo avanzado */}
      <Dialog open={showEditAdvancedFlowDialog} onOpenChange={setShowEditAdvancedFlowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Flujo Avanzado
            </DialogTitle>
            <DialogDescription>
              Modifica la configuración del flujo de automatización
            </DialogDescription>
          </DialogHeader>

          {editingAdvancedFlow && (
            <div className="space-y-4">
              {/* Nombre del flujo */}
              <div>
                <Label htmlFor="edit-flow-name">Nombre del Flujo</Label>
                <Input
                  id="edit-flow-name"
                  value={editingAdvancedFlow.name || ''}
                  onChange={(e) => setEditingAdvancedFlow(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="Ej: Respuesta automática de bienvenida"
                />
              </div>

              {/* Descripción */}
              <div>
                <Label htmlFor="edit-flow-description">Descripción</Label>
                <Textarea
                  id="edit-flow-description"
                  value={editingAdvancedFlow.description || ''}
                  onChange={(e) => setEditingAdvancedFlow(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  placeholder="Describe qué hace este flujo..."
                  rows={3}
                />
              </div>

              {/* Tipo de trigger */}
              <div>
                <Label htmlFor="edit-trigger-type">Tipo de Activación</Label>
                <Select
                  value={editingAdvancedFlow.triggerType || 'keyword'}
                  onValueChange={(value) => setEditingAdvancedFlow(prev => ({
                    ...prev,
                    triggerType: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palabra Clave</SelectItem>
                    <SelectItem value="message">Cualquier Mensaje</SelectItem>
                    <SelectItem value="first_contact">Primer Contacto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Valor del trigger */}
              {editingAdvancedFlow.triggerType === 'keyword' && (
                <div>
                  <Label htmlFor="edit-trigger-value">Palabra Clave</Label>
                  <Input
                    id="edit-trigger-value"
                    value={editingAdvancedFlow.triggerValue || ''}
                    onChange={(e) => setEditingAdvancedFlow(prev => ({
                      ...prev,
                      triggerValue: e.target.value
                    }))}
                    placeholder="Ej: hola, info, cotización"
                  />
                </div>
              )}

              {/* Agente IA */}
              <div>
                <Label htmlFor="edit-ai-agent">Agente de IA</Label>
                <Select
                  value={editingAdvancedFlow.aiAgentId || ''}
                  onValueChange={(value) => setEditingAdvancedFlow(prev => ({
                    ...prev,
                    aiAgentId: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aiAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Estado activo */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-flow-active"
                  checked={editingAdvancedFlow.active || false}
                  onCheckedChange={(checked) => setEditingAdvancedFlow(prev => ({
                    ...prev,
                    active: checked
                  }))}
                />
                <Label htmlFor="edit-flow-active">
                  Flujo activo
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditAdvancedFlowDialog(false);
                setEditingAdvancedFlow(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!editingAdvancedFlow) return;
                
                // Usar la función saveAdvancedFlow para actualizar
                const success = await saveAdvancedFlow(editingAdvancedFlow);
                
                if (success) {
                  setShowEditAdvancedFlowDialog(false);
                  setEditingAdvancedFlow(null);
                }
              }}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar agente */}
      <Dialog open={showEditAgentDialog} onOpenChange={setShowEditAgentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Editar Agente de IA
            </DialogTitle>
            <DialogDescription>
              Modifica la configuración del agente de IA
            </DialogDescription>
          </DialogHeader>

          {editingAgent && (
            <div className="space-y-4">
              {/* Nombre del agente */}
              <div>
                <Label htmlFor="edit-agent-name">Nombre del Agente</Label>
                <Input
                  id="edit-agent-name"
                  value={editingAgent.name || ''}
                  onChange={(e) => setEditingAgent(prev => ({
                    ...prev,
                    name: e.target.value
                  }))}
                  placeholder="Ej: Asistente de Ventas"
                />
              </div>

              {/* Proveedor */}
              <div>
                <Label htmlFor="edit-agent-provider">Proveedor de IA</Label>
                <Select
                  value={editingAgent.provider || 'openai'}
                  onValueChange={(value) => setEditingAgent(prev => ({
                    ...prev,
                    provider: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* API Key */}
              <div>
                <Label htmlFor="edit-agent-apikey">API Key</Label>
                <Input
                  id="edit-agent-apikey"
                  type="password"
                  value={editingAgent.apiKey || ''}
                  onChange={(e) => setEditingAgent(prev => ({
                    ...prev,
                    apiKey: e.target.value
                  }))}
                  placeholder="Ingresa tu API Key..."
                />
              </div>

              {/* Modelo */}
              <div>
                <Label htmlFor="edit-agent-model">Modelo</Label>
                <Input
                  id="edit-agent-model"
                  value={editingAgent.model || ''}
                  onChange={(e) => setEditingAgent(prev => ({
                    ...prev,
                    model: e.target.value
                  }))}
                  placeholder="Ej: gpt-3.5-turbo, claude-3-sonnet-20240229"
                />
              </div>

              {/* Prompt del Sistema */}
              <div>
                <Label htmlFor="edit-agent-prompt">Prompt del Sistema</Label>
                <Textarea
                  id="edit-agent-prompt"
                  value={editingAgent.systemPrompt || ''}
                  onChange={(e) => setEditingAgent(prev => ({
                    ...prev,
                    systemPrompt: e.target.value
                  }))}
                  placeholder="Define el comportamiento del agente..."
                  rows={4}
                />
              </div>

              {/* Configuraciones avanzadas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-agent-temperature">Temperatura</Label>
                  <Input
                    id="edit-agent-temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editingAgent.temperature || 0.7}
                    onChange={(e) => setEditingAgent(prev => ({
                      ...prev,
                      temperature: parseFloat(e.target.value)
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-agent-maxtokens">Máx. Tokens</Label>
                  <Input
                    id="edit-agent-maxtokens"
                    type="number"
                    min="50"
                    max="4000"
                    value={editingAgent.maxTokens || 300}
                    onChange={(e) => setEditingAgent(prev => ({
                      ...prev,
                      maxTokens: parseInt(e.target.value)
                    }))}
                  />
                </div>
              </div>

              {/* Documentos seleccionados */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Documentos Asociados</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await loadAIDocuments();
                        console.log('📚 Documentos refrescados:', aiDocuments.length);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refrescar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx,.txt';
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            console.log('📁 Cargando archivo:', file.name);
                            const success = await uploadDocumentFromDialog(file);
                            if (success) {
                              await loadAIDocuments(); // Recargar después de subir
                              alert(`Documento "${file.name}" cargado exitosamente`);
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Cargar
                    </Button>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto border rounded p-2">
                  {aiDocuments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay documentos disponibles. Usa el botón "Cargar" para agregar documentos.</p>
                  ) : (
                    aiDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-2 py-1">
                        <input
                          type="checkbox"
                          checked={editingAgent.selectedDocuments?.includes(doc.id) || false}
                          onChange={(e) => {
                            const currentDocs = editingAgent.selectedDocuments || [];
                            const newDocs = e.target.checked
                              ? [...currentDocs, doc.id]
                              : currentDocs.filter(id => id !== doc.id);
                            setEditingAgent(prev => ({
                              ...prev,
                              selectedDocuments: newDocs
                            }));
                          }}
                        />
                        <span className="text-sm font-medium">{doc.name}</span>
                        <span className="text-xs text-gray-500">({doc.type || 'archivo'})</span>
                      </div>
                    ))
                  )}
                </div>
                {editingAgent.selectedDocuments && editingAgent.selectedDocuments.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✅ {editingAgent.selectedDocuments.length} documento(s) seleccionado(s)
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditAgentDialog(false);
                setEditingAgent(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveEditedAgent}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Estadísticas de Costos de IA */}
      <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💰 Estadísticas de Costos de IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Resumen general */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${aiUsageStats.totalCost.toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-500">Costo Total</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {aiUsageStats.totalTokens.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Tokens Usados</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {aiUsageStats.totalRequests}
                    </div>
                    <div className="text-sm text-gray-500">Peticiones</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      ${(aiUsageStats.totalCost / Math.max(aiUsageStats.totalRequests, 1)).toFixed(4)}
                    </div>
                    <div className="text-sm text-gray-500">Costo Promedio</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Costos por proveedor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Costos por Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>OpenAI</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${aiUsageStats.costByProvider.openai.toFixed(4)}</div>
                        <div className="text-sm text-gray-500">{aiUsageStats.requestsByProvider.openai} peticiones</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Anthropic</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${aiUsageStats.costByProvider.anthropic.toFixed(4)}</div>
                        <div className="text-sm text-gray-500">{aiUsageStats.requestsByProvider.anthropic} peticiones</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Costos Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(aiUsageStats.dailyCosts)
                      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                      .slice(0, 7)
                      .map(([date, cost]) => (
                        <div key={date} className="flex justify-between text-sm">
                          <span>{new Date(date).toLocaleDateString()}</span>
                          <span className="font-medium">${cost.toFixed(4)}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historial detallado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historial Detallado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {aiUsageRecords
                    .slice()
                    .reverse()
                    .slice(0, 50)
                    .map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {record.provider.toUpperCase()} - {record.model}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(record.timestamp).toLocaleString()} 
                            {record.phone_number && ` • ${record.phone_number}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">${record.cost.toFixed(4)}</div>
                          <div className="text-xs text-gray-500">{record.tokensUsed} tokens</div>
                        </div>
                      </div>
                    ))}
                    
                  {aiUsageRecords.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No hay registros de uso de IA aún.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCostTracking}>
              🧹 Limpiar Historial
            </Button>
            <Button onClick={() => setShowCostDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppSimple;
