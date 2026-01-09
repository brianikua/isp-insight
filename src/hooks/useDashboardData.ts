import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface RouterData {
  id: string;
  name: string;
  site_name: string | null;
  is_online: boolean;
  last_seen_at: string | null;
}

interface DetectionRule {
  type: 'prefix' | 'profile' | 'comment';
  value: string;
}

export interface ResellerData {
  id: string;
  name: string;
  bandwidth_cap_mbps: number | null;
  detection_rules: DetectionRule[];
}

export interface SessionData {
  id: string;
  router_id: string;
  reseller_id: string | null;
  username: string;
  profile: string | null;
  comment: string | null;
  tx_rate_bps: number;
  rx_rate_bps: number;
  tx_bytes: number;
  rx_bytes: number;
  is_active: boolean;
}

interface UserMapping {
  reseller_id: string;
  pppoe_username: string;
}

function parseDetectionRules(json: Json | null): DetectionRule[] {
  if (!json || !Array.isArray(json)) return [];
  const rules: DetectionRule[] = [];
  for (const r of json) {
    if (
      typeof r === 'object' && 
      r !== null && 
      'type' in r && 
      'value' in r &&
      typeof (r as Record<string, unknown>).type === 'string' &&
      typeof (r as Record<string, unknown>).value === 'string'
    ) {
      rules.push({
        type: (r as Record<string, unknown>).type as 'prefix' | 'profile' | 'comment',
        value: (r as Record<string, unknown>).value as string,
      });
    }
  }
  return rules;
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
        .select('id, name, bandwidth_cap_mbps, detection_rules')
        .order('name');
      if (error) throw error;
      return data.map(r => ({
        ...r,
        detection_rules: parseDetectionRules(r.detection_rules),
      })) as ResellerData[];
    },
    refetchInterval: 30000,
  });

  const sessionsQuery = useQuery({
    queryKey: ['pppoe_sessions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pppoe_sessions')
        .select('id, router_id, reseller_id, username, profile, comment, tx_rate_bps, rx_rate_bps, tx_bytes, rx_bytes, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return data as SessionData[];
    },
    refetchInterval: 30000,
  });

  const userMappingsQuery = useQuery({
    queryKey: ['reseller-user-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reseller_user_mappings')
        .select('reseller_id, pppoe_username');
      if (error) throw error;
      return data as UserMapping[];
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
  const userMappings = userMappingsQuery.data || [];

  const onlineRouters = routers.filter(r => r.is_online).length;
  const totalSessions = sessions.length;

  // Calculate total bandwidth
  const totalBandwidthBps = sessions.reduce((sum, s) => sum + (s.tx_rate_bps || 0) + (s.rx_rate_bps || 0), 0);

  // Match session to reseller using detection rules and manual mappings
  const matchSessionToReseller = (session: SessionData): string | null => {
    // 1. Check manual user mappings first (highest priority)
    const manualMapping = userMappings.find(m => m.pppoe_username === session.username);
    if (manualMapping) return manualMapping.reseller_id;

    // 2. Check if session already has reseller_id from database
    if (session.reseller_id) return session.reseller_id;

    // 3. Apply detection rules
    for (const reseller of resellers) {
      for (const rule of reseller.detection_rules) {
        switch (rule.type) {
          case 'prefix':
            if (session.username.startsWith(rule.value)) return reseller.id;
            break;
          case 'profile':
            if (session.profile && session.profile.toLowerCase() === rule.value.toLowerCase()) return reseller.id;
            break;
          case 'comment':
            if (session.comment && session.comment.toLowerCase().includes(rule.value.toLowerCase())) return reseller.id;
            break;
        }
      }
    }

    return null;
  };

  // Aggregate reseller stats with detection rules applied
  const resellerStats = resellers.map(reseller => {
    const resellerSessions = sessions.filter(s => matchSessionToReseller(s) === reseller.id);
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

  const isLoading = routersQuery.isLoading || resellersQuery.isLoading || sessionsQuery.isLoading || userMappingsQuery.isLoading;
  const error = routersQuery.error || resellersQuery.error || sessionsQuery.error || userMappingsQuery.error;

  const refetchAll = () => {
    routersQuery.refetch();
    resellersQuery.refetch();
    sessionsQuery.refetch();
    alertsQuery.refetch();
    userMappingsQuery.refetch();
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
