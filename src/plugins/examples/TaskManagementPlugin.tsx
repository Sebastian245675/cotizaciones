// Task Management Plugin - Gestión de Tareas y Reuniones
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle,
  User,
  Users,
  AlertCircle,
  Star,
  Edit,
  Trash2,
  Filter,
  Search,
  CalendarDays,
  Video,
  MapPin,
  Bell,
  Flag,
  BookOpen
} from 'lucide-react';

// Interfaces
interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  dueDate: string;
  createdDate: string;
  createdBy: string;
  tags: string[];
  estimatedHours?: number;
  actualHours?: number;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  location: string;
  type: 'in-person' | 'virtual' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled';
  agenda?: string;
  meetingLink?: string;
  createdBy: string;
  createdDate: string;
}

const TaskManagementPlugin: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulated team members (in a real app, this would come from your user management system)
  const teamMembers = [
    { id: 'user1', name: 'Juan Pérez', email: 'juan@empresa.com' },
    { id: 'user2', name: 'María García', email: 'maria@empresa.com' },
    { id: 'user3', name: 'Carlos López', email: 'carlos@empresa.com' },
    { id: 'user4', name: 'Ana Martínez', email: 'ana@empresa.com' }
  ];

  // Load data from localStorage
  useEffect(() => {
    const storedTasks = localStorage.getItem('taskManagement_tasks');
    const storedMeetings = localStorage.getItem('taskManagement_meetings');
    
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
    if (storedMeetings) {
      setMeetings(JSON.parse(storedMeetings));
    }
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem('taskManagement_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Save meetings to localStorage
  useEffect(() => {
    localStorage.setItem('taskManagement_meetings', JSON.stringify(meetings));
  }, [meetings]);

  // Task Management Functions
  const createTask = (taskData: Omit<Task, 'id' | 'createdDate' | 'status'>) => {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(),
      status: 'pending',
      createdDate: new Date().toISOString()
    };
    setTasks([...tasks, newTask]);
  };

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // Meeting Management Functions
  const createMeeting = (meetingData: Omit<Meeting, 'id' | 'createdDate' | 'status'>) => {
    const newMeeting: Meeting = {
      ...meetingData,
      id: Date.now().toString(),
      status: 'scheduled',
      createdDate: new Date().toISOString()
    };
    setMeetings([...meetings, newMeeting]);
  };

  const updateMeeting = (meetingId: string, updates: Partial<Meeting>) => {
    setMeetings(meetings.map(meeting => 
      meeting.id === meetingId ? { ...meeting, ...updates } : meeting
    ));
  };

  const deleteMeeting = (meetingId: string) => {
    setMeetings(meetings.filter(meeting => meeting.id !== meetingId));
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = taskFilter === 'all' || task.status === taskFilter;
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="h-8 w-8 mr-3 text-blue-600" />
            Gestión de Tareas y Reuniones
          </h1>
          <p className="text-gray-600 mt-1">
            Organiza el trabajo de tu equipo y programa reuniones efectivas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsTaskDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
          <Button
            onClick={() => setIsMeetingDialogOpen(true)}
            variant="outline"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Nueva Reunión
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tareas Pendientes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {tasks.filter(t => t.status === 'pending').length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Progreso</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in-progress').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Próximas Reuniones</p>
                <p className="text-2xl font-bold text-purple-600">
                  {meetings.filter(m => m.status === 'scheduled').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks" className="flex items-center">
            <BookOpen className="h-4 w-4 mr-2" />
            Tareas
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Reuniones
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar tareas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="in-progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tasks List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{task.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingTask(task);
                          setIsTaskDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {task.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getPriorityColor(task.priority)}>
                      <Flag className="h-3 w-3 mr-1" />
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-1" />
                    {teamMembers.find(m => m.id === task.assignee)?.name || 'Sin asignar'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    Vence: {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                  {task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {task.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map(meeting => (
              <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingMeeting(meeting);
                          setIsMeetingDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMeeting(meeting.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {meeting.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                    <Badge variant="outline">
                      {meeting.type}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(meeting.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {meeting.startTime} - {meeting.endTime}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {meeting.location}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {meeting.attendees.length} participantes
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vista de Calendario</CardTitle>
              <CardDescription>
                Próximamente: Vista de calendario interactiva con todas las tareas y reuniones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>La vista de calendario se implementará en la próxima versión</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={(taskData) => {
          if (editingTask) {
            updateTask(editingTask.id, taskData);
          } else {
            createTask(taskData);
          }
          setIsTaskDialogOpen(false);
          setEditingTask(null);
        }}
        editingTask={editingTask}
        teamMembers={teamMembers}
      />

      {/* Meeting Dialog */}
      <MeetingDialog
        isOpen={isMeetingDialogOpen}
        onClose={() => {
          setIsMeetingDialogOpen(false);
          setEditingMeeting(null);
        }}
        onSave={(meetingData) => {
          if (editingMeeting) {
            updateMeeting(editingMeeting.id, meetingData);
          } else {
            createMeeting(meetingData);
          }
          setIsMeetingDialogOpen(false);
          setEditingMeeting(null);
        }}
        editingMeeting={editingMeeting}
        teamMembers={teamMembers}
      />
    </div>
  );
};

// Task Dialog Component
interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdDate' | 'status'>) => void;
  editingTask: Task | null;
  teamMembers: Array<{ id: string; name: string; email: string }>;
}

const TaskDialog: React.FC<TaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  teamMembers
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'medium' as Task['priority'],
    dueDate: '',
    createdBy: 'current-user',
    tags: [] as string[],
    estimatedHours: 0
  });

  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title,
        description: editingTask.description,
        assignee: editingTask.assignee,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate,
        createdBy: editingTask.createdBy,
        tags: editingTask.tags,
        estimatedHours: editingTask.estimatedHours || 0
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        dueDate: '',
        createdBy: 'current-user',
        tags: [],
        estimatedHours: 0
      });
    }
  }, [editingTask, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {editingTask ? 'Modifica los detalles de la tarea' : 'Crea una nueva tarea para tu equipo'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Asignar a</label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar persona" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={formData.priority}
                onValueChange={(value: Task['priority']) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Fecha límite</label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Horas estimadas</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingTask ? 'Actualizar' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Meeting Dialog Component
interface MeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (meeting: Omit<Meeting, 'id' | 'createdDate' | 'status'>) => void;
  editingMeeting: Meeting | null;
  teamMembers: Array<{ id: string; name: string; email: string }>;
}

const MeetingDialog: React.FC<MeetingDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingMeeting,
  teamMembers
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    attendees: [] as string[],
    location: '',
    type: 'in-person' as Meeting['type'],
    agenda: '',
    meetingLink: '',
    createdBy: 'current-user'
  });

  useEffect(() => {
    if (editingMeeting) {
      setFormData({
        title: editingMeeting.title,
        description: editingMeeting.description,
        date: editingMeeting.date,
        startTime: editingMeeting.startTime,
        endTime: editingMeeting.endTime,
        attendees: editingMeeting.attendees,
        location: editingMeeting.location,
        type: editingMeeting.type,
        agenda: editingMeeting.agenda || '',
        meetingLink: editingMeeting.meetingLink || '',
        createdBy: editingMeeting.createdBy
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        attendees: [],
        location: '',
        type: 'in-person',
        agenda: '',
        meetingLink: '',
        createdBy: 'current-user'
      });
    }
  }, [editingMeeting, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMeeting ? 'Editar Reunión' : 'Nueva Reunión'}
          </DialogTitle>
          <DialogDescription>
            {editingMeeting ? 'Modifica los detalles de la reunión' : 'Programa una nueva reunión'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Hora inicio</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Hora fin</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={formData.type}
                onValueChange={(value: Meeting['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">Presencial</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Ubicación</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Sala de juntas, Zoom, etc."
              />
            </div>
          </div>
          
          {formData.type === 'virtual' && (
            <div>
              <label className="text-sm font-medium">Enlace de reunión</label>
              <Input
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          )}
          
          <div>
            <label className="text-sm font-medium">Agenda</label>
            <Textarea
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              rows={3}
              placeholder="Puntos a tratar en la reunión..."
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {editingMeeting ? 'Actualizar' : 'Crear Reunión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaskManagementPlugin;