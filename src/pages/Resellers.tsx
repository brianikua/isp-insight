import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatMbps, formatBytes } from '@/lib/formatters';
import { toast } from 'sonner';
import { Plus, Users, Pencil, Trash2, Loader2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResellerForm {
  name: string;
  contact_email: string;
  contact_phone: string;
  bandwidth_cap_mbps: number | null;
  notes: string;
}

const defaultForm: ResellerForm = {
  name: '',
  contact_email: '',
  contact_phone: '',
  bandwidth_cap_mbps: null,
  notes: '',
};

type SortField = 'name' | 'bandwidth' | 'sessions' | 'data';
type SortOrder = 'asc' | 'desc';

export default function Resellers() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { resellerStats } = useDashboardData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<string | null>(null);
  const [form, setForm] = useState<ResellerForm>(defaultForm);
  const [sortField, setSortField] = useState<SortField>('bandwidth');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterText, setFilterText] = useState('');

  const { data: resellers, isLoading } = useQuery({
    queryKey: ['resellers-full'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (reseller: ResellerForm) => {
      const { error } = await supabase.from('resellers').insert(reseller);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['resellers-full'] });
      toast.success('Reseller added successfully');
      setIsDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (error) => {
      toast.error('Failed to add reseller: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, reseller }: { id: string; reseller: Partial<ResellerForm> }) => {
      const { error } = await supabase.from('resellers').update(reseller).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['resellers-full'] });
      toast.success('Reseller updated successfully');
      setIsDialogOpen(false);
      setEditingReseller(null);
      setForm(defaultForm);
    },
    onError: (error) => {
      toast.error('Failed to update reseller: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('resellers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['resellers-full'] });
      toast.success('Reseller deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete reseller: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingReseller) {
      updateMutation.mutate({ id: editingReseller, reseller: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (reseller: any) => {
    setEditingReseller(reseller.id);
    setForm({
      name: reseller.name,
      contact_email: reseller.contact_email || '',
      contact_phone: reseller.contact_phone || '',
      bandwidth_cap_mbps: reseller.bandwidth_cap_mbps,
      notes: reseller.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this reseller?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Combine reseller data with stats
  const resellerData = resellers?.map(reseller => {
    const stats = resellerStats.find(s => s.id === reseller.id);
    return {
      ...reseller,
      sessionCount: stats?.sessionCount || 0,
      bandwidthBps: stats?.bandwidthBps || 0,
      totalBytes: stats?.totalBytes || 0,
    };
  }) || [];

  // Filter and sort
  const filteredData = resellerData
    .filter(r => r.name.toLowerCase().includes(filterText.toLowerCase()))
    .sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'bandwidth':
          return multiplier * (a.bandwidthBps - b.bandwidthBps);
        case 'sessions':
          return multiplier * (a.sessionCount - b.sessionCount);
        case 'data':
          return multiplier * (a.totalBytes - b.totalBytes);
        default:
          return 0;
      }
    });

  const getUsageStatus = (bandwidthBps: number, capMbps: number | null) => {
    if (!capMbps) return { label: 'No Cap', variant: 'secondary' as const };
    const usagePercent = (bandwidthBps / 1000000 / capMbps) * 100;
    if (usagePercent >= 100) return { label: 'Exceeded', variant: 'destructive' as const };
    if (usagePercent >= 80) return { label: 'Warning', variant: 'warning' as const };
    return { label: 'OK', variant: 'default' as const };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Resellers</h1>
            <p className="text-muted-foreground">
              Manage reseller accounts and monitor their usage
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingReseller(null); setForm(defaultForm); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reseller
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingReseller ? 'Edit Reseller' : 'Add New Reseller'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Reseller Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="ABC Networks"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Email</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        value={form.contact_email}
                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                        placeholder="contact@abc.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Phone</Label>
                      <Input
                        id="contact_phone"
                        value={form.contact_phone}
                        onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                        placeholder="+254..."
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidth_cap">Bandwidth Cap (Mbps)</Label>
                    <Input
                      id="bandwidth_cap"
                      type="number"
                      value={form.bandwidth_cap_mbps || ''}
                      onChange={(e) => setForm({ 
                        ...form, 
                        bandwidth_cap_mbps: e.target.value ? parseInt(e.target.value) : null 
                      })}
                      placeholder="Leave empty for no cap"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Additional notes about this reseller"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingReseller ? 'Update' : 'Add Reseller'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-4">
          <Input
            placeholder="Filter by name..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Reseller
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('sessions')}
                  >
                    <div className="flex items-center justify-end gap-2">
                      Sessions
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
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
                      Data Used
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Cap</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No resellers found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((reseller) => {
                    const status = getUsageStatus(reseller.bandwidthBps, reseller.bandwidth_cap_mbps);
                    return (
                      <TableRow key={reseller.id}>
                        <TableCell className="font-medium">{reseller.name}</TableCell>
                        <TableCell className="text-right">{reseller.sessionCount}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatMbps(reseller.bandwidthBps)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatBytes(reseller.totalBytes)}
                        </TableCell>
                        <TableCell>
                          {reseller.bandwidth_cap_mbps 
                            ? `${reseller.bandwidth_cap_mbps} Mbps` 
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={status.variant === 'warning' ? 'outline' : status.variant}
                            className={cn(
                              status.variant === 'warning' && "border-yellow-500 text-yellow-600 bg-yellow-50"
                            )}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(reseller)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(reseller.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
