import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestStep {
  name: string
  status: 'pass' | 'fail' | 'skip'
  message: string
  duration_ms?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const steps: TestStep[] = []
  const start = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const body = await req.json()
    const { router_id } = body

    if (!router_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'router_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch router config
    const { data: router, error: fetchError } = await supabase
      .from('routers')
      .select('*')
      .eq('id', router_id)
      .single()

    if (fetchError || !router) {
      return new Response(
        JSON.stringify({ success: false, error: 'Router not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Config validation
    const configStep: TestStep = { name: 'Configuration', status: 'pass', message: '' }
    const issues: string[] = []
    if (!router.host) issues.push('Host is missing')
    if (!router.username) issues.push('Username is missing')
    if (!router.password) issues.push('Password is missing')
    if (router.routeros_version !== 'v7') issues.push('Only RouterOS v7 REST API is supported')
    if (issues.length > 0) {
      configStep.status = 'fail'
      configStep.message = issues.join('; ')
    } else {
      configStep.message = `RouterOS ${router.routeros_version}, ${router.use_https ? 'HTTPS' : 'HTTP'}, host: ${router.host}`
    }
    steps.push(configStep)

    if (configStep.status === 'fail') {
      return new Response(
        JSON.stringify({ success: false, router_name: router.name, steps }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: DNS / TCP reachability (HEAD to root)
    const protocol = router.use_https !== false ? 'https' : 'http'
    const baseUrl = `${protocol}://${router.host}`
    const authHeader = 'Basic ' + btoa(`${router.username}:${router.password}`)

    const reachStep: TestStep = { name: 'Network Reachability', status: 'fail', message: '' }
    const reachStart = Date.now()
    try {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(baseUrl, {
        method: 'HEAD',
        signal: ctrl.signal,
      }).catch((e) => { throw e })
      clearTimeout(timeout)
      reachStep.status = 'pass'
      reachStep.message = `Host reachable — HTTP ${res.status}`
      reachStep.duration_ms = Date.now() - reachStart
    } catch (e: unknown) {
      reachStep.duration_ms = Date.now() - reachStart
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('aborted') || msg.includes('timed out')) {
        reachStep.message = `Connection timed out after 8s — router may be behind a firewall or NAT. Ensure port ${router.use_https !== false ? 443 : 80} is open.`
      } else if (msg.includes('ECONNREFUSED') || msg.includes('refused')) {
        reachStep.message = `Connection refused — router is reachable but the REST API service is not running. Enable /ip/service www-ssl (or www) on the router.`
      } else if (msg.includes('certificate') || msg.includes('SSL') || msg.includes('TLS')) {
        reachStep.message = `TLS/SSL error — router certificate is self-signed or invalid. Try disabling HTTPS in the router settings.`
      } else {
        reachStep.message = `Network error: ${msg}`
      }
    }
    steps.push(reachStep)

    // Step 3: REST API endpoint
    const apiStep: TestStep = { name: 'REST API Endpoint', status: 'skip', message: 'Skipped (host unreachable)' }
    if (reachStep.status === 'pass') {
      const apiStart = Date.now()
      try {
        const ctrl = new AbortController()
        const timeout = setTimeout(() => ctrl.abort(), 8000)
        const res = await fetch(`${baseUrl}/rest`, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
          signal: ctrl.signal,
        })
        clearTimeout(timeout)
        apiStep.duration_ms = Date.now() - apiStart
        if (res.status === 200 || res.status === 404) {
          apiStep.status = 'pass'
          apiStep.message = `REST API is accessible (HTTP ${res.status})`
        } else if (res.status === 401) {
          apiStep.status = 'fail'
          apiStep.message = `Authentication failed (HTTP 401) — check username and password`
        } else if (res.status === 403) {
          apiStep.status = 'fail'
          apiStep.message = `Access forbidden (HTTP 403) — the API user may lack permissions`
        } else {
          apiStep.status = 'fail'
          apiStep.message = `Unexpected response: HTTP ${res.status}`
        }
      } catch (e: unknown) {
        apiStep.duration_ms = Date.now() - apiStart
        apiStep.status = 'fail'
        const msg = e instanceof Error ? e.message : String(e)
        apiStep.message = `REST API error: ${msg}`
      }
    }
    steps.push(apiStep)

    // Step 4: PPPoE active sessions endpoint
    const pppoeStep: TestStep = { name: 'PPPoE Sessions Endpoint', status: 'skip', message: 'Skipped (API unreachable)' }
    if (apiStep.status === 'pass') {
      const pppoeStart = Date.now()
      try {
        const ctrl = new AbortController()
        const timeout = setTimeout(() => ctrl.abort(), 8000)
        const res = await fetch(`${baseUrl}/rest/ppp/active`, {
          method: 'GET',
          headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
          signal: ctrl.signal,
        })
        clearTimeout(timeout)
        pppoeStep.duration_ms = Date.now() - pppoeStart
        if (res.ok) {
          const data = await res.json()
          const count = Array.isArray(data) ? data.length : '?'
          pppoeStep.status = 'pass'
          pppoeStep.message = `Found ${count} active PPPoE session(s)`
        } else if (res.status === 401) {
          pppoeStep.status = 'fail'
          pppoeStep.message = `Authentication failed (HTTP 401) — wrong credentials`
        } else {
          const text = await res.text().catch(() => '')
          pppoeStep.status = 'fail'
          pppoeStep.message = `HTTP ${res.status}: ${text.slice(0, 200)}`
        }
      } catch (e: unknown) {
        pppoeStep.duration_ms = Date.now() - pppoeStart
        pppoeStep.status = 'fail'
        const msg = e instanceof Error ? e.message : String(e)
        pppoeStep.message = `Error: ${msg}`
      }
    }
    steps.push(pppoeStep)

    const allPassed = steps.every(s => s.status === 'pass')
    const totalMs = Date.now() - start

    return new Response(
      JSON.stringify({
        success: allPassed,
        router_name: router.name,
        total_ms: totalMs,
        steps,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        steps,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
