import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatBytes, formatMbps, formatUptime } from "@/lib/formatters";
import {
  DetectionRule,
  parseDetectionRules,
} from "@/components/resellers/DetectionRulesEditor";
import { Loader2, Users } from "lucide-react";

type ResellerRow = {
  id: string;
  name: string;
  detection_rules: DetectionRule[];
};

type UserMappingRow = {
  reseller_id: string;
  pppoe_username: string;
};

type SessionRow = {
  id: string;
  router_id: string;
  reseller_id: string | null;
  username: string;
  profile: string | null;
  comment: string | null;
  assigned_ip: string | null;
  uptime_seconds: number | null;
  tx_rate_bps: number | null;
  rx_rate_bps: number | null;
  tx_bytes: number | null;
  rx_bytes: number | null;
  routers?: { name: string } | null;
};

function safeLower(s: string | null | undefined) {
  return (s || "").toLowerCase();
}

export default function ResellerSessions() {
  const { data: resellers, isLoading: resellersLoading } = useQuery({
    queryKey: ["resellers", "breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resellers")
        .select("id, name, detection_rules")
        .order("name");
      if (error) throw error;

      return (data || []).map((r) => ({
        id: r.id,
        name: r.name,
        detection_rules: parseDetectionRules(r.detection_rules),
      })) as ResellerRow[];
    },
    refetchInterval: 30000,
  });

  const { data: userMappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["reseller_user_mappings", "breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_user_mappings")
        .select("reseller_id, pppoe_username");
      if (error) throw error;
      return (data || []) as UserMappingRow[];
    },
    refetchInterval: 30000,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["pppoe_sessions", "active", "breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pppoe_sessions")
        .select(
          "id, router_id, reseller_id, username, profile, comment, assigned_ip, uptime_seconds, tx_rate_bps, rx_rate_bps, tx_bytes, rx_bytes, routers:router_id(name)",
        )
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as SessionRow[];
    },
    refetchInterval: 30000,
  });

  const isLoading = resellersLoading || mappingsLoading || sessionsLoading;

  const matchSessionToReseller = (session: SessionRow): string | null => {
    // 1) Manual mappings (highest priority)
    const manual = userMappings?.find((m) => m.pppoe_username === session.username);
    if (manual) return manual.reseller_id;

    // 2) Direct reseller_id (if already present)
    if (session.reseller_id) return session.reseller_id;

    // 3) Detection rules
    for (const reseller of resellers || []) {
      for (const rule of reseller.detection_rules || []) {
        if (rule.type === "prefix" && session.username.startsWith(rule.value)) {
          return reseller.id;
        }
        if (
          rule.type === "profile" &&
          session.profile &&
          safeLower(session.profile) === safeLower(rule.value)
        ) {
          return reseller.id;
        }
        if (
          rule.type === "comment" &&
          session.comment &&
          safeLower(session.comment).includes(safeLower(rule.value))
        ) {
          return reseller.id;
        }
      }
    }

    return null;
  };

  const computed = useMemo(() => {
    const activeSessions = sessions || [];
    const resellerList = resellers || [];

    const byReseller = new Map<string, SessionRow[]>();
    const unmatched: SessionRow[] = [];

    for (const s of activeSessions) {
      const resellerId = matchSessionToReseller(s);
      if (!resellerId) {
        unmatched.push(s);
        continue;
      }
      const existing = byReseller.get(resellerId) || [];
      existing.push(s);
      byReseller.set(resellerId, existing);
    }

    const resellerGroups = resellerList
      .map((r) => {
        const groupSessions = byReseller.get(r.id) || [];
        const bandwidthBps = groupSessions.reduce(
          (sum, s) => sum + (s.tx_rate_bps || 0) + (s.rx_rate_bps || 0),
          0,
        );
        const totalBytes = groupSessions.reduce(
          (sum, s) => sum + (s.tx_bytes || 0) + (s.rx_bytes || 0),
          0,
        );

        return {
          reseller: r,
          sessions: groupSessions,
          bandwidthBps,
          totalBytes,
        };
      })
      .filter((g) => g.sessions.length > 0)
      .sort((a, b) => b.bandwidthBps - a.bandwidthBps);

    const matchedCount = resellerGroups.reduce((sum, g) => sum + g.sessions.length, 0);
    const unmatchedBandwidthBps = unmatched.reduce(
      (sum, s) => sum + (s.tx_rate_bps || 0) + (s.rx_rate_bps || 0),
      0,
    );
    const unmatchedBytes = unmatched.reduce(
      (sum, s) => sum + (s.tx_bytes || 0) + (s.rx_bytes || 0),
      0,
    );

    const totalBandwidthBps = resellerGroups.reduce((sum, g) => sum + g.bandwidthBps, 0) + unmatchedBandwidthBps;

    return {
      resellerGroups,
      unmatched,
      totals: {
        resellerCountWithSessions: resellerGroups.length,
        totalSessions: activeSessions.length,
        matchedSessions: matchedCount,
        unmatchedSessions: unmatched.length,
        totalBandwidthBps,
        unmatchedBandwidthBps,
        unmatchedBytes,
      },
    };
  }, [sessions, resellers, userMappings]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions by Reseller</h1>
          <p className="text-muted-foreground">
            Individual PPPoE users grouped by reseller (manual mappings + detection rules)
          </p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "—" : computed.totals.totalSessions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Matched Sessions</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "—" : computed.totals.matchedSessions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Unmatched Sessions</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "—" : computed.totals.unmatchedSessions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Bandwidth</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {isLoading ? "—" : formatMbps(computed.totals.totalBandwidthBps)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : computed.resellerGroups.length === 0 && computed.unmatched.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <p className="text-sm">No active sessions found.</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full">
                {computed.resellerGroups.map((group) => (
                  <AccordionItem key={group.reseller.id} value={group.reseller.id}>
                    <AccordionTrigger className="px-4">
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 text-left">
                          <p className="truncate font-medium">{group.reseller.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMbps(group.bandwidthBps)} • {formatBytes(group.totalBytes)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="tabular-nums">
                          {group.sessions.length} users
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Profile</TableHead>
                              <TableHead>Router</TableHead>
                              <TableHead>IP</TableHead>
                              <TableHead className="text-right">Bandwidth</TableHead>
                              <TableHead className="text-right">Data</TableHead>
                              <TableHead className="text-right">Uptime</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.sessions.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-mono text-sm font-medium">
                                  {s.username}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{s.profile || "-"}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {s.routers?.name || "-"}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {s.assigned_ip || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex flex-col items-end">
                                    <span className="font-mono text-sm">
                                      ↑ {formatMbps(s.tx_rate_bps || 0)}
                                    </span>
                                    <span className="font-mono text-sm text-muted-foreground">
                                      ↓ {formatMbps(s.rx_rate_bps || 0)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatBytes((s.tx_bytes || 0) + (s.rx_bytes || 0))}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatUptime(s.uptime_seconds || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}

                {computed.unmatched.length > 0 && (
                  <AccordionItem value="unmatched">
                    <AccordionTrigger className="px-4">
                      <div className="flex w-full items-center justify-between gap-4">
                        <div className="min-w-0 text-left">
                          <p className="truncate font-medium">Unmatched</p>
                          <p className="text-xs text-muted-foreground">
                            {formatMbps(computed.totals.unmatchedBandwidthBps)} • {formatBytes(computed.totals.unmatchedBytes)}
                          </p>
                        </div>
                        <Badge variant="destructive" className="tabular-nums">
                          {computed.unmatched.length} users
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Profile</TableHead>
                              <TableHead>Router</TableHead>
                              <TableHead>IP</TableHead>
                              <TableHead className="text-right">Bandwidth</TableHead>
                              <TableHead className="text-right">Data</TableHead>
                              <TableHead className="text-right">Uptime</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {computed.unmatched.map((s) => (
                              <TableRow key={s.id}>
                                <TableCell className="font-mono text-sm font-medium">
                                  {s.username}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{s.profile || "-"}</Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {s.routers?.name || "-"}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {s.assigned_ip || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="inline-flex flex-col items-end">
                                    <span className="font-mono text-sm">
                                      ↑ {formatMbps(s.tx_rate_bps || 0)}
                                    </span>
                                    <span className="font-mono text-sm text-muted-foreground">
                                      ↓ {formatMbps(s.rx_rate_bps || 0)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatBytes((s.tx_bytes || 0) + (s.rx_bytes || 0))}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {formatUptime(s.uptime_seconds || 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
