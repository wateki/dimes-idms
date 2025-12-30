import React, { useContext } from 'react';
import { FormContext } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Trash2,
  Play
} from 'lucide-react';

export function OfflineSyncIndicator() {
  // Safely access FormContext - it might not be available in all layouts
  const formContext = useContext(FormContext);
  
  // If FormContext is not available, don't render the component
  if (!formContext) {
    return null;
  }
  
  const {
    isOnline,
    syncStatus,
    processOfflineQueue,
    retryFailedItems,
    clearOfflineQueue,
    getOfflineQueue,
    getFailedItems
  } = formContext;

  const queue = getOfflineQueue();
  const failedItems = getFailedItems();

  if (queue.length === 0 && isOnline) {
    return null; // Don't show anything when online and no queue
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          <span>
            {isOnline ? 'Online' : 'Offline'} - Sync Status
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            
            {syncStatus.pendingItems > 0 && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{syncStatus.pendingItems} Pending</span>
              </Badge>
            )}
            
            {syncStatus.failedItems > 0 && (
              <Badge variant="destructive" className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{syncStatus.failedItems} Failed</span>
              </Badge>
            )}
          </div>
          
          {syncStatus.lastSyncTime && (
            <span className="text-xs text-gray-500">
              Last sync: {syncStatus.lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Sync Progress */}
        {syncStatus.isSyncing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Syncing...</span>
              <span>{Math.round(syncStatus.syncProgress)}%</span>
            </div>
            <Progress value={syncStatus.syncProgress} className="h-2" />
          </div>
        )}

        {/* Queue Details */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Offline Queue ({queue.length} items)</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {queue.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <span className="capitalize">{item.type.replace('_', ' ')}</span>
                    <span className="text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.retryCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Retry {item.retryCount}/{item.maxRetries}
                      </Badge>
                    )}
                    {item.retryCount >= item.maxRetries && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
              {queue.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {queue.length - 5} more items
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {isOnline && syncStatus.pendingItems > 0 && (
            <Button
              size="sm"
              onClick={processOfflineQueue}
              disabled={syncStatus.isSyncing}
              className="flex items-center space-x-1"
            >
              <Play className="w-3 h-3" />
              <span>Sync Now</span>
            </Button>
          )}
          
          {failedItems.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={retryFailedItems}
              disabled={syncStatus.isSyncing}
              className="flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry Failed</span>
            </Button>
          )}
          
          {queue.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearOfflineQueue}
              className="flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Queue</span>
            </Button>
          )}
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>You're offline. Changes will be synced when you're back online.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


