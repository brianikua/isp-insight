import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, MinusCircle, Loader2, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestStep {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration_ms?: number;
}

interface TestResult {
  success: boolean;
  router_name: string;
  total_ms?: number;
  steps: TestStep[];
  error?: string;
}

interface RouterTestDialogProps {
  routerId: string;
  routerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RouterTestDialog({ routerId, routerName, open, onOpenChange }: RouterTestDialogProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-router`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ router_id: routerId }),
        }
      );
      const data: TestResult = await response.json();
      setResult(data);
    } catch (e) {
      setResult({
        success: false,
        router_name: routerName,
        steps: [],
        error: e instanceof Error ? e.message : 'Network error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) setResult(null);
  };

  const StepIcon = ({ status }: { status: TestStep['status'] }) => {
    if (status === 'pass') return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />;
    if (status === 'fail') return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
    return <MinusCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Connection Diagnostics — {routerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !testing && (
            <p className="text-sm text-muted-foreground">
              Runs a step-by-step connectivity check: network reachability, REST API access, and PPPoE session listing.
            </p>
          )}

          {testing && (
            <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Running diagnostics…</span>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              {/* Overall status */}
              <div className={cn(
                "flex items-center justify-between rounded-lg px-4 py-3",
                result.success ? "bg-green-500/10 border border-green-500/20" : "bg-destructive/10 border border-destructive/20"
              )}>
                <div className="flex items-center gap-2">
                  {result.success
                    ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                    : <XCircle className="h-5 w-5 text-destructive" />
                  }
                  <span className="font-medium text-sm">
                    {result.success ? 'All checks passed' : 'Connection issues detected'}
                  </span>
                </div>
                {result.total_ms != null && (
                  <span className="text-xs text-muted-foreground">{result.total_ms}ms total</span>
                )}
              </div>

              {result.error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {result.error}
                </div>
              )}

              {result.steps.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {result.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <StepIcon status={step.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{step.name}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs px-1.5 py-0",
                                step.status === 'pass' && "border-green-500/30 text-green-600",
                                step.status === 'fail' && "border-destructive/30 text-destructive",
                                step.status === 'skip' && "border-muted text-muted-foreground",
                              )}
                            >
                              {step.status}
                            </Badge>
                            {step.duration_ms != null && (
                              <span className="text-xs text-muted-foreground">{step.duration_ms}ms</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button>
            <Button onClick={runTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
              {result ? 'Run Again' : 'Run Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
