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
  Activity,
  Zap,
  Brain,
  TestTube,
  Save,
  Trash2,
  Edit,
  Upload,
  FileText,
  BookOpen,
  Eye,
  Download,
  Users
} from 'lucide-react';

const WHATSAPP_API_URL = 'http://localhost:3001/api/whatsapp';

// Interfaces limpias - solo WhatsApp e IA
interface WhatsAppInstance {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'error' | 'connecting' | 'qr_ready' | 'loading';
  qr?: string;
  phone?: string;
  phoneNumber?: string;
}

interface Chat {
  id: string;
  instance_id: string;
  phone_number: string;
  contact_name?: string;
  chat_type?: 'individual' | 'group';
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface Message {
  id: string;
  instance_id?: string;
  chat_id?: string;
  from_number: string;
  to_number: string;
  message_text: string;
  message_type?: string;
  timestamp: string;
  is_from_me: boolean;
  status?: string;
}

// Interfaces para IA
interface AIAgent {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  systemPrompt: string;
  isActive: boolean;
  temperature?: number;
  maxTokens?: number;
  autoRespond?: boolean;
  assignedDocuments?: string[];
}

interface AIDocument {
  id: string;
  name: string;
  content: string;
  type: 'text' | 'pdf' | 'image';
  uploadDate: string;
  size: number;
}

interface BasicFlow {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  response: string;
  is_active: boolean;
}

interface AdvancedFlow {
  id: string;
  name: string;
  description: string;
  agentId: string;
  triggers: string[];
  conditions: any[];
  actions: any[];
  is_active: boolean;
}

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

const WhatsAppIA: React.FC = () => {
  // Estados de WhatsApp
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCode, setQrCode] = useState('');

  // Cache local para mensajes por chat
  const [messagesCache, setMessagesCache] = useState<{[chatKey: string]: Message[]}>({});

  // Estados de IA
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [aiDocuments, setAiDocuments] = useState<AIDocument[]>([]);
  const [basicFlows, setBasicFlows] = useState<BasicFlow[]>([]);
  const [advancedFlows, setAdvancedFlows] = useState<AdvancedFlow[]>([]);
  const [showAIAgentDialog, setShowAIAgentDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showBasicFlowDialog, setShowBasicFlowDialog] = useState(false);
  const [showAdvancedFlowDialog, setShowAdvancedFlowDialog] = useState(false);
  const [testingAgent, setTestingAgent] = useState(false);
  const [aiUsageRecords, setAiUsageRecords] = useState<AIUsageRecord[]>([]);

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Estados de diálogos
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [editingFlow, setEditingFlow] = useState<AdvancedFlow | null>(null);
  const [showEditAgentDialog, setShowEditAgentDialog] = useState(false);
  const [showEditAdvancedFlowDialog, setShowEditAdvancedFlowDialog] = useState(false);
  const [mediaAnalysis, setMediaAnalysis] = useState<any>(null);

  // Función para conectar socket
  const connectSocket = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.log('🔄 Iniciando conexión WebSocket...');
      
