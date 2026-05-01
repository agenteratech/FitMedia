// @ts-nocheck — runs on Supabase Edge Functions (Deno runtime), not the Expo TS check
// Supabase Edge Function: fatsecret
// Uses OAuth 1.0 (HMAC-SHA1) — no IP whitelisting required.
//
// Secrets needed:
//   FATSECRET_CLIENT_ID     = consumer key
//   FATSECRET_CLIENT_SECRET = consumer secret  ← NOT the OAuth 2.0 client secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api';
const CONSUMER_KEY = Deno.env.get('FATSECRET_CLIENT_ID') ?? '';
const CONSUMER_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Build OAuth 1.0 signed params using HMAC-SHA1 (Web Crypto API, available in Deno)
async function buildSignedParams(methodParams: Record<string, string>): Promise<Record<string, string>> {
  const base: Record<string, string> = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
    ...methodParams,
  };

  // Percent-encode every key and value, then sort lexicographically
  const sorted = Object.entries(base)
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const paramString = sorted.map(([k, v]) => `${k}=${v}`).join('&');

  const baseString = [
    'GET',
    encodeURIComponent(FATSECRET_API_URL),
    encodeURIComponent(paramString),
  ].join('&');

  // Signing key = percent(consumer_secret)&percent(token_secret)
  // token_secret is empty for 2-legged OAuth
  const signingKey = `${encodeURIComponent(CONSUMER_SECRET)}&`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(baseString));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  return { ...base, oauth_signature: signature };
}

async function callFatSecret(method: string, params: Record<string, string>): Promise<unknown> {
  const signed = await buildSignedParams({ method, format: 'json', ...params });
  const qs = new URLSearchParams(signed);
  const res = await fetch(`${FATSECRET_API_URL}?${qs.toString()}`);
  const raw = await res.json();
  console.log('[fatsecret] raw response:', JSON.stringify(raw).slice(0, 300));
  if (!res.ok) {
    throw new Error(`FatSecret API error: ${res.status}`);
  }
  // FatSecret returns HTTP 200 even for auth/signature errors — check explicitly
  if (raw?.error) {
    throw new Error(`FatSecret error ${raw.error.code ?? ''}: ${raw.error.message ?? JSON.stringify(raw.error)}`);
  }
  return raw;
}

// FatSecret returns a single object instead of a 1-item array — normalise both cases
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v: string | number | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSearch(raw: any) {
  const foods = asArray(raw?.foods?.food).map((f: any) => ({
    food_id: String(f.food_id),
    food_name: String(f.food_name),
    food_type: String(f.food_type ?? ''),
    brand_name: f.brand_name ? String(f.brand_name) : null,
    food_description: String(f.food_description ?? ''),
  }));
  return {
    foods,
    total: num(raw?.foods?.total_results),
    page: num(raw?.foods?.page_number),
  };
}

function normalizeFood(raw: any) {
  const f = raw?.food;
  if (!f) return null;
  const servings = asArray(f?.servings?.serving).map((s: any) => ({
    serving_id: String(s.serving_id),
    serving_description: String(s.serving_description ?? ''),
    metric_serving_amount: num(s.metric_serving_amount),
    metric_serving_unit: String(s.metric_serving_unit ?? ''),
    calories: num(s.calories),
    carbohydrate: num(s.carbohydrate),
    protein: num(s.protein),
    fat: num(s.fat),
  }));
  return {
    food_id: String(f.food_id),
    food_name: String(f.food_name),
    brand_name: f.brand_name ? String(f.brand_name) : null,
    servings,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      return jsonResponse({ error: 'FatSecret credentials not configured on server' }, 500);
    }

    // Validate Supabase session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: 'Invalid session' }, 401);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'search') {
      const q = url.searchParams.get('q')?.trim() ?? '';
      const page = url.searchParams.get('page') ?? '0';
      if (!q) return jsonResponse({ foods: [], total: 0, page: 0 });
      const raw = await callFatSecret('foods.search', {
        search_expression: q,
        page_number: page,
        max_results: '20',
      });
      return jsonResponse(normalizeSearch(raw));
    }

    if (action === 'food') {
      const id = url.searchParams.get('id')?.trim() ?? '';
      if (!id) return jsonResponse({ error: 'Missing id' }, 400);
      const raw = await callFatSecret('food.get.v2', { food_id: id });
      const food = normalizeFood(raw);
      if (!food) return jsonResponse({ error: 'Food not found' }, 404);
      return jsonResponse(food);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
