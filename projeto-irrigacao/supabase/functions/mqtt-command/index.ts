import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const MQTT_HOST = 'iotmqtt.santoandre.sp.gov.br'
const MQTT_PORT = 1883
const MQTT_TOPIC = 'PSA/Executivo/AutomacaoPredial/irrigador/planta1/comando'

// Minimal MQTT packet builders (protocol level 4 = MQTT 3.1.1)
function buildConnectPacket(clientId: string): Uint8Array {
  const protocolName = new TextEncoder().encode('MQTT')
  const clientIdBytes = new TextEncoder().encode(clientId)

  const variableHeaderLen = 2 + protocolName.length + 1 + 1 + 2 // protocol name + level + flags + keepalive
  const payloadLen = 2 + clientIdBytes.length
  const remainingLength = variableHeaderLen + payloadLen

  const packet = new Uint8Array(2 + remainingLength)
  let i = 0

  // Fixed header
  packet[i++] = 0x10 // CONNECT
  packet[i++] = remainingLength

  // Variable header
  packet[i++] = 0x00
  packet[i++] = protocolName.length
  packet.set(protocolName, i); i += protocolName.length
  packet[i++] = 0x04 // Protocol level (MQTT 3.1.1)
  packet[i++] = 0x02 // Connect flags (clean session)
  packet[i++] = 0x00 // Keep alive MSB
  packet[i++] = 0x3C // Keep alive LSB (60s)

  // Payload
  packet[i++] = (clientIdBytes.length >> 8) & 0xFF
  packet[i++] = clientIdBytes.length & 0xFF
  packet.set(clientIdBytes, i)

  return packet
}

function buildPublishPacket(topic: string, message: string): Uint8Array {
  const topicBytes = new TextEncoder().encode(topic)
  const messageBytes = new TextEncoder().encode(message)

  const remainingLength = 2 + topicBytes.length + messageBytes.length

  // Handle remaining length encoding (up to 127 for simplicity)
  const packet = new Uint8Array(2 + remainingLength)
  let i = 0

  packet[i++] = 0x30 // PUBLISH, QoS 0
  packet[i++] = remainingLength

  packet[i++] = (topicBytes.length >> 8) & 0xFF
  packet[i++] = topicBytes.length & 0xFF
  packet.set(topicBytes, i); i += topicBytes.length
  packet.set(messageBytes, i)

  return packet
}

function buildDisconnectPacket(): Uint8Array {
  return new Uint8Array([0xE0, 0x00])
}

async function publishMqtt(topic: string, message: string): Promise<void> {
  const conn = await Deno.connect({ hostname: MQTT_HOST, port: MQTT_PORT })

  try {
    // CONNECT
    const clientId = `lovable-${Date.now()}`
    await conn.write(buildConnectPacket(clientId))

    // Wait for CONNACK
    const buf = new Uint8Array(4)
    await conn.read(buf)
    if (buf[0] !== 0x20 || buf[3] !== 0x00) {
      throw new Error(`MQTT CONNACK failed: ${buf[3]}`)
    }

    // PUBLISH
    await conn.write(buildPublishPacket(topic, message))

    // Small delay to ensure delivery
    await new Promise(r => setTimeout(r, 100))

    // DISCONNECT
    await conn.write(buildDisconnectPacket())
  } finally {
    conn.close()
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { command, plant_id, sensor_id } = await req.json()

    if (!command || !['irrigar_on', 'irrigar_off'].includes(command)) {
      return new Response(
        JSON.stringify({ error: 'Invalid command. Use irrigar_on or irrigar_off' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const message = JSON.stringify({
      command,
      plant_id: plant_id || null,
      sensor_id: sensor_id || null,
      timestamp: new Date().toISOString(),
    })

    console.log(`Publishing to ${MQTT_TOPIC}: ${message}`)
    await publishMqtt(MQTT_TOPIC, message)

    return new Response(
      JSON.stringify({ success: true, topic: MQTT_TOPIC, command }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('MQTT publish error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to publish MQTT command', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
