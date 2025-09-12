import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  Phone,
  Send,
  QrCode,
  Wifi,
  WifiOff,
  Settings,
  Users,
  Bot,
  Calendar,
  Plus,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Download,
  Upload,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  Smartphone,
  Globe,
  Activity,
  Bell
} from 'lucide-react';

// Constants
const WHATSAPP_API_URL = 'http://localhost:3001/api/whatsapp';
const MAX_INSTANCES = 3;

// Types
interface WhatsAppInstance {
  instanceId: string;
  status: 'connected' | 'disconnected' | 'qr_ready' | 'error';
  phoneNumber?: string;
  qr?: string;
  user?: any;
}

interface Chat {
  id: string;
  instance_id: string;
  phone_number: string;
  contact_name?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  tags?: string;
  notes?: string;
}

interface Message {
  id: string;
  instance_id: string;
  from_number: string;
  to_number: string;
  message_text: string;
  timestamp: string;
  is_from_me: boolean;
  status: string;
}

interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  trigger_keywords: string;
  steps: string;
  is_active: boolean;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  message_template: string;
  target_contacts: string;
  scheduled_time: string;
  status: string;
  sent_count: number;
  total_count: number;
  created_at: string;
}

const WhatsAppIntegration: React.FC = () => {
  // State management
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<any>(null);
  const [automationFlows, setAutomationFlows] = useState<AutomationFlow[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  // Dialog states
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string>('');
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  
  // Form states
  const [flowForm, setFlowForm] = useState({
    name: '',
    description: '',
    triggerKeywords: [''],
    steps: [{ type: 'message', content: '', duration: 0 }]
  });
  
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    messageTemplate: '',
    targetContacts: [{ phone: '', name: '' }],
    scheduledTime: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effects
  useEffect(() => {
    initializeService();
    setupSocketConnection();
    
    return () => {
      if (socket) {
        if (socket instanceof WebSocket) {
          socket.close();
        }
      }
    };
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadChats(selectedInstance);
    }
  }, [selectedInstance]);

  useEffect(() => {
    if (selectedChat && selectedInstance) {
      loadMessages(selectedInstance, selectedChat.phone_number);
    }
  }, [selectedChat, selectedInstance]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize service
  const initializeService = async () => {
    try {
      setLoading(true);
      await loadInstances();
      await loadAutomationFlows();
      await loadCampaigns();
    } catch (error) {
      console.error('Error initializing service:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup Socket.IO connection
  const setupSocketConnection = () => {
    // Create WebSocket connection manually since socket.io-client is not installed
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log('✅ Conectado al servidor WhatsApp');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'qr_update') {
        setInstances(prev => prev.map(instance => 
          instance.instanceId === data.instanceId 
            ? { ...instance, qr: data.qr, status: data.status }
            : instance
        ));
      }
      
      if (data.type === 'status_update') {
        setInstances(prev => prev.map(instance => 
          instance.instanceId === data.instanceId 
            ? { ...instance, status: data.status, phoneNumber: data.phoneNumber }
            : instance
        ));
        
        if (data.status === 'connected' && selectedInstance === data.instanceId) {
          loadChats(data.instanceId);
        }
      }
      
      if (data.type === 'new_message') {
        if (selectedChat && data.fromNumber === selectedChat.phone_number) {
          setMessages(prev => [...prev, {
            id: data.messageId,
            instance_id: data.instanceId,
            from_number: data.fromNumber,
            to_number: 'self',
            message_text: data.text,
            timestamp: data.timestamp,
            is_from_me: false,
            status: 'received'
          }]);
        }
        
        // Update chat list
        if (selectedInstance === data.instanceId) {
          loadChats(data.instanceId);
        }
      }
      
      if (data.type === 'message_sent') {
        if (selectedChat && data.toNumber === selectedChat.phone_number) {
          setMessages(prev => [...prev, {
            id: data.messageId,
            instance_id: data.instanceId,
            from_number: 'self',
            to_number: data.toNumber,
            message_text: data.text,
            timestamp: data.timestamp,
            is_from_me: true,
            status: 'sent'
          }]);
        }
      }
    };

    ws.onclose = () => {
      console.log('🔌 Conexión WebSocket cerrada');
      // Reconnect after 5 seconds
      setTimeout(setupSocketConnection, 5000);
    };

    setSocket(ws);
  };

  // API Functions
  const loadInstances = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/instances`);
      const data = await response.json();
      setInstances(data.instances || []);
      
      if (data.instances?.length > 0 && !selectedInstance) {
        setSelectedInstance(data.instances[0].instanceId);
      }
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const createInstance = async () => {
    try {
      if (instances.length >= MAX_INSTANCES) {
        alert(`Máximo ${MAX_INSTANCES} instancias permitidas`);
        return;
      }

      setLoading(true);
      const response = await fetch(`${WHATSAPP_API_URL}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionName: `session_${Date.now()}` })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadInstances();
        setSelectedInstance(data.instanceId);
      }
    } catch (error) {
      console.error('Error creating instance:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/disconnect/${instanceId}`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
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

  const loadChats = async (instanceId: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/chats/${instanceId}`);
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (instanceId: string, phoneNumber: string) => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/messages/${instanceId}/${phoneNumber}`);
      const data = await response.json();
      setMessages(data.messages || []);
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

      const data = await response.json();
      
      if (data.success) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const loadAutomationFlows = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/flows`);
      const data = await response.json();
      setAutomationFlows(data.flows || []);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const createAutomationFlow = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flowForm.name,
          description: flowForm.description,
          triggerKeywords: flowForm.triggerKeywords.filter(k => k.trim()),
          steps: flowForm.steps.filter(s => s.content.trim())
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowFlowDialog(false);
        setFlowForm({
          name: '',
          description: '',
          triggerKeywords: [''],
          steps: [{ type: 'message', content: '', duration: 0 }]
        });
        await loadAutomationFlows();
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/campaigns`);
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const createCampaign = async () => {
    try {
      const response = await fetch(`${WHATSAPP_API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignForm.name,
          description: campaignForm.description,
          messageTemplate: campaignForm.messageTemplate,
          targetContacts: campaignForm.targetContacts.filter(c => c.phone.trim()),
          scheduledTime: campaignForm.scheduledTime || new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCampaignDialog(false);
        setCampaignForm({
          name: '',
          description: '',
          messageTemplate: '',
          targetContacts: [{ phone: '', name: '' }],
          scheduledTime: ''
        });
        await loadCampaigns();
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const executeCampaign = async (campaignId: string) => {
    if (!selectedInstance) {
      alert('Selecciona una instancia de WhatsApp conectada');
      return;
    }

    try {
      const response = await fetch(`${WHATSAPP_API_URL}/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId: selectedInstance })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        await loadCampaigns();
      }
    } catch (error) {
      console.error('Error executing campaign:', error);
    }
  };

  // Helper functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      connected: { variant: "default", icon: CheckCircle2, color: "text-green-600" },
      disconnected: { variant: "secondary", icon: WifiOff, color: "text-gray-600" },
      qr_ready: { variant: "outline", icon: QrCode, color: "text-blue-600" },
      error: { variant: "destructive", icon: AlertCircle, color: "text-red-600" }
    };

    const config = variants[status] || variants.disconnected;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {status === 'connected' ? 'Conectado' : 
         status === 'qr_ready' ? 'Escaneando QR' : 
         status === 'disconnected' ? 'Desconectado' : 
         'Error'}
      </Badge>
    );
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.phone_number.includes(searchTerm) || 
                         chat.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chat.last_message.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'unread') return matchesSearch && chat.unread_count > 0;
    return matchesSearch;
  });

  // Render components
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
                Sistema avanzado de automatización
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={createInstance}
              disabled={instances.length >= MAX_INSTANCES || loading}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Instancia ({instances.length}/{MAX_INSTANCES})
            </Button>
            
            <Button variant="outline" onClick={loadInstances}>
              <RefreshCw className="w-4 h-4" />
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
                    {instance.status === 'qr_ready' && instance.qr && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQR(instance.qr!);
                          setShowQRDialog(true);
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

          {/* Chat Search and Filter */}
          <div className="p-4 border-b">
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos los chats</option>
                <option value="unread">No leídos</option>
              </select>
            </div>
          </div>

          {/* Chat List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                    selectedChat?.id === chat.id
                      ? 'bg-blue-50 border-blue-200 border'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedChat(chat)}
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
                        <Badge variant="default" className="text-xs">
                          {chat.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
              {selectedChat ? (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {selectedChat.contact_name || selectedChat.phone_number}
                          </CardTitle>
                          <p className="text-sm text-gray-500">
                            {selectedChat.phone_number}
                          </p>
                        </div>
                      </div>
                      
                      {selectedChat.unread_count > 0 && (
                        <Badge variant="default">
                          {selectedChat.unread_count} no leídos
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <Separator />

                  <CardContent className="flex-1 flex flex-col p-0">
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.is_from_me
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.message_text}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  message.is_from_me
                                    ? 'text-blue-100'
                                    : 'text-gray-500'
                                }`}
                              >
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
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={sendMessage} disabled={!newMessage.trim()}>
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
                      Elige una conversación para comenzar a chatear
                    </p>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation" className="flex-1 m-4 mt-0">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Flujos de Automatización</CardTitle>
                      <p className="text-sm text-gray-500">
                        Configura respuestas automáticas inteligentes
                      </p>
                    </div>
                    <Button onClick={() => setShowFlowDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Flujo
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {automationFlows.map((flow) => (
                      <div key={flow.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{flow.name}</h3>
                          <Badge variant={flow.is_active ? "default" : "secondary"}>
                            {flow.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{flow.description}</p>
                        <p className="text-xs text-gray-500">
                          Palabras clave: {JSON.parse(flow.trigger_keywords).join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns" className="flex-1 m-4 mt-0">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Campañas de Marketing</CardTitle>
                      <p className="text-sm text-gray-500">
                        Gestiona campañas masivas y programadas
                      </p>
                    </div>
                    <Button onClick={() => setShowCampaignDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Campaña
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{campaign.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                campaign.status === 'completed' ? 'default' :
                                campaign.status === 'running' ? 'outline' :
                                campaign.status === 'scheduled' ? 'secondary' : 'destructive'
                              }
                            >
                              {campaign.status === 'completed' ? 'Completada' :
                               campaign.status === 'running' ? 'Ejecutando' :
                               campaign.status === 'scheduled' ? 'Programada' : 
                               'Error'}
                            </Badge>
                            {campaign.status === 'scheduled' && (
                              <Button
                                size="sm"
                                onClick={() => executeCampaign(campaign.id)}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Ejecutar
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            Enviados: {campaign.sent_count}/{campaign.total_count}
                          </span>
                          <span>
                            Creada: {formatDate(campaign.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="flex-1 m-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Flujos Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Zap className="w-8 h-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">
                          {automationFlows.filter(f => f.is_active).length}
                        </p>
                        <p className="text-xs text-gray-500">automatizaciones</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Campañas Este Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Target className="w-8 h-8 text-indigo-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">{campaigns.length}</p>
                        <p className="text-xs text-gray-500">campañas totales</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Tasa de Respuesta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-2xl font-bold">87%</p>
                        <p className="text-xs text-gray-500">promedio</p>
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
        </DialogContent>
      </Dialog>

      {/* Automation Flow Dialog */}
      <Dialog open={showFlowDialog} onOpenChange={setShowFlowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Flujo de Automatización</DialogTitle>
            <DialogDescription>
              Configura respuestas automáticas basadas en palabras clave
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={flowForm.name}
                  onChange={(e) => setFlowForm({...flowForm, name: e.target.value})}
                  placeholder="Ej: Saludo de bienvenida"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={flowForm.description}
                  onChange={(e) => setFlowForm({...flowForm, description: e.target.value})}
                  placeholder="Breve descripción del flujo"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Palabras Clave (separadas por comas)</label>
              <Input
                value={flowForm.triggerKeywords.join(', ')}
                onChange={(e) => setFlowForm({
                  ...flowForm, 
                  triggerKeywords: e.target.value.split(',').map(k => k.trim())
                })}
                placeholder="hola, buenos días, info"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Mensaje de Respuesta</label>
              <Textarea
                value={flowForm.steps[0]?.content || ''}
                onChange={(e) => setFlowForm({
                  ...flowForm,
                  steps: [{ type: 'message', content: e.target.value, duration: 0 }]
                })}
                placeholder="¡Hola! Gracias por contactarnos..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createAutomationFlow}>
              Crear Flujo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Campaign Dialog */}
      <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Campaña</DialogTitle>
            <DialogDescription>
              Configura una campaña de mensajes masivos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  placeholder="Ej: Promoción Febrero"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Input
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  placeholder="Breve descripción"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Mensaje de Campaña</label>
              <Textarea
                value={campaignForm.messageTemplate}
                onChange={(e) => setCampaignForm({...campaignForm, messageTemplate: e.target.value})}
                placeholder="¡Oferta especial! Descuento del 20% en todos nuestros productos..."
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Números de Teléfono (uno por línea)</label>
              <Textarea
                value={campaignForm.targetContacts.map(c => c.phone).join('\n')}
                onChange={(e) => setCampaignForm({
                  ...campaignForm,
                  targetContacts: e.target.value.split('\n')
                    .filter(line => line.trim())
                    .map(phone => ({ phone: phone.trim(), name: '' }))
                })}
                placeholder="541234567890&#10;541234567891&#10;541234567892"
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Fecha y Hora (opcional)</label>
              <Input
                type="datetime-local"
                value={campaignForm.scheduledTime}
                onChange={(e) => setCampaignForm({...campaignForm, scheduledTime: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCampaignDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={createCampaign}>
              Crear Campaña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppIntegration;
