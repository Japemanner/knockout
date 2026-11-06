#!/usr/bin/env node
/**
 * RLS verification for the Darwin/Knockout Supabase project.
 *
 * The app reads most data server-side, so Playwright cannot observe the
 * PostgREST calls. This script verifies the database boundary directly:
 *
 *   1. Every policy that uses auth.uid() / get_user_org_id() wraps it in
 *      (select ...), so PostgreSQL can evaluate it once per statement.
 *   2. A real profile can still read its own boards, cards, hour entries,
 *      content posts and org profiles.
 *   3. The same profile cannot read another user's boards.
 *
 * It uses the Supabase Management API (the same API the MCP uses) and the
 * existing SUPABASE_ACCESS_TOKEN. No new npm dependencies. No user id, email
 * or row content is printed.
 *
 * Usage:
 *   node scripts/rls-verify.mjs
 *
 * Environment:
 *   SUPABASE_ACCESS_TOKEN     required (already used by the Supabase MCP)
 *   NEXT_PUBLIC_SUPABASE_URL  optional; falls back to .env.local
 */

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

const env = readEnvFile(path.join(repoRoot, '.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl) {
  console.error('RLS verify: FAIL — NEXT_PUBLIC_SUPABASE_URL is not set and .env.local is missing.');
  process.exit(1);
}

if (!token) {
  console.log('RLS verify: SKIP — SUPABASE_ACCESS_TOKEN is not set.');
  process.exit(0);
}

let projectRef;
try {
  projectRef = new URL(supabaseUrl).host.split('.')[0];
} catch {
  console.error('RLS verify: FAIL — NEXT_PUBLIC_SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    throw new Error(`Management API returned ${res.status}`);
  }
  return res.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

try {
  // 1. Pick a deterministic test profile and compute the expected, RLS-free
  //    counts as the postgres role. The id stays in memory and is never logged.
  const expectedRows = await sql(`
    select p.id::text as user_id,
           p.organization_id::text as org_id,
           (select count(*) from public.kk_boards b where b.user_id = p.id) as boards,
           (select count(*) from public.kk_cards c
              join public.kk_columns col on col.id = c.column_id
              join public.kk_boards b on b.id = col.board_id
             where b.user_id = p.id) as cards,
           (select count(*) from public.kk_hour_entries h where h.user_id = p.id) as hours,
           (select count(*) from public.kk_content_posts cp where cp.user_id = p.id) as posts,
           (select count(*) from public.kk_profiles p2 where p2.organization_id = p.organization_id) as profiles
      from public.kk_profiles p
     where p.organization_id is not null
     order by p.created_at
     limit 1
  `);

  const expected = Array.isArray(expectedRows) ? expectedRows[0] : expectedRows;
  if (!expected) {
    console.log('RLS verify: SKIP — no profile found.');
    process.exit(0);
  }

  const userId = expected.user_id;
  const orgId = expected.org_id;
  assert(uuid(userId), 'test profile id is not a UUID');
  assert(uuid(orgId), 'test profile organization_id is not a UUID');

  // 2. Run the same reads as the authenticated role with a real JWT claim.
  //    PostgreSQL applies RLS exactly as it does for PostgREST.
  const actualRows = await sql(`
    begin;
    select set_config('request.jwt.claims', '{"sub":"${userId}","role":"authenticated"}', true);
    set local role authenticated;
    select auth.uid()::text as user_id,
           (select count(*) from public.kk_boards) as boards,
           (select count(*) from public.kk_cards) as cards,
           (select count(*) from public.kk_hour_entries) as hours,
           (select count(*) from public.kk_content_posts) as posts,
           (select count(*) from public.kk_profiles) as profiles,
           (select count(*) from public.kk_boards where user_id <> auth.uid()) as foreign_boards,
           (select get_user_org_id()::text) as org_id;
    rollback;
  `);

  const actual = Array.isArray(actualRows) ? actualRows[0] : actualRows;
  assert(actual, 'authenticated query returned no rows');

  // 3. Verify that no policy still calls the identity helper without a select.
  const policyRows = await sql(`
    select count(*) as total,
           count(*) filter (
             where (coalesce(qual, '') ~* 'auth\\.uid\\(\\)' and coalesce(qual, '') !~* 'select\\s+auth\\.uid\\(\\)')
                or (coalesce(with_check, '') ~* 'auth\\.uid\\(\\)' and coalesce(with_check, '') !~* 'select\\s+auth\\.uid\\(\\)')
           ) as raw_uid,
           count(*) filter (
             where (coalesce(qual, '') ~* 'get_user_org_id\\(\\)' and coalesce(qual, '') !~* 'select\\s+get_user_org_id\\(\\)')
                or (coalesce(with_check, '') ~* 'get_user_org_id\\(\\)' and coalesce(with_check, '') !~* 'select\\s+get_user_org_id\\(\\)')
           ) as raw_org
      from pg_policies
     where schemaname in ('public', 'storage')
  `);

  const policy = Array.isArray(policyRows) ? policyRows[0] : policyRows;
  assert(policy, 'policy query returned no rows');

  const checks = [
    [actual.user_id === userId, 'auth.uid() does not match the test profile'],
    [Number(actual.boards) === Number(expected.boards), `boards mismatch (expected ${expected.boards}, got ${actual.boards})`],
    [Number(actual.cards) === Number(expected.cards), `cards mismatch (expected ${expected.cards}, got ${actual.cards})`],
    [Number(actual.hours) === Number(expected.hours), `hour entries mismatch (expected ${expected.hours}, got ${actual.hours})`],
    [Number(actual.posts) === Number(expected.posts), `content posts mismatch (expected ${expected.posts}, got ${actual.posts})`],
    [Number(actual.profiles) === Number(expected.profiles), `profiles mismatch (expected ${expected.profiles}, got ${actual.profiles})`],
    [Number(actual.foreign_boards) === 0, `foreign boards visible: ${actual.foreign_boards}`],
    [actual.org_id === orgId, 'get_user_org_id() does not match the profile organization'],
    [Number(policy.raw_uid) === 0, `raw auth.uid() calls in policies: ${policy.raw_uid}`],
    [Number(policy.raw_org) === 0, `raw get_user_org_id() calls in policies: ${policy.raw_org}`],
  ];

  const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
  if (failures.length > 0) {
    console.error('RLS verify: FAIL');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('RLS verify: PASS');
  console.log(`- policies: ${policy.total}; raw auth.uid(): ${policy.raw_uid}; raw get_user_org_id(): ${policy.raw_org}`);
  console.log(`- boards: ${actual.boards}/${expected.boards}; cards: ${actual.cards}/${expected.cards}; hours: ${actual.hours}/${expected.hours}; posts: ${actual.posts}/${expected.posts}; profiles: ${actual.profiles}/${expected.profiles}`);
  console.log(`- foreign boards visible: ${actual.foreign_boards}; organization: ok`);
} catch (error) {
  console.error(`RLS verify: FAIL — ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
}
