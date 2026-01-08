import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatMbps, formatBytes, formatUptime } from '@/lib/formatters';
import { Activity, Loader2, ArrowUpDown } from 'lucide-react';

type SortField = 'username' | 'bandwidth' | 'uptime' | 'data';
type SortOrder = 'asc' | 'desc';

export default function Sessions() {
  const [filterText, setFilterText] = useState('');
  const [filterRouter, setFilterRouter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('bandwidth');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['pppoe_sessions_full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pppoe_sessions')
        .select(`
          *,
          routers:router_id(name),
          resellers:reseller_id(name)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: routers } = useQuery({
    queryKey: ['routers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredSessions = (sessions || [])
    .filter(s => {
      const matchesText = s.username.toLowerCase().includes(filterText.toLowerCase()) ||
        s.profile?.toLowerCase().includes(filterText.toLowerCase());
      const matchesRouter = filterRouter === 'all' || s.router_id === filterRouter;
      return matchesText && matchesRouter;
    })
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'username':
          return multiplier * a.username.localeCompare(b.username);
        case 'bandwidth':
          return multiplier * ((a.tx_rate_bps + a.rx_rate_bps) - (b.tx_rate_bps + b.rx_rate_bps));
        case 'uptime':
          return multiplier * ((a.uptime_seconds || 0) - (b.uptime_seconds || 0));
        case 'data':
          return multiplier * ((a.tx_bytes + a.rx_bytes) - (b.tx_bytes + b.rx_bytes));
        default:
          return 0;
      }
    });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Sessions</h1>
          <p className="text-muted-foreground">
            Monitor all active PPPoE connections across your network
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Input
            placeholder="Filter by username or profile..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterRouter} onValueChange={setFilterRouter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Routers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routers</SelectItem>
              {routers?.map(router => (
                <SelectItem key={router.id} value={router.id}>
                  {router.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-2">
                      Username
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Router</TableHead>
                  <TableHead>Reseller</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('bandwidth')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Bandwidth
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('data')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Data
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('uptime')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Uptime
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No active sessions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium font-mono text-sm">
                        {session.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{session.profile || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(session.routers as any)?.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(session.resellers as any)?.name || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {session.assigned_ip || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-sm text-green-600">
                            ↑ {formatMbps(session.tx_rate_bps || 0)}
                          </span>
                          <span className="font-mono text-sm text-blue-600">
                            ↓ {formatMbps(session.rx_rate_bps || 0)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatBytes((session.tx_bytes || 0) + (session.rx_bytes || 0))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatUptime(session.uptime_seconds || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Summary */}
        {!sessionsLoading && filteredSessions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredSessions.length} of {sessions?.length || 0} sessions
          </div>
        )}
      </div>
    </MainLayout>
  );
}
