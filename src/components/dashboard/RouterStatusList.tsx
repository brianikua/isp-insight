import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Router, Wifi, WifiOff } from 'lucide-react';

interface RouterStatus {
  id: string;
  name: string;
  siteName?: string;
  isOnline: boolean;
  sessionCount: number;
  lastSeen?: string;
}

interface RouterStatusListProps {
  routers: RouterStatus[];
  onRouterClick?: (id: string) => void;
}

export function RouterStatusList({ routers, onRouterClick }: RouterStatusListProps) {
  const onlineCount = routers.filter(r => r.isOnline).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
        <span>{onlineCount} of {routers.length} online</span>
      </div>
      
      {routers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Router className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No routers configured</p>
        </div>
      ) : (
        <div className="space-y-2">
          {routers.map((router) => (
            <div
              key={router.id}
              onClick={() => onRouterClick?.(router.id)}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border border-border",
                "hover:bg-muted/50 transition-colors cursor-pointer"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  router.isOnline ? "bg-green-500/10" : "bg-red-500/10"
                )}>
                  {router.isOnline ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{router.name}</p>
                  {router.siteName && (
                    <p className="text-xs text-muted-foreground">{router.siteName}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={router.isOnline ? "default" : "secondary"}>
                  {router.sessionCount} sessions
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
