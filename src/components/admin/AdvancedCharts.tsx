import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, BarChart3, PieChart, Activity, 
  Zap, Target, ArrowUpRight, ArrowDownRight, DollarSign,
  Clock, Users, ShoppingCart, Star, Award, Flame
} from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  color: string;
  percentage?: number;
  trend?: number;
}

interface AdvancedChartsProps {
  salesData: ChartData[];
  departmentData: ChartData[];
  hourlyData: ChartData[];
  paymentMethods: ChartData[];
}

// Helper function to safely format numbers
const formatCurrency = (value: number | undefined | null): string => {
  return (value || 0).toLocaleString();
};

// Componente de gráfico de barras animado
const AnimatedBarChart: React.FC<{ 
  data: ChartData[]; 
  title: string; 
  height?: number;
  showValues?: boolean;
}> = ({ data, title, height = 200, showValues = true }) => {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, value: 0 })));
  const maxValue = Math.max(...data.map(d => d.value));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4" style={{ height: `${height}px` }}>
          {animatedData.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium text-gray-700 truncate">
                {item.label}
              </div>
              <div className="flex-1 relative">
                <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${item.color} relative`}
                    style={{ 
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                      transitionDelay: `${index * 100}ms`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  </div>
                  {showValues && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-bold text-gray-700">
                      ${formatCurrency(item.value)}
                    </div>
                  )}
                </div>
              </div>
              {item.trend !== undefined && (
                <div className={`flex items-center space-x-1 ${item.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.trend >= 0 ? 
                    <ArrowUpRight className="h-4 w-4" /> : 
                    <ArrowDownRight className="h-4 w-4" />
                  }
                  <span className="text-sm font-medium">{Math.abs(item.trend).toFixed(1)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de gráfico donut animado
const AnimatedDonutChart: React.FC<{ 
  data: ChartData[]; 
  title: string;
  size?: number;
  centerValue?: string;
  centerLabel?: string;
}> = ({ data, title, size = 200, centerValue, centerLabel }) => {
  const [animatedData, setAnimatedData] = useState(data.map(d => ({ ...d, value: 0 })));
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 500);
    return () => clearTimeout(timer);
  }, [data]);

  let cumulativePercentage = 0;

  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-purple-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={(size / 2) - 20}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="16"
            />
            {animatedData.map((item, index) => {
              const percentage = total > 0 ? (item.value / total) * 100 : 0;
              const strokeDasharray = `${percentage * 2.51} 251`;
              const strokeDashoffset = -cumulativePercentage * 2.51;
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={index}
                  cx={size / 2}
                  cy={size / 2}
                  r={(size / 2) - 20}
                  fill="none"
                  stroke={item.color.replace('bg-', '').includes('blue') ? '#3b82f6' :
                         item.color.replace('bg-', '').includes('green') ? '#10b981' :
                         item.color.replace('bg-', '').includes('purple') ? '#8b5cf6' :
                         item.color.replace('bg-', '').includes('yellow') ? '#f59e0b' : '#6b7280'}
                  strokeWidth="16"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                  style={{ transitionDelay: `${index * 200}ms` }}
                />
              );
            })}
          </svg>
          
          {/* Centro del donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && (
              <div className="text-2xl font-bold text-gray-800">{centerValue}</div>
            )}
            {centerLabel && (
              <div className="text-sm text-gray-600">{centerLabel}</div>
            )}
          </div>
        </div>

        {/* Leyenda */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div 
                className={`w-4 h-4 rounded-full ${item.color}`}
                style={{ 
                  backgroundColor: item.color.replace('bg-', '').includes('blue') ? '#3b82f6' :
                                   item.color.replace('bg-', '').includes('green') ? '#10b981' :
                                   item.color.replace('bg-', '').includes('purple') ? '#8b5cf6' :
                                   item.color.replace('bg-', '').includes('yellow') ? '#f59e0b' : '#6b7280'
                }}
              ></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 truncate">{item.label}</div>
                <div className="text-xs text-gray-500">
                  ${formatCurrency(item.value)} ({total > 0 ? (((item.value || 0) / total) * 100).toFixed(1) : 0}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente de métricas en tiempo real
const RealTimeMetrics: React.FC<{ 
  metrics: {
    label: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    color: string;
    change: number;
  }[];
}> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card key={index} className={`bg-gradient-to-br ${metric.color} shadow-xl border-0 transform hover:scale-105 transition-all duration-300`}>
          <CardContent className="p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                {React.cloneElement(metric.icon as React.ReactElement, { className: "h-6 w-6" })}
              </div>
              <div className={`flex items-center space-x-1 ${metric.change >= 0 ? 'text-green-100' : 'text-red-100'}`}>
                {metric.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">{metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%</span>
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(metric.value)}{metric.unit}
              </div>
              <div className="text-sm text-white/80">{metric.label}</div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Componente de línea de tiempo de transacciones
const TransactionTimeline: React.FC<{ 
  transactions: {
    time: string;
    type: string;
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed';
  }[];
}> = ({ transactions }) => {
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-xl border border-white/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600" />
          Timeline de Transacciones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-64 overflow-y-auto">
          {transactions.map((transaction, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  transaction.status === 'completed' ? 'bg-green-500' :
                  transaction.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{transaction.description}</div>
                    <div className="text-sm text-gray-500">{transaction.time} • {transaction.type}</div>
                  </div>
                  <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount >= 0 ? '+' : ''}${formatCurrency(Math.abs(transaction.amount || 0))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Componente principal de gráficos avanzados
export const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ 
  salesData, 
  departmentData, 
  hourlyData, 
  paymentMethods 
}) => {
  const totalSales = salesData.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Métricas en tiempo real
  const realTimeMetrics = [
    {
      label: "Ventas por Hora",
      value: Math.round(totalSales / 8),
      unit: "",
      icon: <TrendingUp />,
      color: "from-blue-500 to-blue-600",
      change: 12.5
    },
    {
      label: "Transacciones",
      value: 147,
      unit: "",
      icon: <ShoppingCart />,
      color: "from-green-500 to-green-600",
      change: 8.3
    },
    {
      label: "Clientes Únicos",
      value: 89,
      unit: "",
      icon: <Users />,
      color: "from-purple-500 to-purple-600",
      change: -2.1
    },
    {
      label: "Ticket Promedio",
      value: Math.round(totalSales / 147),
      unit: "",
      icon: <DollarSign />,
      color: "from-orange-500 to-orange-600",
      change: 15.7
    }
  ];

  // Transacciones de ejemplo
  const recentTransactions = [
    { time: "14:32", type: "Venta", amount: 2500, description: "Venta - Electrónicos", status: "completed" as const },
    { time: "14:28", type: "Entrada", amount: 5000, description: "Depósito inicial", status: "completed" as const },
    { time: "14:25", type: "Venta", amount: 1200, description: "Venta - Ropa", status: "pending" as const },
    { time: "14:20", type: "Devolución", amount: -800, description: "Devolución - Hogar", status: "completed" as const },
    { time: "14:15", type: "Venta", amount: 3200, description: "Venta - Deportes", status: "completed" as const },
  ];

  return (
    <div className="space-y-8">
      {/* Métricas en tiempo real */}
      <RealTimeMetrics metrics={realTimeMetrics} />
      
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatedBarChart 
          data={departmentData} 
          title="Ventas por Departamento" 
          height={300}
        />
        
        <AnimatedDonutChart 
          data={paymentMethods} 
          title="Métodos de Pago" 
          size={250}
          centerValue={`$${formatCurrency(totalSales)}`}
          centerLabel="Total Ventas"
        />
      </div>
      
      {/* Gráficos adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AnimatedBarChart 
          data={hourlyData} 
          title="Ventas por Hora" 
          height={250}
          showValues={false}
        />
        
        <TransactionTimeline transactions={recentTransactions} />
      </div>

      {/* Indicadores de performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 border-green-200">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
              <Star className="h-8 w-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-green-700 mb-2">94%</div>
            <div className="text-green-600 font-medium">Satisfacción Cliente</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-blue-700 mb-2">87%</div>
            <div className="text-blue-600 font-medium">Eficiencia Operacional</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500 rounded-full mb-4">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div className="text-3xl font-bold text-purple-700 mb-2">A+</div>
            <div className="text-purple-600 font-medium">Calificación General</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedCharts;
