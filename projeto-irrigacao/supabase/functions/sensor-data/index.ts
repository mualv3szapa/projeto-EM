import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SensorPayload {
  sensor_id: string
  humidity: number
  api_key?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const payload: SensorPayload = await req.json()
    
    console.log('Received sensor data:', payload)

    // Validate required fields
    if (!payload.sensor_id || payload.humidity === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sensor_id and humidity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate humidity range (0-100)
    if (payload.humidity < 0 || payload.humidity > 100) {
      return new Response(
        JSON.stringify({ error: 'Humidity must be between 0 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find the plant by sensor_id
    const { data: plant, error: findError } = await supabase
      .from('plants')
      .select('id, name')
      .eq('sensor_id', payload.sensor_id)
      .maybeSingle()

    if (findError) {
      console.error('Error finding plant:', findError)
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!plant) {
      return new Response(
        JSON.stringify({ error: `No plant found with sensor_id: ${payload.sensor_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update plant humidity
    const { error: updateError } = await supabase
      .from('plants')
      .update({
        humidity: Math.round(payload.humidity),
        last_watered_at: payload.humidity >= 80 ? new Date().toISOString() : undefined
      })
      .eq('id', plant.id)

    if (updateError) {
      console.error('Error updating plant:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update plant' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store reading in history
    const { error: insertError } = await supabase
      .from('sensor_readings')
      .insert({
        plant_id: plant.id,
        soil_humidity: Math.round(payload.humidity)
      })

    if (insertError) {
      console.error('Error storing reading:', insertError)
      // Don't fail the request, just log
    }

    console.log(`Updated plant "${plant.name}" with humidity: ${payload.humidity}%`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Plant "${plant.name}" updated`,
        humidity: Math.round(payload.humidity)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
