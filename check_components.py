#!/usr/bin/env python3
import os

components = [
    "src/app/presentation/workplace/profile/profile-picture/profile-picture.component.ts",
    "src/app/presentation/workplace/group/edit-group/edit-group-members/edit-group-members.component.ts",
    "src/app/presentation/workplace/settings/owner-address/owner-address.component.ts",
    "src/app/presentation/workplace/settings/macros/macro-row/macro-row.component.ts",
    "src/app/presentation/workplace/settings/group-scope/group-scope-row/group-scope-row.component.ts"
]

os.chdir('/mnt/c/SourceCode/Klacks.Ui')

for comp in components:
    print(f"\n=== {comp.split('/')[-1]} ===")
    try:
        with open(comp, 'r') as f:
            lines = f.readlines()

        has_ondestroy = any('OnDestroy' in line for line in lines)
        has_manual_unsub = any('objectForUnsubscribe' in line or '.unsubscribe()' in line for line in lines)

        subscribe_lines = [(i+1, line.strip()) for i, line in enumerate(lines) if '.subscribe(' in line]

        print(f"OnDestroy: {has_ondestroy}")
        print(f"Manual unsubscribe: {has_manual_unsub}")
        print(f"Subscriptions: {len(subscribe_lines)}")
        if subscribe_lines:
            for line_num, line_content in subscribe_lines[:2]:
                print(f"  Line {line_num}: {line_content[:80]}...")

    except Exception as e:
        print(f"Error: {e}")
