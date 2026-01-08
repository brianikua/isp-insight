import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Router, Wifi, WifiOff, Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouterForm {
  name: string;
  site_name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  routeros_version: string;
}

const defaultForm: RouterForm = {
  name: '',
  site_name: '',
  host: '',
  port: 8728,
  username: 'admin',
  password: '',
  routeros_version: 'v7',
};

export default function Routers() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRouter, setEditingRouter] = useState<string | null>(null);
  const [form, setForm] = useState<RouterForm>(defaultForm);

  const { data: routers, isLoading } = useQuery({
    queryKey: ['routers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (router: RouterForm) => {
      const { error } = await supabase.from('routers').insert(router);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routers'] });
      toast.success('Router added successfully');
      setIsDialogOpen(false);
      setForm(defaultForm);
    },
    onError: (error) => {
      toast.error('Failed to add router: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, router }: { id: string; router: Partial<RouterForm> }) => {
      const { error } = await supabase.from('routers').update(router).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routers'] });
      toast.success('Router updated successfully');
      setIsDialogOpen(false);
      setEditingRouter(null);
      setForm(defaultForm);
    },
    onError: (error) => {
      toast.error('Failed to update router: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routers'] });
      toast.success('Router deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete router: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRouter) {
      updateMutation.mutate({ id: editingRouter, router: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (router: any) => {
    setEditingRouter(router.id);
    setForm({
      name: router.name,
      site_name: router.site_name || '',
      host: router.host,
      port: router.port,
      username: router.username,
      password: router.password,
      routeros_version: router.routeros_version || 'v7',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this router?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRouter(null);
    setForm(defaultForm);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Routers</h1>
            <p className="text-muted-foreground">
              Manage your MikroTik router connections
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingRouter(null); setForm(defaultForm); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Router
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingRouter ? 'Edit Router' : 'Add New Router'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Router Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Core Router 1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="site_name">Site Name</Label>
                      <Input
                        id="site_name"
                        value={form.site_name}
                        onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                        placeholder="Nairobi DC"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="host">Host / IP</Label>
                      <Input
                        id="host"
                        value={form.host}
                        onChange={(e) => setForm({ ...form, host: e.target.value })}
                        placeholder="192.168.1.1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="port">API Port</Label>
                      <Input
                        id="port"
                        type="number"
                        value={form.port}
                        onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="routeros_version">RouterOS Version</Label>
                    <Select
                      value={form.routeros_version}
                      onValueChange={(value) => setForm({ ...form, routeros_version: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="v6">RouterOS v6</SelectItem>
                        <SelectItem value="v7">RouterOS v7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingRouter ? 'Update' : 'Add Router'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Seen</TableHead>
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
                ) : routers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Router className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No routers configured yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  routers?.map((router) => (
                    <TableRow key={router.id}>
                      <TableCell>
                        <div className={cn(
                          "p-2 rounded-lg w-fit",
                          router.is_online ? "bg-green-500/10" : "bg-red-500/10"
                        )}>
                          {router.is_online ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{router.name}</TableCell>
                      <TableCell>{router.site_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{router.host}:{router.port}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{router.routeros_version}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {router.last_seen_at 
                          ? new Date(router.last_seen_at).toLocaleString()
                          : 'Never'
                        }
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(router)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(router.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
