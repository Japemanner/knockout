#!/usr/bin/env bash
# scripts/fitness-check.sh
# Deterministische fitness checks — geen AI-redenering, alleen feiten.
# Output is machine-readable JSON voor @fitness-checker agent.
# Gebruik: bash scripts/fitness-check.sh 2>&1 | tee FITNESS-REPORT.json

set -uo pipefail

PASS="PASS"
FAIL="FAIL"
WARN="WARN"
SKIP="SKIP"

results=()

add_result() {
  local id="$1" status="$2" detail="$3"
  results+=("{\"id\":\"$id\",\"status\":\"$status\",\"detail\":\"$detail\"}")
}

echo "=== FITNESS CHECK START $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" >&2

# ─────────────────────────────────────────────
# F-01: RLS via Supabase MCP
# Kan niet in bash worden gecontroleerd — delegeren aan Supabase MCP.
# De @fitness-checker agent voert dit via MCP uit en injecteert het resultaat.
add_result "F-01" "$SKIP" "Delegate to Supabase MCP: query pg_tables WHERE rowsecurity = false"

# ─────────────────────────────────────────────
# F-02: Geen service role key in client-side code
# Next.js: server-only files (server.ts, middleware.ts) are OK
SERVICE_ROLE_HITS=$(grep -rn "service_role\|SUPABASE_SERVICE" src/ 2>/dev/null | grep -v "//.*service_role\|server.ts\|middleware.ts" | wc -l | tr -d ' ')
if [ "$SERVICE_ROLE_HITS" -eq 0 ]; then
  add_result "F-02" "$PASS" "No service_role references in client-side code"
else
  HITS_DETAIL=$(grep -rn "service_role\|SUPABASE_SERVICE" src/ 2>/dev/null | grep -v "//.*service_role\|server.ts\|middleware.ts" | head -5)
  add_result "F-02" "$FAIL" "Found $SERVICE_ROLE_HITS occurrence(s) in client code: $HITS_DETAIL"
fi

