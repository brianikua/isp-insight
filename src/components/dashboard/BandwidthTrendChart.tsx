import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface UsagePoint {
  recorded_at: string;
  avg_bandwidth_mbps: number | null;
  session_count: number | null;
  router_id: string | null;
  reseller_id: string | null;
}

interface ChartDataPoint {
  time: string;
  bandwidth: number;
  sessions: number;
}

interface BandwidthTrendChartProps {
  routerId?: string;
  resellerId?: string;
  hours?: number;
}

export function BandwidthTrendChart({ routerId, resellerId, hours = 24 }: BandwidthTrendChartProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['usage-history', routerId, resellerId, hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('usage_history')
        .select('recorded_at, avg_bandwidth_mbps, session_count, router_id, reseller_id')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

      if (routerId) {
        query = query.eq('router_id', routerId);
      } else if (resellerId) {
        query = query.eq('reseller_id', resellerId);
      } else {
        // Show router-level data aggregated
        query = query.not('router_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UsagePoint[];
    },
    refetchInterval: 60000,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No usage history data yet. Data will appear after polling cycles run.
      </div>
    );
  }

  // Aggregate by timestamp (group points at same time)
  const timeMap = new Map<string, { bandwidth: number; sessions: number; count: number }>();
  for (const point of data) {
    const timeKey = format(new Date(point.recorded_at), 'HH:mm');
    const existing = timeMap.get(timeKey) || { bandwidth: 0, sessions: 0, count: 0 };
    existing.bandwidth += point.avg_bandwidth_mbps || 0;
    existing.sessions += point.session_count || 0;
    existing.count += 1;
    timeMap.set(timeKey, existing);
  }

  const chartData: ChartDataPoint[] = Array.from(timeMap.entries()).map(([time, val]) => ({
    time,
    bandwidth: Math.round(val.bandwidth * 100) / 100,
    sessions: val.sessions,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="time" 
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 11 }}
        />
        <YAxis 
          yAxisId="bw"
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 11 }}
          label={{ value: 'Mbps', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground text-xs' }}
        />
        <YAxis 
          yAxisId="sess"
          orientation="right"
          className="text-xs fill-muted-foreground"
          tick={{ fontSize: 11 }}
          label={{ value: 'Sessions', angle: 90, position: 'insideRight', className: 'fill-muted-foreground text-xs' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
            color: 'hsl(var(--card-foreground))',
          }}
        />
        <Legend />
        <Line
          yAxisId="bw"
          type="monotone"
          dataKey="bandwidth"
          name="Bandwidth (Mbps)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="sess"
          type="monotone"
          dataKey="sessions"
          name="Sessions"
          stroke="hsl(var(--accent-foreground))"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
