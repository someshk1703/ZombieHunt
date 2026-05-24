// deal-cards — standalone endpoint (logic lives in _shared/dealCards.ts)
// Calling this endpoint directly is not supported; use start-game instead.
export { dealCards } from '../_shared/dealCards.ts'
export type { Card } from '../_shared/dealCards.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return new Response(JSON.stringify({ error: 'Use start-game to trigger card dealing' }), {
    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
