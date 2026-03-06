import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (req.method === 'POST') {
      const body = await req.json()

      // Validate required fields
      if (!body.plant_id || !body.command) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: plant_id and command' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Build the full payload to store
      const payload = {
        plant_id: body.plant_id,
        sensor_id: body.sensor_id || null,
        command: body.command,
        timestamp: body.timestamp || new Date().toISOString(),
        pump_active: body.pump_active ?? null,
        ...body.extra,
      }

      const { data, error } = await supabase
        .from('irrigation_payloads')
        .insert({
          plant_id: body.plant_id,
          sensor_id: body.sensor_id || null,
          command: body.command,
          payload: payload,
        })
        .select()
        .single()

      if (error) {
        console.error('Insert error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to save payload' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const plantId = url.searchParams.get('plant_id')
      const sensorId = url.searchParams.get('sensor_id')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('irrigation_payloads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (plantId) query = query.eq('plant_id', plantId)
      if (sensorId) query = query.eq('sensor_id', sensorId)

      const { data, error } = await query

      if (error) {
        console.error('Query error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch payloads' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
