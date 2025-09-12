import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, FileText, X } from 'lucide-react';
import { useQuotes } from '@/hooks/use-quotes';
import { toast } from '@/hooks/use-toast';

interface QuoteNotificationsProps {
  onQuoteClick?: () => void;
}

const QuoteNotifications: React.FC<QuoteNotificationsProps> = ({ onQuoteClick }) => {
  const { getStats, getRecentSubmissions } = useQuotes();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [showNotification, setShowNotification] = useState(false);
  const [newQuotesCount, setNewQuotesCount] = useState(0);

  useEffect(() => {
    const checkForNewQuotes = () => {
      const recentSubmissions = getRecentSubmissions(1); // Últimas 24 horas
      const newSubmissions = recentSubmissions.filter(
        submission => submission.createdAt > lastCheck
      );

      if (newSubmissions.length > 0) {
        setNewQuotesCount(newSubmissions.length);
        setShowNotification(true);
        
        // Mostrar toast de notificación
        toast({
          title: "Nueva cotización recibida",
          description: `${newSubmissions.length} nueva${newSubmissions.length > 1 ? 's' : ''} cotización${newSubmissions.length > 1 ? 'es' : ''} pendiente${newSubmissions.length > 1 ? 's' : ''}`,
          duration: 5000,
        });
      }

      setLastCheck(new Date());
    };

    // Verificar cada 30 segundos
    const interval = setInterval(checkForNewQuotes, 30000);

    return () => clearInterval(interval);
  }, [lastCheck, getRecentSubmissions]);

  const handleNotificationClick = () => {
    setShowNotification(false);
    setNewQuotesCount(0);
    onQuoteClick?.();
  };

  const { pendingSubmissions } = getStats();

  if (!showNotification && pendingSubmissions === 0) {
    return null;
  }

  return (
    <div className="relative">
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-blue-200 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Nueva cotización</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {newQuotesCount} nueva{newQuotesCount > 1 ? 's' : ''} cotización{newQuotesCount > 1 ? 'es' : ''} recibida{newQuotesCount > 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleNotificationClick}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Ver ahora
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setShowNotification(false)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge indicator for pending quotes */}
      {pendingSubmissions > 0 && (
        <Badge 
          className="bg-orange-500 text-white animate-pulse cursor-pointer"
          onClick={handleNotificationClick}
        >
          <Bell className="h-3 w-3 mr-1" />
          {pendingSubmissions} pendiente{pendingSubmissions > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
};

export default QuoteNotifications;
