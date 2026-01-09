import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouterConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  routeros_version: string
  use_https?: boolean
}

interface PPPoESession {
  name: string
  service: string
  'caller-id'?: string
  address?: string
  uptime?: string
  'session-id'?: string
  comment?: string
  profile?: string
  'tx-byte'?: string
  'rx-byte'?: string
  'tx-rate'?: string
  'rx-rate'?: string
}

// Parse MikroTik uptime format to seconds
function parseUptime(uptime: string | undefined): number {
  if (!uptime) return 0
  let seconds = 0
  const weeks = uptime.match(/(\d+)w/)
  const days = uptime.match(/(\d+)d/)
  const hours = uptime.match(/(\d+)h/)
  const mins = uptime.match(/(\d+)m/)
  const secs = uptime.match(/(\d+)s/)
  
  if (weeks) seconds += parseInt(weeks[1]) * 7 * 24 * 60 * 60
  if (days) seconds += parseInt(days[1]) * 24 * 60 * 60
  if (hours) seconds += parseInt(hours[1]) * 60 * 60
  if (mins) seconds += parseInt(mins[1]) * 60
  if (secs) seconds += parseInt(secs[1])
  
  return seconds
}

// Parse MikroTik rate format (e.g., "10Mbps", "1.5kbps") to bps
function parseRate(rate: string | undefined): number {
  if (!rate) return 0
  const match = rate.match(/^([\d.]+)([kKmMgG]?)bps$/i)
  if (!match) return 0
  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 'k': return Math.round(value * 1000)
    case 'm': return Math.round(value * 1000000)
    case 'g': return Math.round(value * 1000000000)
    default: return Math.round(value)
  }
}

// Poll a single router using REST API (RouterOS v7)
async function pollRouterREST(router: RouterConfig): Promise<{
  sessions: PPPoESession[]
  isOnline: boolean
  error?: string
}> {
  const protocol = router.use_https !== false ? 'https' : 'http'
  const baseUrl = `${protocol}://${router.host}`
  const authHeader = 'Basic ' + btoa(`${router.username}:${router.password}`)
  
  try {
    // Fetch active PPPoE sessions
    const response = await fetch(`${baseUrl}/rest/ppp/active`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        return { sessions: [], isOnline: true, error: 'Authentication failed' }
      }
      return { sessions: [], isOnline: false, error: `HTTP ${response.status}` }
    }
    
    const sessions = await response.json() as PPPoESession[]
    return { sessions, isOnline: true }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    // Check if it's a network error (router offline) vs other errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return { sessions: [], isOnline: false, error: 'Router unreachable' }
    }
    return { sessions: [], isOnline: false, error: errorMessage }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body for optional router_id filter
    let routerId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        routerId = body.router_id || null
      } catch {
        // No body or invalid JSON, poll all routers
      }
    }

    // Fetch routers to poll
    let routersQuery = supabase
      .from('routers')
      .select('id, name, host, port, username, password, routeros_version')
    
    if (routerId) {
      routersQuery = routersQuery.eq('id', routerId)
    }
    
    const { data: routers, error: routersError } = await routersQuery
    
    if (routersError) {
      throw new Error(`Failed to fetch routers: ${routersError.message}`)
    }

    if (!routers || routers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No routers to poll', polled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { routerId: string; routerName: string; sessionCount: number; isOnline: boolean; error?: string }[] = []

    // Poll each router
    for (const router of routers) {
      console.log(`Polling router: ${router.name} (${router.host})`)
      
      // Only support RouterOS v7 REST API for now
      if (router.routeros_version !== 'v7') {
        console.log(`Skipping ${router.name}: RouterOS ${router.routeros_version} not supported (v7 REST API required)`)
        results.push({
          routerId: router.id,
          routerName: router.name,
          sessionCount: 0,
          isOnline: false,
          error: 'Only RouterOS v7 REST API is supported'
        })
        continue
      }

      const pollResult = await pollRouterREST(router as RouterConfig)
      
      // Update router online status
      await supabase
        .from('routers')
        .update({
          is_online: pollResult.isOnline,
          last_seen_at: pollResult.isOnline ? new Date().toISOString() : undefined
        })
        .eq('id', router.id)

      if (pollResult.error) {
        console.error(`Error polling ${router.name}: ${pollResult.error}`)
        results.push({
          routerId: router.id,
          routerName: router.name,
          sessionCount: 0,
          isOnline: pollResult.isOnline,
          error: pollResult.error
        })
        continue
      }

      // Mark all existing sessions for this router as inactive
      await supabase
        .from('pppoe_sessions')
        .update({ is_active: false })
        .eq('router_id', router.id)

      // Upsert sessions
      for (const session of pollResult.sessions) {
        const sessionData = {
          router_id: router.id,
          username: session.name,
          profile: session.profile || session.service || null,
          assigned_ip: session.address || null,
          interface: session['caller-id'] || null,
          comment: session.comment || null,
          uptime_seconds: parseUptime(session.uptime),
          tx_bytes: parseInt(session['tx-byte'] || '0') || 0,
          rx_bytes: parseInt(session['rx-byte'] || '0') || 0,
          tx_rate_bps: parseRate(session['tx-rate']),
          rx_rate_bps: parseRate(session['rx-rate']),
          is_active: true,
          last_updated_at: new Date().toISOString()
        }

        // Upsert by router_id + username
        const { error: upsertError } = await supabase
          .from('pppoe_sessions')
          .upsert(sessionData, {
            onConflict: 'router_id,username',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error(`Failed to upsert session ${session.name}: ${upsertError.message}`)
        }
      }

      console.log(`Successfully polled ${router.name}: ${pollResult.sessions.length} active sessions`)
      results.push({
        routerId: router.id,
        routerName: router.name,
        sessionCount: pollResult.sessions.length,
        isOnline: true
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        polled: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Poll routers error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})