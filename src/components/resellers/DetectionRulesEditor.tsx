import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

export interface DetectionRule {
  type: 'prefix' | 'profile' | 'comment';
  value: string;
}

interface DetectionRulesEditorProps {
  rules: DetectionRule[];
  onChange: (rules: DetectionRule[]) => void;
  disabled?: boolean;
}

export function DetectionRulesEditor({ rules, onChange, disabled }: DetectionRulesEditorProps) {
  const [newRuleType, setNewRuleType] = useState<'prefix' | 'profile' | 'comment'>('prefix');
  const [newRuleValue, setNewRuleValue] = useState('');

  const handleAddRule = () => {
    if (!newRuleValue.trim()) return;
    onChange([...rules, { type: newRuleType, value: newRuleValue.trim() }]);
    setNewRuleValue('');
  };

  const handleRemoveRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const getRuleLabel = (type: string) => {
    switch (type) {
      case 'prefix': return 'Username Prefix';
      case 'profile': return 'PPPoE Profile';
      case 'comment': return 'Comment Pattern';
      default: return type;
    }
  };

  const getRuleBadgeVariant = (type: string) => {
    switch (type) {
      case 'prefix': return 'default';
      case 'profile': return 'secondary';
      case 'comment': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-3">
      <Label>Detection Rules</Label>
      <p className="text-sm text-muted-foreground">
        Define how PPPoE sessions are matched to this reseller
      </p>
      
      {/* Current rules */}
      {rules.length > 0 && (
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
            >
              <Badge variant={getRuleBadgeVariant(rule.type) as 'default' | 'secondary' | 'outline'}>
                {getRuleLabel(rule.type)}
              </Badge>
              <span className="flex-1 font-mono text-sm">{rule.value}</span>
              {!disabled && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveRule(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new rule */}
      {!disabled && (
        <div className="flex gap-2">
          <Select 
            value={newRuleType} 
            onValueChange={(v) => setNewRuleType(v as 'prefix' | 'profile' | 'comment')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prefix">Username Prefix</SelectItem>
              <SelectItem value="profile">PPPoE Profile</SelectItem>
              <SelectItem value="comment">Comment Pattern</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={newRuleValue}
            onChange={(e) => setNewRuleValue(e.target.value)}
            placeholder={
              newRuleType === 'prefix' ? 'e.g., reseller1_' :
              newRuleType === 'profile' ? 'e.g., reseller-50mbps' :
              'e.g., ABC Networks'
            }
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRule())}
          />
          <Button type="button" variant="outline" size="icon" onClick={handleAddRule}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {rules.length === 0 && !disabled && (
        <p className="text-sm text-muted-foreground italic">
          No rules defined. Add rules or use manual user mappings.
        </p>
      )}
    </div>
  );
}

// Helper to parse JSON rules from database
export function parseDetectionRules(json: Json | null): DetectionRule[] {
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
