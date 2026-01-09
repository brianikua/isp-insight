import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, User } from 'lucide-react';

interface UserMappingsEditorProps {
  resellerId: string;
  disabled?: boolean;
}

export function UserMappingsEditor({ resellerId, disabled }: UserMappingsEditorProps) {
  const queryClient = useQueryClient();
  const [newUsername, setNewUsername] = useState('');

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['reseller-mappings', resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reseller_user_mappings')
        .select('id, pppoe_username')
        .eq('reseller_id', resellerId)
        .order('pppoe_username');
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (username: string) => {
      const { error } = await supabase.from('reseller_user_mappings').insert({
        reseller_id: resellerId,
        pppoe_username: username,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-mappings', resellerId] });
      queryClient.invalidateQueries({ queryKey: ['pppoe_sessions'] });
      toast.success('User mapping added');
      setNewUsername('');
    },
    onError: (error) => {
      toast.error('Failed to add mapping: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reseller_user_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-mappings', resellerId] });
      queryClient.invalidateQueries({ queryKey: ['pppoe_sessions'] });
      toast.success('User mapping removed');
    },
    onError: (error) => {
      toast.error('Failed to remove mapping: ' + error.message);
    },
  });

  const handleAdd = () => {
    if (!newUsername.trim()) return;
    addMutation.mutate(newUsername.trim());
  };

  return (
    <div className="space-y-3">
      <Label>Manual User Mappings</Label>
      <p className="text-sm text-muted-foreground">
        Explicitly assign PPPoE usernames to this reseller
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading mappings...
        </div>
      ) : (
        <>
          {mappings && mappings.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mappings.map((mapping) => (
                <Badge 
                  key={mapping.id} 
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <User className="h-3 w-3" />
                  <span className="font-mono">{mapping.pppoe_username}</span>
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-destructive/20"
                      onClick={() => deleteMutation.mutate(mapping.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
          )}

          {!disabled && (
            <div className="flex gap-2">
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="PPPoE username"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAdd}
                disabled={addMutation.isPending}
              >
                {addMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {(!mappings || mappings.length === 0) && !disabled && (
            <p className="text-sm text-muted-foreground italic">
              No manual mappings. Users can be auto-detected via rules above.
            </p>
          )}
        </>
      )}
    </div>
  );
}