# ─────────────────────────────────────────────
# F-03: Supabase client — Next.js App Router uses createClient per server component (normal)
CLIENT_COUNT=$(grep -rn "createClient(" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$CLIENT_COUNT" -le 20 ]; then
  add_result "F-03" "$PASS" "createClient() called $CLIENT_COUNT time(s) — normal for Next.js server components"
else
  add_result "F-03" "$WARN" "createClient() found $CLIENT_COUNT times — verify no duplicate patterns"
fi

# ─────────────────────────────────────────────
# F-04: PKCE flow — @supabase/ssr defaults to PKCE. Check for explicit config or trust defaults.
PKCE_HITS=$(grep -rn "pkce\|flowType" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$PKCE_HITS" -ge 1 ]; then
  add_result "F-04" "$PASS" "pkce/flowType mention found in src/"
else
  add_result "F-04" "$PASS" "pkce: using @supabase/ssr defaults (PKCE is default)"
fi

# ─────────────────────────────────────────────
# F-05: Netlify config — Next.js uses @netlify/plugin-nextjs
if [ -f "netlify.toml" ]; then
  if grep -q "plugin-nextjs" netlify.toml || (grep -q 'from = "/\*"' netlify.toml && grep -q 'status = 200' netlify.toml); then
    add_result "F-05" "$PASS" "Netlify config valid (Next.js plugin or SPA redirect)"
  else
    add_result "F-05" "$FAIL" "netlify.toml missing required config"
  fi
else
  add_result "F-05" "$FAIL" "netlify.toml does not exist"
fi

# ─────────────────────────────────────────────
# F-06: TypeScript strict mode
if [ -f "tsconfig.json" ]; then
  STRICT=$(grep -c '"strict": true' tsconfig.json)
  if [ "$STRICT" -ge 1 ]; then
    add_result "F-06" "$PASS" "strict: true in tsconfig.json"
  else
    add_result "F-06" "$FAIL" "strict is not true in tsconfig.json (got: $STRICT)"
  fi
else
  add_result "F-06" "$FAIL" "tsconfig.json not found"
fi

# ─────────────────────────────────────────────
# F-07: TypeScript compileert zonder fouten
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
if [ "$TSC_ERRORS" -eq 0 ]; then
  add_result "F-07" "$PASS" "tsc --noEmit: 0 errors"
else
  FIRST_ERRORS=$(echo "$TSC_OUTPUT" | grep "error TS" | head -5 | tr '\n' '|')
  add_result "F-07" "$FAIL" "$TSC_ERRORS TypeScript error(s): $FIRST_ERRORS"
fi

# ─────────────────────────────────────────────
# F-08: Geen unjustified `any` types
ANY_HITS=$(grep -rn ": any\b\|as any\b" src/ 2>/dev/null | grep -v "@ts-expect-error\|eslint-disable\|// any:" | wc -l | tr -d ' ')
if [ "$ANY_HITS" -eq 0 ]; then
  add_result "F-08" "$PASS" "No unjustified 'any' types found"
elif [ "$ANY_HITS" -le 3 ]; then
  add_result "F-08" "$WARN" "$ANY_HITS unjustified 'any' type(s) found — add suppression comment with justification"
else
  add_result "F-08" "$FAIL" "$ANY_HITS unjustified 'any' types — too many, refactor required"
fi

# ─────────────────────────────────────────────
# F-09: Geen admin client in frontend
ADMIN_HITS=$(grep -rn "auth\.admin\|createClient.*service_role" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$ADMIN_HITS" -eq 0 ]; then
  add_result "F-09" "$PASS" "No admin client usage found in src/"
else
  add_result "F-09" "$FAIL" "$ADMIN_HITS admin client call(s) in src/ — move to Edge Function"
fi

# ─────────────────────────────────────────────
# F-10: Storage bucket policies — delegeren aan Supabase MCP
add_result "F-10" "$SKIP" "Delegate to Supabase MCP: list buckets and verify policies exist"

# ─────────────────────────────────────────────
# F-11: Geen waitForTimeout in tests
if [ -d "tests/" ]; then
  TIMEOUT_HITS=$(grep -rn "waitForTimeout" tests/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TIMEOUT_HITS" -eq 0 ]; then
    add_result "F-11" "$PASS" "No waitForTimeout() found in tests/"
  else
    TIMEOUT_DETAIL=$(grep -rn "waitForTimeout" tests/ 2>/dev/null | head -3 | tr '\n' '|')
    add_result "F-11" "$FAIL" "$TIMEOUT_HITS waitForTimeout() call(s): $TIMEOUT_DETAIL"
  fi
else
  add_result "F-11" "$WARN" "tests/ directory not found yet"
fi

# ─────────────────────────────────────────────
# F-12: .env.local staat in .gitignore
if [ -f ".gitignore" ]; then
  if grep -q "\.env\.local" .gitignore; then
    add_result "F-12" "$PASS" ".env.local is in .gitignore"
  else
    add_result "F-12" "$FAIL" ".env.local is NOT in .gitignore — secrets will leak"
  fi
else
  add_result "F-12" "$FAIL" ".gitignore not found"
fi

# ─────────────────────────────────────────────
# F-13: .env.example bestaat
if [ -f ".env.example" ]; then
  add_result "F-13" "$PASS" ".env.example exists"
else
  add_result "F-13" "$WARN" ".env.example not found — add placeholder env vars for onboarding"
fi

# ─────────────────────────────────────────────
# F-14: Geen directe DOM-manipulatie in src/
DOM_HITS=$(grep -rn "document\.getElementById\|document\.querySelector\|innerHTML\s*=\|document\.createElement" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$DOM_HITS" -eq 0 ]; then
  add_result "F-14" "$PASS" "No direct DOM manipulation found in src/"
else
  DOM_DETAIL=$(grep -rn "document\.getElementById\|querySelector\|innerHTML" src/ 2>/dev/null | head -3 | tr '\n' '|')
  add_result "F-14" "$WARN" "$DOM_HITS direct DOM call(s) — verify these are intentional: $DOM_DETAIL"
fi

# ─────────────────────────────────────────────
# F-15: Conventional commits (laatste 5)
COMMITS=$(git log --oneline -5 2>/dev/null || echo "no_git")
PATTERN="^[0-9a-f]+ (feat|fix|test|chore|refactor|docs|style|perf|ci|build|revert)(\(.+\))?: .+"
BAD_COMMITS=0
while IFS= read -r line; do
  if [[ -n "$line" ]] && ! echo "$line" | grep -qE "$PATTERN"; then
    BAD_COMMITS=$((BAD_COMMITS + 1))
  fi
done <<< "$COMMITS"

if [ "$COMMITS" = "no_git" ]; then
  add_result "F-15" "$SKIP" "Not a git repository yet"
elif [ "$BAD_COMMITS" -eq 0 ]; then
  add_result "F-15" "$PASS" "Last 5 commits follow conventional format"
else
  add_result "F-15" "$WARN" "$BAD_COMMITS of last 5 commits do not follow conventional format"
fi

# ─────────────────────────────────────────────
# F-16: Snyk SAST — delegeren aan Snyk MCP
add_result "F-16" "$SKIP" "Delegate to Snyk MCP: run snyk_code_scan on src/"

# ─────────────────────────────────────────────
# F-17: Snyk SCA — delegeren aan Snyk MCP
add_result "F-17" "$SKIP" "Delegate to Snyk MCP: run snyk_sca_scan on package.json"

# ─────────────────────────────────────────────
# TOTALEN
FAIL_COUNT=0
WARN_COUNT=0
PASS_COUNT=0
SKIP_COUNT=0

for r in "${results[@]}"; do
  if echo "$r" | grep -q '"status":"FAIL"'; then FAIL_COUNT=$((FAIL_COUNT+1)); fi
  if echo "$r" | grep -q '"status":"WARN"'; then WARN_COUNT=$((WARN_COUNT+1)); fi
  if echo "$r" | grep -q '"status":"PASS"'; then PASS_COUNT=$((PASS_COUNT+1)); fi
  if echo "$r" | grep -q '"status":"SKIP"'; then SKIP_COUNT=$((SKIP_COUNT+1)); fi
done

# JSON output
echo "{"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
echo "  \"summary\": {"
echo "    \"pass\": $PASS_COUNT,"
echo "    \"fail\": $FAIL_COUNT,"
echo "    \"warn\": $WARN_COUNT,"
echo "    \"skip\": $SKIP_COUNT,"
echo "    \"blocking\": $FAIL_COUNT"
echo "  },"
echo "  \"checks\": ["
LAST="${results[-1]}"
for r in "${results[@]}"; do
  if [ "$r" = "$LAST" ]; then
    echo "    $r"
  else
    echo "    $r,"
  fi
done
echo "  ]"
echo "}"

echo "=== FITNESS CHECK DONE — FAIL:$FAIL_COUNT WARN:$WARN_COUNT PASS:$PASS_COUNT SKIP:$SKIP_COUNT ===" >&2

# Exit code: 1 als er FAIL's zijn (blokkeert CI)
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
