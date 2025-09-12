import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar, Users, Target } from 'lucide-react';
import { getClientGrowthStats, getPOSClients } from '../../lib/pos-clients-service';

interface ClientGrowthChartProps {
  period: 'day' | 'week' | 'month';
}

interface ChartData {
  period: string;
  clients: number;
  label: string;
}

interface GrowthStats {
  stats: any[];
  currentPeriodCount: number;
  previousPeriodCount: number;
  growthPercentage: number;
}

export function ClientGrowthChart({ period }: ClientGrowthChartProps) {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    loadGrowthData();
  }, [period]);

  const loadGrowthData = async () => {
    try {
      setLoading(true);
      const [growthStats, allClients] = await Promise.all([
        getClientGrowthStats(period),
        getPOSClients()
      ]);
      setStats(growthStats);
      setTotalClients(allClients.length);
      
      // Generar datos para el gráfico
      const data = generateChartData(period, growthStats);
      setChartData(data);
    } catch (error) {
      console.error('Error loading growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (period: 'day' | 'week' | 'month', stats: GrowthStats): ChartData[] => {
    const data: ChartData[] = [];
    
    // Generar datos para los últimos períodos
    const periodsToShow = period === 'day' ? 7 : period === 'week' ? 4 : 6;
    
    for (let i = periodsToShow - 1; i >= 0; i--) {
      const date = new Date();
      let label = '';
      
      switch (period) {
        case 'day':
          date.setDate(date.getDate() - i);
          label = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
          break;
        case 'week':
          date.setDate(date.getDate() - (i * 7));
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          label = `Sem ${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
          break;
        case 'month':
          date.setMonth(date.getMonth() - i);
          label = date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
          break;
      }
      
      // Simular datos (en una implementación real, estos vendrían de Firebase)
      const clients = i === 0 ? stats.currentPeriodCount : Math.floor(Math.random() * 10) + 1;
      
      data.push({
        period: `period-${i}`,
        clients,
        label
      });
    }
    
    return data;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'Diario';
      case 'week': return 'Semanal';
      case 'month': return 'Mensual';
      default: return 'Período';
    }
  };

  const getMaxValue = () => {
    return Math.max(...chartData.map(d => d.clients), 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
        <p className="text-gray-500">No se pudieron cargar las estadísticas de crecimiento</p>
      </div>
    );
  }

  const maxValue = getMaxValue();

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Total Clientes</p>
              <p className="text-2xl font-bold text-blue-900">{totalClients}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Nuevos {getPeriodLabel()}</p>
              <p className="text-2xl font-bold text-green-900">{stats.currentPeriodCount}</p>
            </div>
            <Target className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Período Anterior</p>
              <p className="text-2xl font-bold text-purple-900">{stats.previousPeriodCount}</p>
            </div>
            <Calendar className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className={`${stats.growthPercentage >= 0 ? 'bg-green-50' : 'bg-red-50'} p-6 rounded-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${stats.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'} text-sm font-medium`}>
                Crecimiento
              </p>
              <p className={`text-2xl font-bold ${stats.growthPercentage >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {stats.growthPercentage >= 0 ? '+' : ''}{stats.growthPercentage.toFixed(1)}%
              </p>
            </div>
            {stats.growthPercentage >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {/* Growth Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Crecimiento de Clientes - Vista {getPeriodLabel()}
          </h3>
          <p className="text-gray-600">
            Nuevos clientes registrados en el período seleccionado
          </p>
        </div>

        <div className="space-y-4">
          {chartData.map((item, index) => (
            <div key={item.period} className="flex items-center space-x-4">
              <div className="w-16 text-sm font-medium text-gray-600">
                {item.label}
              </div>
              <div className="flex-1 flex items-center space-x-3">
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      index === chartData.length - 1
                        ? 'bg-blue-600'
                        : 'bg-blue-400'
                    }`}
                    style={{
                      width: `${maxValue > 0 ? (item.clients / maxValue) * 100 : 0}%`,
                      minWidth: item.clients > 0 ? '8px' : '0px'
                    }}
                  />
                  {item.clients > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {item.clients}
                      </span>
                    </div>
                  )}
                </div>
                <div className="w-12 text-right text-sm font-medium text-gray-900">
                  {item.clients}
                </div>
              </div>
            </div>
          ))}
        </div>

        {chartData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay datos para mostrar en el período seleccionado
          </div>
        )}
      </div>

      {/* Growth Analysis */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Crecimiento</h4>
        
        <div className="space-y-3">
          {stats.growthPercentage > 0 ? (
            <div className="flex items-center space-x-2 text-green-700">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">
                Crecimiento positivo del {stats.growthPercentage.toFixed(1)}%
              </span>
            </div>
          ) : stats.growthPercentage < 0 ? (
            <div className="flex items-center space-x-2 text-red-700">
              <TrendingDown className="w-5 h-5" />
              <span className="font-medium">
                Decrecimiento del {Math.abs(stats.growthPercentage).toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-700">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">Sin cambios respecto al período anterior</span>
            </div>
          )}

          <div className="text-gray-600 text-sm">
            {stats.currentPeriodCount > stats.previousPeriodCount ? (
              <>
                Se registraron <strong>{stats.currentPeriodCount - stats.previousPeriodCount}</strong> clientes más 
                que en el período anterior.
              </>
            ) : stats.currentPeriodCount < stats.previousPeriodCount ? (
              <>
                Se registraron <strong>{stats.previousPeriodCount - stats.currentPeriodCount}</strong> clientes menos 
                que en el período anterior.
              </>
            ) : (
              <>
                Se registró la misma cantidad de clientes que en el período anterior.
              </>
            )}
          </div>

          {totalClients > 0 && (
            <div className="text-gray-600 text-sm">
              Los nuevos clientes representan el{' '}
              <strong>
                {((stats.currentPeriodCount / totalClients) * 100).toFixed(1)}%
              </strong>{' '}
              del total de la base de clientes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
