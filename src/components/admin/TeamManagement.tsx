import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus,
  CalendarDays,
  Target,
  Briefcase,
  FileText,
  Star,
  Edit,
  Trash2,
  Eye,
  Send,
  Download,
  Upload,
  Filter,
  Search,
  MoreVertical,
  Video,
  MapPin,
  Bell,
  Archive,
  CheckCircle,
  XCircle,
  Timer,
  Flag,
  TrendingUp,
  BarChart3,
  PieChart,
  Users2,
  Award,
  Zap
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  skills: string[];
  joinDate: string;
  tasksCompleted: number;
  performance: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  assigneeId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'review' | 'completed';
  dueDate: string;
  createdDate: string;
  estimatedHours: number;
  actualHours?: number;
  tags: string[];
  department: string;
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  location: string;
  type: 'presencial' | 'virtual' | 'hibrida';
  attendees: string[];
  organizer: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  meetingUrl?: string;
  agenda: string[];
  notes?: string;
}

const TeamManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Estados para nuevos elementos
  const [newMember, setNewMember] = useState({
    name: '', email: '', role: '', department: '', skills: ''
  });
  const [newTask, setNewTask] = useState({
    title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '', estimatedHours: 1, tags: '', department: ''
  });
  const [newMeeting, setNewMeeting] = useState({
    title: '', description: '', date: '', time: '', duration: 60, location: '', type: 'virtual', attendees: [], agenda: ''
  });

  // Datos iniciales de ejemplo
  useEffect(() => {
    setTeamMembers([
      {
        id: '1',
        name: 'Ana García',
        email: 'ana@company.com',
        role: 'Desarrolladora Senior',
        department: 'Tecnología',
        status: 'online',
        skills: ['React', 'TypeScript', 'Node.js'],
        joinDate: '2023-01-15',
        tasksCompleted: 45,
        performance: 92
      },
      {
        id: '2',
        name: 'Carlos López',
        email: 'carlos@company.com',
        role: 'Diseñador UX/UI',
        department: 'Diseño',
        status: 'busy',
        skills: ['Figma', 'Adobe XD', 'Prototyping'],
        joinDate: '2023-03-20',
        tasksCompleted: 38,
        performance: 88
      },
      {
        id: '3',
        name: 'María Rodríguez',
        email: 'maria@company.com',
        role: 'Project Manager',
        department: 'Gestión',
        status: 'online',
        skills: ['Scrum', 'Kanban', 'Leadership'],
        joinDate: '2022-11-10',
        tasksCompleted: 67,
        performance: 95
      }
    ]);

    setTasks([
      {
        id: '1',
        title: 'Implementar autenticación OAuth',
        description: 'Integrar sistema de autenticación con Google y Facebook',
        assignee: 'Ana García',
        assigneeId: '1',
        priority: 'high',
        status: 'in-progress',
        dueDate: '2025-09-25',
        createdDate: '2025-09-20',
        estimatedHours: 8,
        actualHours: 5,
        tags: ['backend', 'security'],
        department: 'Tecnología'
      },
      {
        id: '2',
        title: 'Diseñar dashboard de analytics',
        description: 'Crear mockups y prototipos para el nuevo dashboard',
        assignee: 'Carlos López',
        assigneeId: '2',
        priority: 'medium',
        status: 'review',
        dueDate: '2025-09-28',
        createdDate: '2025-09-18',
        estimatedHours: 12,
        actualHours: 10,
        tags: ['design', 'ui'],
        department: 'Diseño'
      }
    ]);

    setMeetings([
      {
        id: '1',
        title: 'Reunión de Sprint Planning',
        description: 'Planificación del próximo sprint de desarrollo',
        date: '2025-09-24',
        time: '09:00',
        duration: 90,
        location: 'Sala de juntas A',
        type: 'presencial',
        attendees: ['1', '2', '3'],
        organizer: 'María Rodríguez',
        status: 'scheduled',
        agenda: ['Revisión del sprint anterior', 'Estimación de nuevas tareas', 'Asignación de responsabilidades']
      }
    ]);
  }, []);

  // Funciones para agregar elementos
  const handleAddMember = () => {
    const member: TeamMember = {
      id: Date.now().toString(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      department: newMember.department,
      status: 'offline',
      skills: newMember.skills.split(',').map(s => s.trim()),
      joinDate: new Date().toISOString().split('T')[0],
      tasksCompleted: 0,
      performance: 75
    };
    setTeamMembers([...teamMembers, member]);
    setNewMember({ name: '', email: '', role: '', department: '', skills: '' });
    setShowAddMember(false);
  };

  const handleAddTask = () => {
    const assignee = teamMembers.find(m => m.id === newTask.assigneeId);
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      assignee: assignee?.name || 'Sin asignar',
      assigneeId: newTask.assigneeId,
      priority: newTask.priority as Task['priority'],
      status: 'pending',
      dueDate: newTask.dueDate,
      createdDate: new Date().toISOString().split('T')[0],
      estimatedHours: newTask.estimatedHours,
      tags: newTask.tags.split(',').map(t => t.trim()),
      department: newTask.department
    };
    setTasks([...tasks, task]);
    setNewTask({ title: '', description: '', assigneeId: '', priority: 'medium', dueDate: '', estimatedHours: 1, tags: '', department: '' });
    setShowAddTask(false);
  };

  const handleAddMeeting = () => {
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title,
      description: newMeeting.description,
      date: newMeeting.date,
      time: newMeeting.time,
      duration: newMeeting.duration,
      location: newMeeting.location,
      type: newMeeting.type as Meeting['type'],
      attendees: newMeeting.attendees,
      organizer: 'Administrador',
      status: 'scheduled',
      agenda: newMeeting.agenda.split('\n').filter(item => item.trim())
    };
    setMeetings([...meetings, meeting]);
    setNewMeeting({ title: '', description: '', date: '', time: '', duration: 60, location: '', type: 'virtual', attendees: [], agenda: '' });
    setShowAddMeeting(false);
  };

  // Función para obtener color de estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-red-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'review': return 'bg-purple-500';
      case 'pending': return 'bg-gray-400';
      case 'high': return 'bg-red-500';
      case 'urgent': return 'bg-red-600';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  // Función para obtener icono de prioridad
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flag className="h-4 w-4 text-red-600" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gestión de Equipo</h1>
            <p className="text-blue-100">
              Gestiona tu equipo, asigna tareas, programa reuniones y potencia la colaboración
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="text-sm text-blue-200">Miembros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{tasks.filter(t => t.status !== 'completed').length}</div>
              <div className="text-sm text-blue-200">Tareas Activas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{meetings.filter(m => m.status === 'scheduled').length}</div>
              <div className="text-sm text-blue-200">Reuniones</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Equipo</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center space-x-2">
            <ClipboardList className="h-4 w-4" />
            <span>Tareas</span>
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Reuniones</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Analíticas</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI Cards */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Productividad</p>
                    <p className="text-2xl font-bold text-green-800">92%</p>
                  </div>
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-sky-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Tareas Completadas</p>
                    <p className="text-2xl font-bold text-blue-800">{tasks.filter(t => t.status === 'completed').length}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Reuniones del Mes</p>
                    <p className="text-2xl font-bold text-purple-800">{meetings.length}</p>
                  </div>
                  <CalendarDays className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Miembros Activos</p>
                    <p className="text-2xl font-bold text-orange-800">{teamMembers.filter(m => m.status === 'online').length}</p>
                  </div>
                  <Users2 className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Acciones Rápidas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center space-x-2 h-16 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-5 w-5" />
                  <span>Nueva Tarea</span>
                </Button>
                <Button 
                  onClick={() => setShowAddMeeting(true)}
                  className="flex items-center space-x-2 h-16 bg-purple-600 hover:bg-purple-700"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Programar Reunión</span>
                </Button>
                <Button 
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center space-x-2 h-16 bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Agregar Miembro</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Carlos López completó la tarea "Diseñar dashboard"</p>
                    <p className="text-xs text-gray-500">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Reunión de Sprint Planning programada para mañana</p>
                    <p className="text-xs text-gray-500">Hace 4 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Ana García se unió al proyecto</p>
                    <p className="text-xs text-gray-500">Ayer</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Miembros del Equipo</h2>
            <Button onClick={() => setShowAddMember(true)} className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Agregar Miembro</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white`}></div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Departamento:</span>
                      <Badge variant="outline">{member.department}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tareas completadas:</span>
                      <span className="font-medium">{member.tasksCompleted}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Performance:</span>
                      <span className={`font-medium ${member.performance >= 90 ? 'text-green-600' : member.performance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {member.performance}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Habilidades:</p>
                    <div className="flex flex-wrap gap-1">
                      {member.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Tareas</h2>
            <Button onClick={() => setShowAddTask(true)} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nueva Tarea</span>
            </Button>
          </div>

          {/* Filter controls */}
          <div className="flex space-x-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="review">En revisión</option>
              <option value="completed">Completado</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {tasks
              .filter(task => 
                (filterStatus === 'all' || task.status === filterStatus) &&
                (task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 task.assignee.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map((task) => (
              <Card key={task.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(task.priority)}
                      <Badge variant="outline" className={`${getStatusColor(task.status)} text-white border-transparent`}>
                        {task.status}
                      </Badge>
                    </div>
                    <MoreVertical className="h-4 w-4 text-gray-400 cursor-pointer" />
                  </div>
                  
                  <h3 className="font-semibold mb-2">{task.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Asignado a:</span>
                      <span className="font-medium">{task.assignee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fecha límite:</span>
                      <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimado:</span>
                      <span className="font-medium">{task.estimatedHours}h</span>
                    </div>
                  </div>

                  {task.tags.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Meetings Tab */}
        <TabsContent value="meetings" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Calendario de Reuniones</h2>
            <Button onClick={() => setShowAddMeeting(true)} className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Programar Reunión</span>
            </Button>
          </div>

          <div className="space-y-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{meeting.title}</h3>
                        <Badge variant="outline" className={`${getStatusColor(meeting.status)} text-white border-transparent`}>
                          {meeting.status}
                        </Badge>
                        <Badge variant="secondary">
                          {meeting.type}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{meeting.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{new Date(meeting.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{meeting.time} ({meeting.duration}min)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{meeting.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{meeting.attendees.length} asistentes</span>
                        </div>
                      </div>

                      {meeting.agenda.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium text-sm mb-2">Agenda:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {meeting.agenda.map((item, index) => (
                              <li key={index} className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      {meeting.type === 'virtual' && (
                        <Button size="sm" variant="outline" className="flex items-center space-x-1">
                          <Video className="h-3 w-3" />
                          <span>Unirse</span>
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="flex items-center space-x-1">
                        <Edit className="h-3 w-3" />
                        <span>Editar</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-2xl font-bold">Analíticas del Equipo</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance del Equipo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{member.name}</span>
                        <span>{member.performance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            member.performance >= 90 ? 'bg-green-500' : 
                            member.performance >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${member.performance}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Task Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Distribución de Tareas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['completed', 'in-progress', 'review', 'pending'].map((status) => {
                    const count = tasks.filter(t => t.status === status).length;
                    const percentage = (count / tasks.length) * 100;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
                          <span className="text-sm capitalize">{status}</span>
                        </div>
                        <span className="text-sm font-medium">{count} ({percentage.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>Resumen por Departamento</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from(new Set(teamMembers.map(m => m.department))).map((dept) => {
                    const deptMembers = teamMembers.filter(m => m.department === dept);
                    const deptTasks = tasks.filter(t => t.department === dept);
                    const avgPerformance = deptMembers.reduce((acc, m) => acc + m.performance, 0) / deptMembers.length;
                    
                    return (
                      <div key={dept} className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-3">{dept}</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Miembros:</span>
                            <span className="font-medium">{deptMembers.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tareas activas:</span>
                            <span className="font-medium">{deptTasks.filter(t => t.status !== 'completed').length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Performance promedio:</span>
                            <span className={`font-medium ${avgPerformance >= 90 ? 'text-green-600' : avgPerformance >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {avgPerformance.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal para agregar miembro */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Miembro</h3>
            <div className="space-y-4">
              <Input
                placeholder="Nombre completo"
                value={newMember.name}
                onChange={(e) => setNewMember({...newMember, name: e.target.value})}
              />
              <Input
                placeholder="Email"
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({...newMember, email: e.target.value})}
              />
              <Input
                placeholder="Rol/Posición"
                value={newMember.role}
                onChange={(e) => setNewMember({...newMember, role: e.target.value})}
              />
              <Input
                placeholder="Departamento"
                value={newMember.department}
                onChange={(e) => setNewMember({...newMember, department: e.target.value})}
              />
              <Input
                placeholder="Habilidades (separadas por coma)"
                value={newMember.skills}
                onChange={(e) => setNewMember({...newMember, skills: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddMember(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMember}>
                Agregar Miembro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar tarea */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nueva Tarea</h3>
            <div className="space-y-4">
              <Input
                placeholder="Título de la tarea"
                value={newTask.title}
                onChange={(e) => setNewTask({...newTask, title: e.target.value})}
              />
              <textarea
                placeholder="Descripción"
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                value={newTask.description}
                onChange={(e) => setNewTask({...newTask, description: e.target.value})}
              />
              <select
                value={newTask.assigneeId}
                onChange={(e) => setNewTask({...newTask, assigneeId: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="">Seleccionar asignado</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="low">Prioridad Baja</option>
                <option value="medium">Prioridad Media</option>
                <option value="high">Prioridad Alta</option>
                <option value="urgent">Urgente</option>
              </select>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
              />
              <Input
                type="number"
                placeholder="Horas estimadas"
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask({...newTask, estimatedHours: parseInt(e.target.value)})}
              />
              <Input
                placeholder="Tags (separados por coma)"
                value={newTask.tags}
                onChange={(e) => setNewTask({...newTask, tags: e.target.value})}
              />
              <Input
                placeholder="Departamento"
                value={newTask.department}
                onChange={(e) => setNewTask({...newTask, department: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddTask(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTask}>
                Crear Tarea
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar reunión */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Programar Reunión</h3>
            <div className="space-y-4">
              <Input
                placeholder="Título de la reunión"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
              />
              <textarea
                placeholder="Descripción"
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
                value={newMeeting.description}
                onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
              />
              <Input
                type="date"
                value={newMeeting.date}
                onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
              />
              <Input
                type="time"
                value={newMeeting.time}
                onChange={(e) => setNewMeeting({...newMeeting, time: e.target.value})}
              />
              <Input
                type="number"
                placeholder="Duración en minutos"
                value={newMeeting.duration}
                onChange={(e) => setNewMeeting({...newMeeting, duration: parseInt(e.target.value)})}
              />
              <Input
                placeholder="Ubicación"
                value={newMeeting.location}
                onChange={(e) => setNewMeeting({...newMeeting, location: e.target.value})}
              />
              <select
                value={newMeeting.type}
                onChange={(e) => setNewMeeting({...newMeeting, type: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="virtual">Virtual</option>
                <option value="presencial">Presencial</option>
                <option value="hibrida">Híbrida</option>
              </select>
              <textarea
                placeholder="Agenda (una línea por ítem)"
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={4}
                value={newMeeting.agenda}
                onChange={(e) => setNewMeeting({...newMeeting, agenda: e.target.value})}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddMeeting(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMeeting}>
                Programar Reunión
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;