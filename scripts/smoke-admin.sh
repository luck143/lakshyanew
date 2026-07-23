#!/usr/bin/env bash
# Smoke test for admin metadata-driven rendering.
# Asserts the ui.* display/behavior hints actually render.
set -u
ADMIN="${ADMIN_BASE:-http://localhost:3100}"
fail=0
check() { # name, url, pattern
  local name="$1" url="$2" pat="$3"
  local body; body=$(curl -s "$url")
  if echo "$body" | grep -q "$pat"; then
    echo "PASS  $name"
  else
    echo "FAIL  $name (missing: $pat)"
    fail=1
  fi
}
ct_check() { # name, url, header-pattern
  local name="$1" url="$2" pat="$3"
  if curl -s -D - -o /dev/null "$url" | grep -qi "$pat"; then
    echo "PASS  $name"
  else
    echo "FAIL  $name (missing header: $pat)"
    fail=1
  fi
}

check "product price -> currency (₹)"        "$ADMIN/product"            'class="mono">₹'
check "product status -> badge"              "$ADMIN/product"            'class="badge '
check "user email -> mailto link"            "$ADMIN/user"               'class="lnk" href="mailto:'
check "user status -> badge"                 "$ADMIN/user"               'class="badge '
check "product new form grouped (Basics)"    "$ADMIN/product/new"        'class="form-group"><h3>Basics'
check "product new form grouped (Pricing)"   "$ADMIN/product/new"        '<h3>Pricing &amp; Inventory'
check "product new form placeholder"         "$ADMIN/product/new"        'placeholder="Product title"'
# double-escape guard: a stray "AMP;" would mean &amp;amp; in the DOM
if curl -s "$ADMIN/product/new" | grep -q 'AMP;'; then
  echo "FAIL  double-escape present"; fail=1
else
  echo "PASS  no double-escape"
fi
check "order total -> currency"              "$ADMIN/order"              'class="mono">₹'
ct_check "CSV export header"                 "$ADMIN/product/export.csv" 'content-type: text/csv'

exit $fail
