import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Clock, Users, TrendingUp } from 'lucide-react';
import { useQuotes } from '@/hooks/use-quotes';

interface QuotesDashboardProps {
  onViewQuotes?: () => void;
}

const QuotesDashboard: React.FC<QuotesDashboardProps> = ({ onViewQuotes }) => {
  const { getStats, getRecentSubmissions, loading } = useQuotes();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getStats();
  const recentSubmissions = getRecentSubmissions(7); // Últimos 7 días

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {/* Total Quotes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cotizaciones</p>
              <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      {/* Pending Quotes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingSubmissions}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>

      {/* Active Forms */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Formularios Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeForms}</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* This Week */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Esta Semana</p>
              <p className="text-2xl font-bold text-purple-600">{recentSubmissions.length}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Quotes Overview */}
      <Card className="md:col-span-2 xl:col-span-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Cotizaciones Recientes
            </CardTitle>
            {stats.totalSubmissions > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onViewQuotes}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Todas
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sin cotizaciones recientes</h3>
              <p className="text-muted-foreground">
                Las cotizaciones aparecerán aquí cuando los clientes las envíen
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.slice(0, 5).map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{submission.formName}</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission.customerEmail || 'Sin email'} • {submission.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={
                        submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        submission.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        submission.status === 'responded' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {submission.status === 'pending' ? 'Pendiente' :
                       submission.status === 'reviewed' ? 'Revisado' :
                       submission.status === 'responded' ? 'Respondido' : 'Cerrado'}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {recentSubmissions.length > 5 && (
                <div className="text-center pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onViewQuotes}
                  >
                    Ver {recentSubmissions.length - 5} más...
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuotesDashboard;
