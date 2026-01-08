import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RouterData {
  id: string;
  name: string;
  site_name: string | null;
  is_online: boolean;
  last_seen_at: string | null;
}

export interface ResellerData {
  id: string;
  name: string;
  bandwidth_cap_mbps: number | null;
}

export interface SessionData {
  id: string;
  router_id: string;
  reseller_id: string | null;
  username: string;
  tx_rate_bps: number;
  rx_rate_bps: number;
  tx_bytes: number;
  rx_bytes: number;
  is_active: boolean;
}

export interface AlertData {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

export function useDashboardData() {
  const routersQuery = useQuery({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routers')
        .select('id, name, site_name, is_online, last_seen_at')
        .order('name');
      if (error) throw error;
      return data as RouterData[];
    },
    refetchInterval: 30000,
  });

  const resellersQuery = useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('id, name, bandwidth_cap_mbps')
        .order('name');
      if (error) throw error;
      return data as ResellerData[];
    },
    refetchInterval: 30000,
  });

  const sessionsQuery = useQuery({
    queryKey: ['pppoe_sessions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pppoe_sessions')
        .select('id, router_id, reseller_id, username, tx_rate_bps, rx_rate_bps, tx_bytes, rx_bytes, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return data as SessionData[];
    },
    refetchInterval: 30000,
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, alert_type, message, severity, is_read, created_at')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as AlertData[];
    },
    refetchInterval: 30000,
  });

  // Aggregate data for dashboard
  const routers = routersQuery.data || [];
  const resellers = resellersQuery.data || [];
  const sessions = sessionsQuery.data || [];
  const alerts = alertsQuery.data || [];

  const onlineRouters = routers.filter(r => r.is_online).length;
  const totalSessions = sessions.length;

  // Calculate total bandwidth
  const totalBandwidthBps = sessions.reduce((sum, s) => sum + (s.tx_rate_bps || 0) + (s.rx_rate_bps || 0), 0);

  // Aggregate reseller stats
  const resellerStats = resellers.map(reseller => {
    const resellerSessions = sessions.filter(s => s.reseller_id === reseller.id);
    const bandwidthBps = resellerSessions.reduce((sum, s) => sum + (s.tx_rate_bps || 0) + (s.rx_rate_bps || 0), 0);
    const totalBytes = resellerSessions.reduce((sum, s) => sum + (s.tx_bytes || 0) + (s.rx_bytes || 0), 0);
    
    return {
      id: reseller.id,
      name: reseller.name,
      sessionCount: resellerSessions.length,
      bandwidthBps,
      totalBytes,
      bandwidthCapMbps: reseller.bandwidth_cap_mbps || undefined,
    };
  }).sort((a, b) => b.bandwidthBps - a.bandwidthBps);

  // Calculate router session counts
  const routerStats = routers.map(router => {
    const routerSessions = sessions.filter(s => s.router_id === router.id);
    return {
      id: router.id,
      name: router.name,
      siteName: router.site_name || undefined,
      isOnline: router.is_online,
      sessionCount: routerSessions.length,
      lastSeen: router.last_seen_at || undefined,
    };
  });

  const isLoading = routersQuery.isLoading || resellersQuery.isLoading || sessionsQuery.isLoading;
  const error = routersQuery.error || resellersQuery.error || sessionsQuery.error;

  const refetchAll = () => {
    routersQuery.refetch();
    resellersQuery.refetch();
    sessionsQuery.refetch();
    alertsQuery.refetch();
  };

  return {
    routers,
    resellers,
    sessions,
    alerts,
    onlineRouters,
    totalRouters: routers.length,
    totalSessions,
    totalBandwidthBps,
    resellerStats,
    routerStats,
    isLoading,
    error,
    refetchAll,
  };
}
