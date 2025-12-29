import { useEffect, useCallback } from 'react';
import { websocketClient } from '@/api/websocket';
import { WS_EVENTS } from '@/config/api';
import { toast } from 'sonner';

export function useWebSocket() {
  useEffect(() => {
    // Connect to WebSocket when component mounts
    websocketClient.connect();
    
    return () => {
      // Disconnect when component unmounts
      websocketClient.disconnect();
    };
  }, []);

  const subscribe = useCallback((event, callback) => {
    return websocketClient.subscribe(event, callback);
  }, []);

  const send = useCallback((event, payload) => {
    websocketClient.send(event, payload);
  }, []);

  const isConnected = useCallback(() => {
    return websocketClient.isConnected();
  }, []);

  return {
    subscribe,
    send,
    isConnected,
    connectionId: websocketClient.getConnectionId(),
  };
}

// Hook for procurement real-time updates
export function useProcurementUpdates() {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribeOrder = subscribe(WS_EVENTS.ORDER_CREATED, (order) => {
      toast.success('New procurement order created', {
        description: `Order #${order.id} for ${order.quantity} tons`,
      });
    });

    const unsubscribeOrderUpdate = subscribe(WS_EVENTS.ORDER_UPDATED, (order) => {
      toast.info('Order status updated', {
        description: `Order #${order.id} is now ${order.status}`,
      });
    });

    const unsubscribeRisk = subscribe(WS_EVENTS.RISK_ALERT, (alert) => {
      toast.warning('New risk alert', {
        description: alert.title,
        duration: 10000,
      });
    });

    const unsubscribeHarvest = subscribe(WS_EVENTS.HARVEST_READY, (harvest) => {
      toast.info('Harvest ready', {
        description: `${harvest.farmer_name}'s ${harvest.crop} is ready for harvest`,
      });
    });

    return () => {
      unsubscribeOrder();
      unsubscribeOrderUpdate();
      unsubscribeRisk();
      unsubscribeHarvest();
    };
  }, [subscribe]);

  return { subscribe };
}

// Hook for real-time notifications
export function useRealTimeNotifications(refetchNotifications) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(WS_EVENTS.NOTIFICATION, (notification) => {
      // Show toast notification
      toast.info(notification.title, {
        description: notification.message,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to notification or take action
          },
        },
      });

      // Refetch notifications list
      if (refetchNotifications) {
        refetchNotifications();
      }
    });

    return unsubscribe;
  }, [subscribe, refetchNotifications]);
}

// Hook for real-time dashboard updates
export function useDashboardUpdates(refetchDashboard) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const events = [
      WS_EVENTS.ORDER_CREATED,
      WS_EVENTS.FARMER_UPDATED,
      WS_EVENTS.CROP_PROGRESS_UPDATED,
      WS_EVENTS.RISK_ALERT,
    ];

    const unsubscribers = events.map(event => 
      subscribe(event, () => {
        if (refetchDashboard) {
          refetchDashboard();
        }
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, refetchDashboard]);
}