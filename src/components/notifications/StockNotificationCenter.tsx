import React, { useState } from 'react';
import { Bell, Package, AlertTriangle, AlertCircle, Trash2, CheckCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useStockNotifications, StockNotification } from '@/hooks/useStockNotifications';

interface StockNotificationCenterProps {
  className?: string;
}

export const StockNotificationCenter: React.FC<StockNotificationCenterProps> = ({ className }) => {
  const {
    notifications,
    isConnected,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    checkStockNow,
  } = useStockNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  const handleCheckStock = async () => {
    setIsCheckingStock(true);
    try {
      await checkStockNow();
    } finally {
      setIsCheckingStock(false);
    }
  };

  const getNotificationIcon = (notification: StockNotification) => {
    switch (notification.ui.icon) {
      case 'alert-triangle':
        return <AlertTriangle className="w-4 h-4" style={{ color: notification.ui.color }} />;
      case 'alert-circle':
        return <AlertCircle className="w-4 h-4" style={{ color: notification.ui.color }} />;
      case 'package':
        return <Package className="w-4 h-4" style={{ color: notification.ui.color }} />;
      default:
        return <Bell className="w-4 h-4" style={{ color: notification.ui.color }} />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "relative hover:bg-gray-50 transition-colors",
            className
          )}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-96 p-0"
        sideOffset={8}
      >
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="font-semibold">Notificaciones de Stock</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nuevas
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCheckStock}
                disabled={isCheckingStock}
                className="h-8 w-8 p-0"
                title="Verificar stock ahora"
              >
                <RefreshCw className={cn(
                  "w-3 h-3",
                  isCheckingStock && "animate-spin"
                )} />
              </Button>
              {notifications.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-8 w-8 p-0"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="h-8 w-8 p-0"
                    title="Limpiar notificaciones"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            {isConnected ? 'Conectado' : 'Desconectado'}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Package className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones de stock</p>
              <p className="text-xs text-gray-400 mt-1">Las alertas aparecerán aquí</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <DropdownMenuItem
                    className={cn(
                      "flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors",
                      getPriorityColor(notification.priority)
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">
                          {notification.message.title}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatTime(notification.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message.description}
                      </p>
                      
                      {notification.product && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            Stock: {notification.product.currentStock}
                          </Badge>
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            Mín: {notification.product.minStock}
                          </Badge>
                        </div>
                      )}
                      
                      {notification.summary && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <Badge variant="destructive" className="text-xs px-2 py-0">
                            {notification.summary.outOfStockCount} agotados
                          </Badge>
                          <Badge variant="secondary" className="text-xs px-2 py-0">
                            {notification.summary.lowStockCount} stock bajo
                          </Badge>
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  
                  {index < notifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  // Aquí podrías abrir un modal o navegar a la página de inventario
                  setIsOpen(false);
                }}
              >
                Ver inventario completo
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StockNotificationCenter;