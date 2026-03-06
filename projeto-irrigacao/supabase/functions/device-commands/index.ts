import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)

    if (req.method === 'GET') {
      // ESP32 polls for pending commands by sensor_id
      const sensorId = url.searchParams.get('sensor_id')
      if (!sensorId) {
        return new Response(
          JSON.stringify({ error: 'Missing sensor_id parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Find plant by sensor_id
      const { data: plant, error: plantError } = await supabase
        .from('plants')
        .select('id')
        .eq('sensor_id', sensorId)
        .maybeSingle()

      if (plantError || !plant) {
        return new Response(
          JSON.stringify({ error: 'Plant not found', commands: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get pending commands
      const { data: commands } = await supabase
        .from('plant_commands')
        .select('id, command')
        .eq('plant_id', plant.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10)

      // Mark them as executed
      if (commands && commands.length > 0) {
        const ids = commands.map(c => c.id)
        await supabase
          .from('plant_commands')
          .update({ status: 'executed', executed_at: new Date().toISOString() })
          .in('id', ids)

        // Update pump status on plant
        const lastCommand = commands[commands.length - 1]
        await supabase
          .from('plants')
          .update({ pump_active: lastCommand.command === 'irrigar_on' })
          .eq('id', plant.id)
      }

      return new Response(
        JSON.stringify({ commands: commands || [] }),
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
