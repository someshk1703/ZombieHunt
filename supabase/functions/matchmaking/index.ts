import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: matchmaking Edge Function
// Triggered by Supabase DB webhook on matchmaking_queue INSERT or polling.
// Responsibilities:
//   1. Read all entries from matchmaking_queue ordered by joined_at
//   2. If >= 3 players waiting:
//        a. Take up to max_players (default 10) from front of queue
//        b. Create a new room (code via generate_room_code(), host = first player)
//        c. Insert player rows for each matched user
//        d. Remove matched users from matchmaking_queue
//        e. Start 30s countdown via game_state or room metadata
//   3. If < 3 players, do nothing (wait for more)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // TODO: implement matchmaking logic

    return new Response(
      JSON.stringify({ status: 'ok' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
