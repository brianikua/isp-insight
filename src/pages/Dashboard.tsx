import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { TopResellersTable } from '@/components/dashboard/TopResellersTable';
import { RouterStatusList } from '@/components/dashboard/RouterStatusList';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatMbps, formatNumber } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Router, 
  Users, 
  Activity, 
  Gauge, 
  RefreshCw, 
  Bell,
  Plus
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    onlineRouters,
    totalRouters,
    totalSessions,
    totalBandwidthBps,
    resellerStats,
    routerStats,
    alerts,
    isLoading,
    refetchAll,
  } = useDashboardData();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const topResellers = resellerStats.slice(0, 5);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time overview of your ISP network
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/alerts')}>
                <Bell className="h-4 w-4 mr-2" />
                <Badge variant="destructive" className="ml-1">{alerts.length}</Badge>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Routers Online"
            value={`${onlineRouters} / ${totalRouters}`}
            subtitle={totalRouters === 0 ? "No routers configured" : undefined}
            icon={<Router className="h-5 w-5" />}
          />
          <StatsCard
            title="Active Sessions"
            value={formatNumber(totalSessions)}
            subtitle="PPPoE connections"
            icon={<Activity className="h-5 w-5" />}
          />
          <StatsCard
            title="Total Bandwidth"
            value={formatMbps(totalBandwidthBps)}
            subtitle="Combined usage"
            icon={<Gauge className="h-5 w-5" />}
          />
          <StatsCard
            title="Resellers"
            value={resellerStats.length}
            subtitle={`${resellerStats.filter(r => r.sessionCount > 0).length} active`}
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Empty state if no data */}
        {totalRouters === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Router className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Routers Configured</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Start by adding your MikroTik routers to begin monitoring PPPoE sessions and bandwidth usage.
              </p>
              <Button onClick={() => navigate('/routers')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Router
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main content grid */}
        {totalRouters > 0 && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Top Resellers Table */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Top Resellers by Bandwidth
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/resellers')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <TopResellersTable 
                  resellers={topResellers}
                  onResellerClick={(id) => navigate(`/resellers/${id}`)}
                />
              </CardContent>
            </Card>

            {/* Router Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Router Status
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/routers')}
                >
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                <RouterStatusList 
                  routers={routerStats}
                  onRouterClick={(id) => navigate(`/routers/${id}`)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