      // Desconectar socket anterior si existe
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: false,
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        autoConnect: true
      });
      
      socketRef.current.on('connect', () => {
        console.log('🔌 WebSocket conectado exitosamente - ID:', socketRef.current?.id);
        setIsConnected(true);
        
        // PRIMER: Unirse a todos los rooms de las instancias disponibles
        console.log('📋 Instancias disponibles para unirse a rooms:', instances.length);
        instances.forEach((instance, index) => {
          const roomName = `whatsapp:${instance.instanceId}`;
          console.log(`🏠 [${index + 1}/${instances.length}] Uniéndose al room:`, roomName);
          socketRef.current?.emit('whatsapp:join-instance', instance.instanceId);
          
          // Confirmar que el emit se envió
          setTimeout(() => {
            console.log(`✅ Emit enviado para instancia: ${instance.instanceId}`);
          }, 100);
        });
        
        // SEGUNDO: También unirse al room de la instancia seleccionada si existe
        if (selectedInstance) {
          console.log('� Uniéndose al room de instancia seleccionada:', `whatsapp:${selectedInstance}`);
          socketRef.current?.emit('whatsapp:join-instance', selectedInstance);
        }
        
        // TERCERO: Enviar un ping de test
        setTimeout(() => {
          console.log('📡 Enviando ping de test...');
          socketRef.current?.emit('ping', { test: true, timestamp: Date.now() });
        }, 2000);
      });
      
      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ WebSocket desconectado - Razón:', reason);
        setIsConnected(false);
        
        // Reconectar automáticamente si no fue desconexión intencional
        if (reason !== 'io client disconnect') {
          console.log('🔄 Reintentando conexión en 3 segundos...');
          setTimeout(() => {
            connectSocket();
          }, 3000);
        }
      });
      
      socketRef.current.on('error', (error) => {
        console.error('❌ Error en WebSocket:', error);
      });
      
      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Error de conexión WebSocket:', error);
      });
      
      // Escuchar confirmación de unión a room
      socketRef.current.on('joined-room', (data) => {
        console.log('✅ Unido exitosamente al room:', data);
      });
      
      // Escuchar cuando se cargan contactos
      socketRef.current.on('contacts-loaded', (data) => {
        console.log('👥 Contactos cargados en el backend:', data);
        if (data.instanceId === selectedInstance) {
          console.log('🔄 Recargando chats después de cargar contactos...');
          setTimeout(() => {
            loadChats(data.instanceId);
          }, 1000);
        }
      });
      
      // Escuchar mensajes de estado de conexión
      socketRef.current.on('connection-status', (data) => {
        console.log('📡 Estado de conexión:', data);
      });
      
      // Escuchar QR codes
      socketRef.current.on('qr-code', (data) => {
        console.log('🔲 QR Code recibido:', data);
      });
      
      // Listener genérico para todos los eventos
      const originalEmit = socketRef.current.emit;
      const originalOn = socketRef.current.on;
      
      // Log de todos los eventos recibidos
      socketRef.current.onAny((eventName, ...args) => {
        console.log('📡 Evento WebSocket recibido:', eventName, args);
      });
      
      // También escuchar variaciones del nombre del evento por si acaso
      socketRef.current.on('message', (data) => {
        console.log('📨 Evento "message" recibido:', data);
      });
      
      socketRef.current.on('new_message', (data) => {
        console.log('📨 Evento "new_message" recibido:', data);
      });
      
      socketRef.current.on('newMessage', (data) => {
        console.log('📨 Evento "newMessage" recibido:', data);
      });
      
      // Escuchar nuevos mensajes - CORREGIDO: usar 'new-message' como emite el backend
      socketRef.current.on('new-message', (data) => {
        console.log('🎉 ¡MENSAJE RECIBIDO EN FRONTEND!:', data);
        console.log('📊 Instancia actual seleccionada:', selectedInstance);
        console.log('📊 Chat actual seleccionado:', selectedChat?.phone_number);
        console.log('📊 Total chats actuales:', chats.length);
        
        // Extraer el número de teléfono del chatId (formato: número@s.whatsapp.net)
        const fromNumber = data.chatId ? data.chatId.replace('@s.whatsapp.net', '') : '';
        const messageText = data.content || '';
        
        console.log('📞 Número extraído:', fromNumber);
        console.log('📝 Texto del mensaje:', messageText);
        
        if (!fromNumber) {
          console.error('❌ No se pudo extraer el número de teléfono del mensaje');
          return;
        }
        
        // Crear chat si no existe
        setChats(prevChats => {
          console.log('📝 Actualizando lista de chats... (chats actuales:', prevChats.length, ')');
          const phoneWithoutCountry = fromNumber.replace(/^\+\d+/, '');
          
          // Verificar si el chat ya existe
          const existingChatIndex = prevChats.findIndex(chat => {
            const chatPhoneWithoutCountry = chat.phone_number.replace(/^\+\d+/, '');
            return chatPhoneWithoutCountry === phoneWithoutCountry || fromNumber === chat.phone_number;
          });
          
          if (existingChatIndex >= 0) {
            // Actualizar chat existente
            console.log('📝 Actualizando chat existente:', prevChats[existingChatIndex].phone_number);
            const updatedChats = [...prevChats];
            updatedChats[existingChatIndex] = {
              ...updatedChats[existingChatIndex],
              last_message: messageText,
              last_message_time: data.timestamp || new Date().toISOString(),
              unread_count: selectedChat?.phone_number === updatedChats[existingChatIndex].phone_number ? 0 : (updatedChats[existingChatIndex].unread_count || 0) + 1
            };
            return updatedChats;
          } else {
            // Crear nuevo chat
            console.log('🆕 Creando nuevo chat para:', fromNumber);
            const newChat = {
              id: `chat_${Date.now()}`,
              instance_id: data.instanceId || selectedInstance,
              phone_number: fromNumber,
              contact_name: fromNumber,
              last_message: messageText,
              last_message_time: data.timestamp || new Date().toISOString(),
              unread_count: 1
            };
            console.log('✅ Chat creado exitosamente:', newChat);
            return [newChat, ...prevChats];
          }
        });
        
        // SIEMPRE agregar el mensaje si coincide con el chat seleccionado
        if (selectedChat) {
          const phoneWithoutCountry = selectedChat.phone_number.replace(/^\+\d+/, '');
          const dataPhoneWithoutCountry = fromNumber.replace(/^\+\d+/, '');
          
          console.log('🔍 Verificando si agregar al chat seleccionado:');
          console.log('  - Chat seleccionado:', selectedChat.phone_number);
          console.log('  - Teléfono sin país:', phoneWithoutCountry);
          console.log('  - Data teléfono:', fromNumber);
          console.log('  - Data teléfono sin país:', dataPhoneWithoutCountry);
          
          if (phoneWithoutCountry === dataPhoneWithoutCountry || fromNumber === selectedChat.phone_number) {
            console.log('✅ ¡AGREGANDO MENSAJE AL CHAT SELECCIONADO!');
            const newMessage = {
              id: data.messageId || `msg_${Date.now()}`,
              instance_id: data.instanceId,
              chat_id: data.chatId,
              from_number: fromNumber,
              to_number: 'self',
              message_text: messageText,
              message_type: 'text',
              timestamp: data.timestamp || new Date().toISOString(),
              is_from_me: data.direction === 'outgoing',
              status: 'received'
            };
            
            console.log('📨 Nuevo mensaje creado:', newMessage);
            
            setMessages(prevMessages => {
              // Evitar duplicados
              if (prevMessages.some(msg => msg.id === newMessage.id)) {
                console.log('⚠️ Mensaje duplicado, ignorando');
                return prevMessages;
              }
              console.log('✅ ¡MENSAJE AGREGADO EXITOSAMENTE AL FRONTEND!');
              console.log('📊 Total mensajes después de agregar:', prevMessages.length + 1);
              const updatedMessages = [...prevMessages, newMessage];
              
              // También actualizar el caché para este chat
              const chatKey = `${data.instanceId || selectedInstance}:${fromNumber}`;
              setMessagesCache(prev => ({
                ...prev,
                [chatKey]: updatedMessages
              }));
              
              // Scroll después de agregar el mensaje
              setTimeout(() => {
                console.log('📜 Haciendo scroll al final...');
                scrollToBottom();
              }, 50);
              
              return updatedMessages;
            });
          } else {
            console.log('❌ El mensaje no es del chat seleccionado');
            console.log('  - Comparación exacta:', fromNumber === selectedChat.phone_number);
            console.log('  - Comparación sin país:', phoneWithoutCountry === dataPhoneWithoutCountry);
          }
        } else {
          console.log('⚠️ No hay chat seleccionado, guardando mensaje en caché');
          // Si no hay chat seleccionado, aún así guardar el mensaje en caché
          const chatKey = `${data.instanceId || selectedInstance}:${fromNumber}`;
          const newMessage = {
            id: data.messageId || `msg_${Date.now()}`,
            instance_id: data.instanceId,
            chat_id: data.chatId,
            from_number: fromNumber,
            to_number: 'self',
            message_text: messageText,
            message_type: 'text',
            timestamp: data.timestamp || new Date().toISOString(),
            is_from_me: data.direction === 'outgoing',
            status: 'received'
          };
          
          // Actualizar caché
          setMessagesCache(prev => {
            const existingMessages = prev[chatKey] || [];
            // Evitar duplicados
            if (existingMessages.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return {
              ...prev,
              [chatKey]: [...existingMessages, newMessage]
            };
          });
          
          // Auto-seleccionar el chat del mensaje
          const phoneWithoutCountry = fromNumber.replace(/^\+\d+/, '');
          setTimeout(() => {
            setChats(currentChats => {
              const matchingChat = currentChats.find(chat => {
                const chatPhoneWithoutCountry = chat.phone_number.replace(/^\+\d+/, '');
                return chatPhoneWithoutCountry === phoneWithoutCountry || fromNumber === chat.phone_number;
              });
              if (matchingChat) {
                console.log('🎯 Auto-seleccionando chat:', matchingChat.phone_number);
                setSelectedChat(matchingChat);
              }
              return currentChats;
            });
          }, 100);
        }
      });
      
      // Mantener conexión activa con ping
      const pingInterval = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit('ping', { timestamp: Date.now() });
          console.log('📡 Ping enviado para mantener conexión activa');
        }
      }, 25000); // Ping cada 25 segundos
      
      // Responder a pong del servidor
      socketRef.current.on('pong', (data) => {
        console.log('📡 Pong recibido del servidor:', data);
      });
      
      // Limpiar interval cuando se desconecte
      socketRef.current.on('disconnect', () => {
        clearInterval(pingInterval);
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
            id: data.messageId || Date.now().toString(),
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
          scrollToBottom();
        }
      });
    }
  };

  // Efecto de inicialización
  useEffect(() => {
    // Cargar caché de mensajes desde localStorage
    const savedCache = localStorage.getItem('whatsapp_messages_cache');
    if (savedCache) {
      try {
        const parsedCache = JSON.parse(savedCache);
        setMessagesCache(parsedCache);
        console.log('🗄️ Caché de mensajes cargado desde localStorage');
      } catch (error) {
        console.error('Error cargando caché de mensajes:', error);
      }
    }
    
    // Primero cargar instancias y configuración
    loadInstances();
    loadAIAgents();
    loadDocuments();
    loadBasicFlows();
    loadAdvancedFlows();
    loadAIUsageRecords();
    
    // Listener para evento de test
    const handleTestMessage = (event) => {
      console.log('🧪 Evento de test recibido:', event.detail);
      const testData = event.detail;
      
      // Simular la llegada del mensaje como si viniera del WebSocket
      console.log('🎉 ¡PROCESANDO MENSAJE DE TEST!');
      
      // Extraer el número de teléfono del chatId
      const fromNumber = testData.chatId ? testData.chatId.replace('@s.whatsapp.net', '') : '';
      const messageText = testData.content || '';
      
      // Crear chat si no existe
      setChats(prevChats => {
        const newChat = {
          id: `chat_test_${Date.now()}`,
          instance_id: testData.instanceId,
          phone_number: fromNumber,
          contact_name: fromNumber + ' (TEST)',
          last_message: messageText,
          last_message_time: testData.timestamp,
          unread_count: 1
        };
        return [newChat, ...prevChats];
      });
      
      // Agregar mensaje
      setMessages(prevMessages => {
        const newMessage = {
          id: testData.messageId,
          instance_id: testData.instanceId,
          chat_id: testData.chatId,
          from_number: fromNumber,
          to_number: 'self',
          message_text: messageText,
          message_type: 'text',
          timestamp: testData.timestamp,
          is_from_me: false,
          status: 'received'
        };
        return [...prevMessages, newMessage];
      });
    };
    
    window.addEventListener('test-message', handleTestMessage);
    
    // Luego conectar WebSocket
    const timer = setTimeout(() => {
      connectSocket();
    }, 1000); // Esperar 1 segundo para que las instancias se carguen

    return () => {
      clearTimeout(timer);
      window.removeEventListener('test-message', handleTestMessage);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Efecto para guardar caché en localStorage
  useEffect(() => {
    if (Object.keys(messagesCache).length > 0) {
      localStorage.setItem('whatsapp_messages_cache', JSON.stringify(messagesCache));
      console.log('💾 Caché de mensajes guardado en localStorage');
    }
  }, [messagesCache]);

  // Función para cargar instancias
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

  // Función para cargar chats
  const loadChats = async (instanceId: string) => {
    try {
      console.log('📞 Cargando chats para instancia:', instanceId);
      const response = await fetch(`${WHATSAPP_API_URL}/chats/${instanceId}`);
      console.log('📞 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📞 Chats recibidos:', data);
        setChats(data || []);
        
        // Si hay pocos chats, forzar carga de contactos
        if (data.length < 5) {
          console.log('🔄 Pocos chats encontrados, forzando carga de contactos...');
          await forceLoadContacts(instanceId);
        } else {
          // También cargar contactos disponibles
          loadContacts(instanceId);
        }
      } else if (response.status === 404) {
        console.log('⚠️ No hay chats en la API, forzando carga de contactos');
        setChats([]);
        
        // Forzar carga de contactos
        await forceLoadContacts(instanceId);
      } else {
        console.error('❌ Error al cargar chats - Status:', response.status);
        const errorText = await response.text();
        console.error('❌ Error text:', errorText);
        setChats([]);
      }
    } catch (error) {
      console.error('❌ Error loading chats:', error);
      setChats([]);
    }
  };

  // Función para forzar carga de contactos
  const forceLoadContacts = async (instanceId: string) => {
    try {
      console.log(`🔄 Forzando carga de contactos para: ${instanceId}`);
      const response = await fetch(`${WHATSAPP_API_URL}/load-contacts/${instanceId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Contactos forzados:', result);
        
        // Recargar chats después de un momento
        setTimeout(() => {
          loadChats(instanceId);
        }, 2000);
        
        return result;
      } else {
        console.error('❌ Error forzando carga de contactos');
      }
    } catch (error) {
      console.error('Error forcing contact load:', error);
    }
  };

  // Función para cargar contactos disponibles
  const loadContacts = async (instanceId: string) => {
    try {
      console.log('👥 Cargando contactos para instancia:', instanceId);
      const response = await fetch(`${WHATSAPP_API_URL}/contacts/${instanceId}`);
      
      if (response.ok) {
        const contactsData = await response.json();
        console.log('✅ Contactos cargados:', contactsData.length);
        
        // Convertir contactos a formato de chat si no tienen mensajes
        const contactsAsChats = contactsData.map(contact => ({
          id: contact.id,
          instance_id: contact.instance_id,
          phone_number: contact.phone_number.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          contact_name: contact.contact_name || contact.name,
          chat_type: contact.chat_type,
          last_message: contact.chat_type === 'group' ? 'Grupo disponible' : 'Contacto disponible',
          last_message_time: contact.created_at,
          unread_count: 0
        }));
        
        if (contactsAsChats.length > 0) {
          setChats(prevChats => {
            // Filtrar contactos que ya están en chats
            const existingPhones = prevChats.map(chat => chat.phone_number);
            const newContacts = contactsAsChats.filter(contact => 
              !existingPhones.includes(contact.phone_number)
            );
            
            // Combinar chats existentes con contactos nuevos
            const combined = [...prevChats, ...newContacts];
            
            // Ordenar: grupos primero, luego individuales, por nombre
            return combined.sort((a, b) => {
              if (a.chat_type !== b.chat_type) {
                return a.chat_type === 'group' ? -1 : 1;
              }
              return (a.contact_name || a.phone_number).localeCompare(b.contact_name || b.phone_number);
            });
          });
        }
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  // Función para cargar mensajes
  const loadMessages = async (instanceId: string, phoneNumber: string) => {
    try {
      const chatKey = `${instanceId}:${phoneNumber}`;
      console.log(`💬 Cargando mensajes para ${chatKey}`);
      
      // Primero verificar si tenemos mensajes en caché
      if (messagesCache[chatKey] && messagesCache[chatKey].length > 0) {
        console.log(`�️ Usando mensajes del caché para ${chatKey}: ${messagesCache[chatKey].length} mensajes`);
        setMessages(messagesCache[chatKey]);
        scrollToBottom();
        return;
      }
      
      // Si no hay caché, cargar desde la API
      console.log(`🌐 Cargando mensajes desde API para ${chatKey}`);
      const response = await fetch(`${WHATSAPP_API_URL}/messages/${instanceId}/${phoneNumber}?limit=100`);
      if (response.ok) {
        const data = await response.json();
        // La API devuelve un array directamente, no un objeto con messages
        const messagesFromAPI = Array.isArray(data) ? data : (data.messages || []);
        console.log(`💬 Mensajes cargados desde API para ${phoneNumber}:`, messagesFromAPI.length);
        
        // Ordenar por timestamp
        const sortedMessages = messagesFromAPI.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Guardar en caché
        setMessagesCache(prev => ({
          ...prev,
          [chatKey]: sortedMessages
        }));
        
        setMessages(sortedMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Función para enviar mensaje
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

  // Función para obtener QR
  const getQRCode = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/qr/${instanceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.qr) {
          setQrCode(data.qr);
          setShowQRDialog(true);
        }
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
    }
  };

  // Función para desconectar instancia
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
          
          // Limpiar caché de esta instancia
          setMessagesCache(prev => {
            const newCache = { ...prev };
            Object.keys(newCache).forEach(key => {
              if (key.startsWith(`${instanceId}:`)) {
                delete newCache[key];
              }
            });
            return newCache;
          });
        }
      }
    } catch (error) {
      console.error('Error disconnecting instance:', error);
    }
  };

  // Función para crear nueva instancia
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

  // Funciones de IA
  const loadAIAgents = () => {
    const stored = localStorage.getItem('aiAgents');
    if (stored) {
      setAiAgents(JSON.parse(stored));
    }
  };

  const saveAIAgents = (agents: AIAgent[]) => {
    localStorage.setItem('aiAgents', JSON.stringify(agents));
    setAiAgents(agents);
  };

  const loadDocuments = () => {
    const stored = localStorage.getItem('ai_documents');
    if (stored) {
      setAiDocuments(JSON.parse(stored));
    }
  };

  const saveDocuments = (documents: AIDocument[]) => {
    localStorage.setItem('ai_documents', JSON.stringify(documents));
    setAiDocuments(documents);
  };

  const loadBasicFlows = () => {
    const stored = localStorage.getItem('basic_flows');
    if (stored) {
      setBasicFlows(JSON.parse(stored));
    }
  };

  const saveBasicFlows = (flows: BasicFlow[]) => {
    localStorage.setItem('basic_flows', JSON.stringify(flows));
    setBasicFlows(flows);
  };

  const loadAdvancedFlows = () => {
    const stored = localStorage.getItem('advanced_flows');
    if (stored) {
      setAdvancedFlows(JSON.parse(stored));
    }
  };

  const saveAdvancedFlows = (flows: AdvancedFlow[]) => {
    localStorage.setItem('advanced_flows', JSON.stringify(flows));
    setAdvancedFlows(flows);
  };

  const loadAIUsageRecords = () => {
    const stored = localStorage.getItem('ai_usage_records');
    if (stored) {
      setAiUsageRecords(JSON.parse(stored));
    }
  };

  const saveAIUsageRecord = (record: AIUsageRecord) => {
    const newRecords = [...aiUsageRecords, record];
    localStorage.setItem('ai_usage_records', JSON.stringify(newRecords));
    setAiUsageRecords(newRecords);
  };

  // Función para generar respuesta de IA con contexto
  const generateAIResponseWithContext = async (message: string, agentId: string, contextDocuments: string[] = []) => {
    try {
      console.log('🔍 Buscando agente con ID:', agentId);
      
      let agent = aiAgents.find(a => a.id === agentId);
      
      if (!agent) {
        try {
          const savedAgents = localStorage.getItem('aiAgents');
          if (savedAgents) {
            const localAgents = JSON.parse(savedAgents);
            agent = localAgents.find(a => a.id === agentId);
          }
        } catch (error) {
          console.warn('⚠️ Error leyendo localStorage para buscar agente:', error);
        }
      }
      
      if (!agent) {
        console.error('❌ Agente no encontrado. ID buscado:', agentId);
        return 'Error: Agente no encontrado';
      }

      if (!agent.apiKey) {
        console.error('❌ Agente sin API Key configurada');
        return 'Error: Agente sin API Key configurada';
      }

      // Preparar contexto de documentos
      let documentContext = '';
      if (contextDocuments.length > 0) {
        const relevantDocs = aiDocuments.filter(doc => contextDocuments.includes(doc.id));
        if (relevantDocs.length > 0) {
          documentContext = '\n\nCONTEXTO DE DOCUMENTOS:\n';
          relevantDocs.forEach(doc => {
            documentContext += `- ${doc.name}: ${doc.content || ''}\n`;
          });
          documentContext += '\nUsa esta información para responder si es relevante.\n';
        }
      }

      const fullMessage = message + documentContext;

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
            max_tokens: agent.maxTokens || 300,
            temperature: agent.temperature || 0.7
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
            max_tokens: agent.maxTokens || 300,
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
      }
    } catch (error) {
      console.error('Error en generateAIResponseWithContext:', error);
      return `Error de conexión: ${error.message || 'Error desconocido'}`;
    }
  };

  // Función para probar agentes
  const testAllAgents = async () => {
    setTestingAgent(true);
    const testMessage = "Hola, estoy probando tu funcionamiento. Responde brevemente.";
    
    for (const agent of aiAgents) {
      if (agent.isActive && agent.apiKey) {
        try {
          const response = await generateAIResponseWithContext(testMessage, agent.id);
          console.log(`✅ Agente "${agent.name}" funciona:`, response.slice(0, 100));
        } catch (error) {
          console.error(`❌ Agente "${agent.name}" falló:`, error);
        }
      }
    }
    
    setTestingAgent(false);
    alert('Prueba de agentes completada. Revisa la consola para detalles.');
  };

  // Función para debug de agentes
  const debugAgentStatus = () => {
    console.log('🔍 === DEBUG DE AGENTES ===');
    console.log('📊 Total agentes:', aiAgents.length);
    
    aiAgents.forEach((agent, index) => {
      console.log(`🤖 Agente ${index + 1}:`);
      console.log(`  - Nombre: ${agent.name}`);
      console.log(`  - Proveedor: ${agent.provider}`);
      console.log(`  - Modelo: ${agent.model}`);
      console.log(`  - Activo: ${agent.isActive}`);
      console.log(`  - Tiene API Key: ${!!agent.apiKey}`);
      console.log(`  - Auto-responder: ${agent.autoRespond}`);
    });
    
    alert('Debug completado. Revisa la consola para detalles.');
  };

  // Función para crear nuevo agente
  const createAIAgent = (agentData: Partial<AIAgent>) => {
    const newAgent: AIAgent = {
      id: Date.now().toString(),
      name: agentData.name || 'Nuevo Agente',
      provider: agentData.provider || 'openai',
      apiKey: agentData.apiKey || '',
      model: agentData.model || 'gpt-3.5-turbo',
      systemPrompt: agentData.systemPrompt || 'Eres un asistente útil.',
      isActive: agentData.isActive !== undefined ? agentData.isActive : true,
      temperature: agentData.temperature || 0.7,
      maxTokens: agentData.maxTokens || 300,
      autoRespond: agentData.autoRespond || false,
      assignedDocuments: agentData.assignedDocuments || []
    };

    const updatedAgents = [...aiAgents, newAgent];
    saveAIAgents(updatedAgents);
  };

  // Función para subir documento
  const uploadDocument = async (file: File) => {
    try {
      const content = await file.text();
      const newDocument: AIDocument = {
        id: Date.now().toString(),
        name: file.name,
        content: content,
        type: file.type.includes('pdf') ? 'pdf' : 'text',
        uploadDate: new Date().toISOString(),
        size: file.size
      };

      const updatedDocuments = [...aiDocuments, newDocument];
      saveDocuments(updatedDocuments);
      
      console.log('✅ Documento subido:', newDocument.name);
    } catch (error) {
      console.error('❌ Error subiendo documento:', error);
    }
  };

  // Funciones auxiliares
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

  // Función para debug de conexión
  const debugConnection = () => {
    console.log('🔍 === DEBUG DE CONEXIÓN ===');
    console.log('📊 Estado WebSocket conectado:', isConnected);
    console.log('📊 Socket ref existe:', !!socketRef.current);
    console.log('📊 Socket conectado:', socketRef.current?.connected);
    console.log('📊 Socket ID:', socketRef.current?.id);
    console.log('📊 Instancias disponibles:', instances.length);
    console.log('📊 Instancia seleccionada:', selectedInstance);
    console.log('📊 Chat seleccionado:', selectedChat?.phone_number);
    console.log('📊 Total chats:', chats.length);
    console.log('📊 Total mensajes:', messages.length);
    console.log('🗄️ Caché de mensajes:', Object.keys(messagesCache).length, 'chats');
    
    // Mostrar contenido del caché
    Object.entries(messagesCache).forEach(([chatKey, chatMessages]) => {
      console.log(`  - ${chatKey}: ${chatMessages.length} mensajes`);
    });
    
    // Información detallada de instancias
    instances.forEach((instance, index) => {
      console.log(`📱 Instancia ${index + 1}:`, {
        id: instance.instanceId,
        status: instance.status,
        phone: instance.phone || instance.phoneNumber,
        room: `whatsapp:${instance.instanceId}`
      });
    });
    
    // Re-unirse a todos los rooms
    if (socketRef.current?.connected) {
      console.log('🔄 Re-uniéndose a todos los rooms...');
      instances.forEach(instance => {
        console.log('🏠 Enviando join para:', `whatsapp:${instance.instanceId}`);
        socketRef.current?.emit('whatsapp:join-instance', instance.instanceId);
        
        // Verificar que se unió correctamente
        setTimeout(() => {
          console.log('✅ Verificando unión al room para:', instance.instanceId);
        }, 1000);
      });
      
      // También forzar ping para mantener conexión
      socketRef.current.emit('ping', { timestamp: Date.now(), debug: true });
      
      // TEST: Simular un mensaje para ver si llega
      console.log('🧪 Enviando mensaje de test...');
      setTimeout(() => {
        if (selectedInstance) {
          // Simular mensaje local para verificar que la función funciona
          const testMessage = {
            instanceId: selectedInstance,
            messageId: 'test_' + Date.now(),
            chatId: '573186218792@s.whatsapp.net',
            content: 'MENSAJE DE TEST LOCAL',
            direction: 'incoming',
            timestamp: new Date().toISOString()
          };
          console.log('🧪 Procesando mensaje de test local:', testMessage);
          
          // Llamar directamente al handler para ver si funciona
          // Este debería aparecer en la UI si el frontend funciona
          const event = new CustomEvent('test-message', { detail: testMessage });
          window.dispatchEvent(event);
        }
      }, 2000);
    }
    
    // Forzar reconexión si no está conectado
    if (!isConnected) {
      console.log('🔄 Forzando reconexión...');
      connectSocket();
    }
    
    // Mostrar estado actual de WebSocket
    console.log('🌐 Estado detallado del WebSocket:');
    console.log('  - Socket existe:', !!socketRef.current);
    console.log('  - Socket conectado:', socketRef.current?.connected);
    console.log('  - Socket ID:', socketRef.current?.id);
    console.log('  - Estado isConnected:', isConnected);
    
    alert('Debug completado. Revisa la consola para detalles. Se enviará un mensaje de test en 2 segundos.');
  };

  // Función para test directo del WebSocket
  const testWebSocketMessage = () => {
    if (!socketRef.current?.connected) {
      alert('WebSocket no está conectado');
      return;
    }
    
    if (!selectedInstance) {
      alert('No hay instancia seleccionada');
      return;
    }
    
    console.log('🧪 Enviando solicitud de mensaje de test al backend...');
    
    // Enviar evento al backend para que simule un mensaje
    socketRef.current.emit('test-message-request', {
      instanceId: selectedInstance,
      fromNumber: '573186218792',
      message: 'Mensaje de test desde frontend - ' + new Date().toLocaleTimeString()
    });
    
    console.log('✅ Solicitud de test enviada');
    alert('Solicitud de test enviada al backend. Revisa la consola.');
  };

  // Función para limpiar caché de mensajes
  const clearMessagesCache = () => {
    setMessagesCache({});
    localStorage.removeItem('whatsapp_messages_cache');
    console.log('🗑️ Caché de mensajes limpiado');
    alert('Caché de mensajes limpiado. Los mensajes se recargarán desde la API.');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Efecto para asegurar conexión WebSocket cuando hay instancias
  useEffect(() => {
    if (instances.length > 0 && !isConnected) {
      console.log('🔄 Reconectando WebSocket porque hay instancias disponibles');
      connectSocket();
    }
    
    // Si ya está conectado, asegurarse de estar en los rooms correctos
    if (instances.length > 0 && isConnected && socketRef.current?.connected) {
      instances.forEach(instance => {
        console.log('🏠 Re-uniéndose al room:', `whatsapp:${instance.instanceId}`);
        socketRef.current?.emit('whatsapp:join-instance', instance.instanceId);
      });
    }
  }, [instances, isConnected]);
  
  // Efecto para reconectar periódicamente si no hay conexión
  useEffect(() => {
    const reconnectInterval = setInterval(() => {
      if (!isConnected && instances.length > 0) {
        console.log('🔄 Reconexión automática - WebSocket desconectado');
        connectSocket();
      }
    }, 10000); // Verificar cada 10 segundos
    
    return () => clearInterval(reconnectInterval);
  }, [isConnected, instances.length]);

  // Efecto para cargar chats cuando cambia la instancia seleccionada
  useEffect(() => {
    if (selectedInstance) {
      loadChats(selectedInstance);
      
      // Unirse al room de la instancia seleccionada
      if (socketRef.current?.connected) {
        console.log('🏠 Uniéndose al room de la instancia:', `whatsapp:${selectedInstance}`);
        socketRef.current.emit('whatsapp:join-instance', selectedInstance);
      }
    }
  }, [selectedInstance]);

  // Efecto para cargar mensajes cuando cambia el chat seleccionado
  useEffect(() => {
    if (selectedChat && selectedInstance) {
      loadMessages(selectedInstance, selectedChat.phone_number);
    }
  }, [selectedChat, selectedInstance]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Instance Management */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Instancias WhatsApp</h2>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadInstances}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                {selectedInstance && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => forceLoadContacts(selectedInstance)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Contactos
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={createInstance}
                  disabled={instances.length >= 3 || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva ({instances.length}/3)
                </Button>
              </div>
            </div>
            
            {/* Estado de WebSocket */}
            <div className="mb-3 p-2 rounded-md bg-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">WebSocket:</span>
                <div className="flex items-center gap-2">
                  <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                    {isConnected ? "🟢 Conectado" : "🔴 Desconectado"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={debugConnection}
                    className="h-6 px-2 text-xs"
                  >
                    Debug
                  </Button>
                </div>
              </div>
            </div>
            
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

              {instances.length === 0 && (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No hay instancias de WhatsApp
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Crea una nueva instancia para comenzar
                  </p>
                  <Button 
                    onClick={createInstance} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {loading ? 'Creando...' : 'Crear Primera Instancia'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">
                WhatsApp Chats ({chats.length})
              </h3>
              {selectedInstance && chats.length < 10 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => forceLoadContacts(selectedInstance)}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Cargar Todos
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        chat.chat_type === 'group' 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}>
                        {chat.chat_type === 'group' ? (
                          <Users className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Phone className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {chat.contact_name || chat.phone_number}
                          </p>
                          {chat.chat_type === 'group' && (
                            <Badge variant="secondary" className="text-xs px-1 py-0">
                              Grupo
                            </Badge>
                          )}
                        </div>
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
                  <p className="text-gray-500 text-sm">No hay chats disponibles</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="automation" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Automatización
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                IA Avanzada
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Analíticas
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-4 mt-0">
              {selectedChat ? (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {selectedChat.contact_name || selectedChat.phone_number}
                          </h3>
                          <p className="text-sm text-gray-500">
                            WhatsApp • {selectedInstance}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="flex flex-col space-y-4">
                        {messages.map((message) => (
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
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Escribe un mensaje..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-green-600 hover:bg-green-700">
                          <Send className="w-4 h-4" />
                        </Button>
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
                      Elige una conversación de WhatsApp para comenzar a chatear
                    </p>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="flex-1 m-4 mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Bot className="w-6 h-6 text-blue-600" />
                      Automatización Simple
                    </h2>
                    <p className="text-gray-600">
                      Crea respuestas automáticas simples
                    </p>
                  </div>
                  <Button onClick={() => setShowBasicFlowDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Flujo
                  </Button>
                </div>

                <div className="grid gap-4">
                  {basicFlows.map((flow) => (
                    <Card key={flow.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{flow.name}</h3>
                            <p className="text-gray-600 text-sm">{flow.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Función para editar flujo
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Función para eliminar flujo
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Palabras clave:</h4>
                            <div className="flex flex-wrap gap-1">
                              {(flow.triggers || []).map((trigger, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {trigger}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Respuesta:</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {flow.response}
                            </p>
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
              </div>
            </TabsContent>

            {/* Advanced IA Tab */}
            <TabsContent value="advanced" className="flex-1 m-4 mt-0">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Brain className="w-6 h-6 text-blue-600" />
                      IA Avanzada
                    </h2>
                    <p className="text-gray-600">
                      Configura agentes de IA y flujos inteligentes
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      isConnected 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </div>
                    {aiDocuments.length > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {aiDocuments.length} documentos
                      </Badge>
                    )}
                  </div>
                </div>

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
                  </TabsList>

                  <TabsContent value="agents" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Agentes de IA</h3>
                        <p className="text-gray-600">Configura diferentes proveedores de IA</p>
                      </div>
                      <Button onClick={() => setShowAIAgentDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Agente
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      {aiAgents.map((agent) => (
                        <Card key={agent.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{agent.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {agent.provider} • {agent.model}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={agent.isActive ? "default" : "secondary"}
                                  className={agent.isActive ? "bg-green-100 text-green-800" : ""}
                                >
                                  {agent.isActive ? 'Activo' : 'Inactivo'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingAgent(agent);
                                    setShowEditAgentDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Prompt del sistema:</strong>
                            </p>
                            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                              {agent.systemPrompt.slice(0, 150)}...
                            </p>
                          </CardContent>
                        </Card>
                      ))}

                      {aiAgents.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-48">
                            <div className="text-center">
                              <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-600 mb-2">
                                No hay agentes configurados
                              </h3>
                              <p className="text-gray-500 mb-4">
                                Crea tu primer agente de IA
                              </p>
                              <Button onClick={() => setShowAIAgentDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear primer agente
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Documentos de Contexto</h3>
                        <p className="text-gray-600">Sube documentos para que la IA los use como referencia</p>
                      </div>
                      <Button onClick={() => setShowDocumentDialog(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Documento
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      {aiDocuments.map((document) => (
                        <Card key={document.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900">{document.name}</h4>
                                  <p className="text-sm text-gray-500">
                                    {document.type} • {Math.round(document.size / 1024)} KB
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {aiDocuments.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-48">
                            <div className="text-center">
                              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-600 mb-2">
                                No hay documentos cargados
                              </h3>
                              <p className="text-gray-500 mb-4">
                                Sube documentos para que la IA los use como contexto
                              </p>
                              <Button onClick={() => setShowDocumentDialog(true)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Subir primer documento
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="flows" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">Flujos Avanzados</h3>
                        <p className="text-gray-600">Automatización inteligente con IA</p>
                      </div>
                      <Button onClick={() => setShowAdvancedFlowDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Flujo
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      {advancedFlows.map((flow) => (
                        <Card key={flow.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{flow.name}</h3>
                                <p className="text-sm text-gray-600">{flow.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={flow.is_active ? "default" : "secondary"}
                                  className={flow.is_active ? "bg-green-100 text-green-800" : ""}
                                >
                                  {flow.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingFlow(flow);
                                    setShowEditAdvancedFlowDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}

                      {advancedFlows.length === 0 && (
                        <Card>
                          <CardContent className="flex items-center justify-center h-48">
                            <div className="text-center">
                              <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <h3 className="text-lg font-medium text-gray-600 mb-2">
                                No hay flujos avanzados
                              </h3>
                              <p className="text-gray-500 mb-4">
                                Crea flujos inteligentes con IA
                              </p>
                              <Button onClick={() => setShowAdvancedFlowDialog(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear primer flujo
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="flex-1 m-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Mensajes Enviados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {messages.filter(m => m.is_from_me).length}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Total de mensajes enviados
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Mensajes Recibidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {messages.filter(m => !m.is_from_me).length}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Total de mensajes recibidos
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Chats Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {chats.length}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Conversaciones activas
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR de WhatsApp</DialogTitle>
            <DialogDescription>
              Escanea este código QR con tu WhatsApp para conectar la instancia
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrCode && (
              <img 
                src={qrCode} 
                alt="QR Code" 
                className="max-w-xs max-h-xs"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Agent Dialog */}
      <Dialog open={showAIAgentDialog} onOpenChange={setShowAIAgentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Agente de IA</DialogTitle>
            <DialogDescription>
              Configura un nuevo agente de inteligencia artificial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Agente</Label>
              <Input placeholder="Ej: Asistente de Ventas" />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona modelo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" placeholder="Ingresa tu API Key" />
            </div>
            <div>
              <Label>Prompt del Sistema</Label>
              <Textarea 
                placeholder="Eres un asistente de atención al cliente profesional y amigable..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Temperatura (0-1)</Label>
                <Input type="number" min="0" max="1" step="0.1" defaultValue="0.7" />
              </div>
              <div>
                <Label>Máx. Tokens</Label>
                <Input type="number" defaultValue="300" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch />
              <Label>Auto-responder</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIAgentDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Crear agente
              setShowAIAgentDialog(false);
            }}>
              Crear Agente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Upload Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Sube un documento para que la IA lo use como contexto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Archivo</Label>
              <Input 
                type="file" 
                accept=".pdf,.txt,.doc,.docx" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    uploadDocument(file);
                    setShowDocumentDialog(false);
                  }
                }}
              />
            </div>
            <div className="text-sm text-gray-600">
              Formatos soportados: PDF, TXT, DOC, DOCX
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocumentDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Basic Flow Dialog */}
      <Dialog open={showBasicFlowDialog} onOpenChange={setShowBasicFlowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Flujo Básico</DialogTitle>
            <DialogDescription>
              Crea una respuesta automática simple
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Flujo</Label>
              <Input placeholder="Ej: Saludo automático" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Descripción breve del flujo" />
            </div>
            <div>
              <Label>Palabras Clave (separadas por comas)</Label>
              <Input placeholder="hola, buenos días, saludos" />
            </div>
            <div>
              <Label>Respuesta Automática</Label>
              <Textarea 
                placeholder="¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte?"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch defaultChecked />
              <Label>Activar flujo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBasicFlowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Crear flujo
              setShowBasicFlowDialog(false);
            }}>
              Crear Flujo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Flow Dialog */}
      <Dialog open={showAdvancedFlowDialog} onOpenChange={setShowAdvancedFlowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Flujo Avanzado</DialogTitle>
            <DialogDescription>
              Crea un flujo inteligente con IA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del Flujo</Label>
              <Input placeholder="Ej: Consultas de productos" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Descripción del flujo avanzado" />
            </div>
            <div>
              <Label>Agente de IA</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un agente" />
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
            <div>
              <Label>Palabras Clave (separadas por comas)</Label>
              <Input placeholder="producto, precio, información" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch defaultChecked />
              <Label>Activar flujo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvancedFlowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              // Crear flujo avanzado
              setShowAdvancedFlowDialog(false);
            }}>
              Crear Flujo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppIA;