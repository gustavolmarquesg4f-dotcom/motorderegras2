import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_SUPABASE_URL,PUBLIC_SUPABASE_PUBLISHABLE_KEY,DEFAULT_GATEWAY_MODEL} from '../shared/public-config.mjs';
test('public config contains only public identifiers',()=>{assert.match(PUBLIC_SUPABASE_URL,/^https:\/\/[a-z0-9]+\.supabase\.co$/);assert.match(PUBLIC_SUPABASE_PUBLISHABLE_KEY,/^sb_publishable_/);assert.match(DEFAULT_GATEWAY_MODEL,/^openai\//);});