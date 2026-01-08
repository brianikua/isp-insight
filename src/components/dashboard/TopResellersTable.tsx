import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatMbps, formatBytes } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ResellerData {
  id: string;
  name: string;
  sessionCount: number;
  bandwidthBps: number;
  totalBytes: number;
  bandwidthCapMbps?: number;
}

interface TopResellersTableProps {
  resellers: ResellerData[];
  onResellerClick?: (id: string) => void;
}

export function TopResellersTable({ resellers, onResellerClick }: TopResellersTableProps) {
  const getUsageStatus = (bandwidthBps: number, capMbps?: number) => {
    if (!capMbps) return { label: 'No Cap', variant: 'secondary' as const };
    const usagePercent = (bandwidthBps / 1000000 / capMbps) * 100;
    if (usagePercent >= 100) return { label: 'Exceeded', variant: 'destructive' as const };
    if (usagePercent >= 80) return { label: 'Warning', variant: 'warning' as const };
    return { label: 'OK', variant: 'default' as const };
  };

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reseller</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">Bandwidth</TableHead>
            <TableHead className="text-right">Data Used</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resellers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No reseller data available
              </TableCell>
            </TableRow>
          ) : (
            resellers.map((reseller) => {
              const status = getUsageStatus(reseller.bandwidthBps, reseller.bandwidthCapMbps);
              return (
                <TableRow 
                  key={reseller.id}
                  className={cn("cursor-pointer hover:bg-muted/50", onResellerClick && "cursor-pointer")}
                  onClick={() => onResellerClick?.(reseller.id)}
                >
                  <TableCell className="font-medium">{reseller.name}</TableCell>
                  <TableCell className="text-right">{reseller.sessionCount}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatMbps(reseller.bandwidthBps)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatBytes(reseller.totalBytes)}
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
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
