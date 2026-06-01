# Synonym Validation Report (Claude critic pass, all 21 plugin languages)

Method: 7 Sonnet sub-agents judged every plugin target against its concept anchor
(English + German core synonyms from the central manifest). DeepSeek self-critique
was rejected first — verified false-positive rate ~80% on Finnish (flagged correct
native words like "asetukset" as script errors).

## Class A — FALSE POSITIVES caused by CORRUPT central anchors (do NOT touch plugins)

The central manifest `navigation-targets.json` has WRONG English/German core synonyms
for these targets. The plugin-language synonyms are actually CORRECT; the critics were
misled by the bad reference. This corrupt core data ALSO breaks the de/en/fr/it matcher
— a separate, higher-priority bug.

- `klacksy-training` — page is the Klacksy training-review page (`/workplace/klacksy-training`,
  source `klacksy-training-review-home`), but core EN="title settings", DE="assistenten einstellungen".
  Wrongly flagged in ar, da, el, fi, ko, nb, nl, pt, vi, zh-CN, id (~11×). Plugins (training terms) are right.
- `floor-plan` — page is the physical floor-plan viewer (`/workplace/floor-plan`), but core
  EN="schedule layout", DE="schichtplan/dienstplan". Wrongly flagged in pl, ro, sv. Plugins (floor-plan terms) are right.
- `floor-plan-settings` — internally inconsistent (EN=physical layout, DE=schedule). No plugin flags, but core data is wrong.

Fix = regenerate the CORE en/de/fr/it for these targets (and re-check fr/it), NOT the plugins.

## Class B — GENUINE plugin errors (regenerate the listed locale/target)

### Foreign-language bleed
- nb/branch-form — "grenseskjema" (border form) instead of filial. [offtopic, severe]
- sv/branch-form — German "niederlassungsformulär" bled in (side effect of the EN+DE anchor). [bleed]
- ms/edit-group — all 20 phrases in English.
- ms/identity-providers, ms/scheduling-rules, ms/work-setting — Indonesian instead of Malay.
- ms/shift-list — over half English.
- da/branches — majority English ("gå til branches" …) instead of filialer.
- da/reports — English ("analytics", "workforce", "performance metrics").
- da/plan-execution-panel.approve — English "approve" instead of "godkend".
- el/dashboard — 6+ English phrases mixed in.
- el/container-template — multiple verbatim English phrases.

### Off-topic / hallucination
- vi/states — "trạng thái" (status) instead of geographic states (concept confirmed geographic).
- el/employee-membership — "συνδρομή" (subscription/fee) dominates instead of group membership.
- ko/group-list — "cost center" terms not in the group-list concept. [borderline]
- ro/client-detail.lastname — "prenumele" (first name) instead of last name.

### Script / missing diacritics
- ro/settings-general — all 20 phrases without diacritics (setari vs setări).
- ro/spam-rules — systematically without diacritics.
- ro/cut-shift — majority without diacritics (ș/ț/ă).
- pt/client-detail.lastname — missing accents (ultimo/familia/funcionario).

### Minor / likely-skip
- he/group-list — one stray phrase "close groups".
- sv/client-detail.birthday — "personnummer" (contains DOB; arguably acceptable).

## Side effect to address before mass regeneration
The EN+DE meaning anchor (added to fix "branch"→Filiale disambiguation) can cause the
model to copy German compounds verbatim into other Latin-script languages (sv/branch-form).
Recommend strengthening the prompt: "do not copy any word from the reference phrases
verbatim — they are in other languages; output only natural <locale> words."
