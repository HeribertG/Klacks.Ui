#!/bin/bash

# Find all components with subscriptions
grep -l "\.subscribe(" src/app/presentation/**/*.component.ts 2>/dev/null | sort > /tmp/with_subs.txt

# Find all components with destroy$
grep -l "destroy\$" src/app/presentation/**/*.component.ts 2>/dev/null | sort > /tmp/with_destroy.txt

# Find components with subscriptions but NO destroy$ (memory leaks)
comm -23 /tmp/with_subs.txt /tmp/with_destroy.txt | while read file; do
  count=$(grep -o "\.subscribe(" "$file" | wc -l)
  echo "$count|$file"
done | sort -rn

# Cleanup
rm -f /tmp/with_subs.txt /tmp/with_destroy.txt
