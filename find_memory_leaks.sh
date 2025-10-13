#!/bin/bash
cd /mnt/c/SourceCode/Klacks.Ui
find src/app -name "*.ts" -not -name "*.spec.ts" -type f | while read file; do
  if grep -q "\.subscribe" "$file" 2>/dev/null; then
    if ! grep -q "takeUntil\|take(\|first(\|unsubscribe" "$file" 2>/dev/null; then
      count=$(grep -c "\.subscribe" "$file" 2>/dev/null)
      echo "$count $file"
    fi
  fi
done | sort -rn | head -20
