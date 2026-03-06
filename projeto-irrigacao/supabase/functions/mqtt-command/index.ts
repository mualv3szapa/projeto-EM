import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MQTT_HOST = "iotmqtt.santoandre.sp.gov.br";
const MQTT_PORT = 1883;
const MQTT_TOPIC = "PSA/Executivo/AutomacaoPredial/irrigador/planta1/cmnd";

function encodeRemainingLength(length: number): number[] {
  const encoded: number[] = [];

  do {
    let digit = length % 128;
    length = Math.floor(length / 128);

    if (length > 0) {
      digit = digit | 0x80;
    }

    encoded.push(digit);
  } while (length > 0);

  return encoded;
}

function buildConnectPacket(
  clientId: string,
  username?: string,
  password?: string,
): Uint8Array {
  const protocolName = new TextEncoder().encode("MQTT");
  const clientIdBytes = new TextEncoder().encode(clientId);

  const usernameBytes = username ? new TextEncoder().encode(username) : null;
  const passwordBytes = password ? new TextEncoder().encode(password) : null;

  let connectFlags = 0x02; // clean session

  if (usernameBytes) connectFlags |= 0x80;
  if (passwordBytes) connectFlags |= 0x40;

  const variableHeaderLen = 2 + protocolName.length + 1 + 1 + 2;

  let payloadLen = 2 + clientIdBytes.length;

  if (usernameBytes) payloadLen += 2 + usernameBytes.length;
  if (passwordBytes) payloadLen += 2 + passwordBytes.length;

  const remainingLength = variableHeaderLen + payloadLen;
  const encodedRemaining = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + encodedRemaining.length + remainingLength);

  let i = 0;

  packet[i++] = 0x10;

  for (const b of encodedRemaining) {
    packet[i++] = b;
  }

  packet[i++] = 0x00;
  packet[i++] = protocolName.length;

  packet.set(protocolName, i);
  i += protocolName.length;

  packet[i++] = 0x04;
  packet[i++] = connectFlags;

  packet[i++] = 0x00;
  packet[i++] = 0x3c;

  packet[i++] = (clientIdBytes.length >> 8) & 0xff;
  packet[i++] = clientIdBytes.length & 0xff;

  packet.set(clientIdBytes, i);
  i += clientIdBytes.length;

  if (usernameBytes) {
    packet[i++] = (usernameBytes.length >> 8) & 0xff;
    packet[i++] = usernameBytes.length & 0xff;

    packet.set(usernameBytes, i);
    i += usernameBytes.length;
  }

  if (passwordBytes) {
    packet[i++] = (passwordBytes.length >> 8) & 0xff;
    packet[i++] = passwordBytes.length & 0xff;

    packet.set(passwordBytes, i);
    i += passwordBytes.length;
  }

  return packet;
}

function buildPublishPacket(topic: string, message: string): Uint8Array {
  const topicBytes = new TextEncoder().encode(topic);
  const messageBytes = new TextEncoder().encode(message);

  const remainingLength = 2 + topicBytes.length + messageBytes.length;
  const encodedRemaining = encodeRemainingLength(remainingLength);

  const packet = new Uint8Array(1 + encodedRemaining.length + remainingLength);

  let i = 0;

  packet[i++] = 0x30;

  for (const b of encodedRemaining) {
    packet[i++] = b;
  }

  packet[i++] = (topicBytes.length >> 8) & 0xff;
  packet[i++] = topicBytes.length & 0xff;

  packet.set(topicBytes, i);
  i += topicBytes.length;

  packet.set(messageBytes, i);

  return packet;
}

function buildDisconnectPacket(): Uint8Array {
  return new Uint8Array([0xe0, 0x00]);
}

async function publishMqtt(topic: string, message: string) {
  console.log("Connecting to MQTT broker...");

  const conn = await Deno.connect({
    hostname: MQTT_HOST,
    port: MQTT_PORT,
  });

  const username = Deno.env.get("MQTT_USERNAME");
  const password = Deno.env.get("MQTT_PASSWORD");

  try {
    const clientId = `supabase-${Date.now()}`;

    const connectPacket = buildConnectPacket(clientId, username, password);

    await conn.write(connectPacket);

    const buf = new Uint8Array(4);
    await conn.read(buf);

    console.log("MQTT CONNACK:", buf);

    if (buf[0] !== 0x20 || buf[3] !== 0x00) {
      throw new Error(`MQTT connection refused: ${buf[3]}`);
    }

    console.log("MQTT connected");

    const publishPacket = buildPublishPacket(topic, message);

    await conn.write(publishPacket);

    console.log("Message published:", message);

    await new Promise((r) => setTimeout(r, 200));

    await conn.write(buildDisconnectPacket());

    console.log("MQTT disconnected");
  } finally {
    conn.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const { command } = await req.json();

    if (!command || !["irrigar_on", "irrigar_off"].includes(command)) {
      return new Response(
        JSON.stringify({
          error: "Invalid command. Use irrigar_on or irrigar_off",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const message = command === "irrigar_on" ? "1" : "0";

    console.log(`Publishing to ${MQTT_TOPIC}: ${message}`);

    await publishMqtt(MQTT_TOPIC, message);

    return new Response(
      JSON.stringify({
        success: true,
        topic: MQTT_TOPIC,
        command,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("MQTT publish error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to publish MQTT command",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
