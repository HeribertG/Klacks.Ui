// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Splits the issues of the employee import preview into general notes and row-specific issues. Info issues
 * whose code describes a rule applied to many rows (contract/group/entry date from the rules, postcode and
 * city split, personnel number not imported) are collected once per identical text in a notes block above
 * the table; every other issue stays on its row, ordered errors first, then warnings, then info.
 * @param rows - Preview rows returned by the server
 * @param issues - Issues of one preview row
 */

import {
  CLIENT_IMPORT_SUMMARY_ISSUE_CODES,
  CLIENT_IMPORT_SUMMARY_ISSUE_CODES_WITHOUT_TEXT_ARGS,
} from 'src/app/domain/constants/client-import.constants';
import { ClientImportIssueSeverity } from 'src/app/domain/enums/client-import.enums';
import { IClientImportIssue } from 'src/app/domain/models/client-import/i-client-import-issue';
import { IClientImportIssueSummaryEntry } from 'src/app/domain/models/client-import/i-client-import-issue-summary-entry';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';

const SEVERITY_ORDER: Readonly<Record<ClientImportIssueSeverity, number>> = {
  [ClientImportIssueSeverity.Error]: 0,
  [ClientImportIssueSeverity.Warning]: 1,
  [ClientImportIssueSeverity.Info]: 2,
};
const UNKNOWN_SEVERITY_ORDER = SEVERITY_ORDER[ClientImportIssueSeverity.Info];

export function isSummarizedClientImportIssue(issue: IClientImportIssue): boolean {
  return issue.severity === ClientImportIssueSeverity.Info && CLIENT_IMPORT_SUMMARY_ISSUE_CODES.includes(issue.code);
}

export function summarizeClientImportIssues(rows: readonly IClientImportPreviewRow[]): IClientImportIssueSummaryEntry[] {
  const entries = new Map<string, IClientImportIssueSummaryEntry>();
  for (const row of rows) {
    const signaturesOfRow = new Set<string>();
    for (const issue of row.issues.filter(isSummarizedClientImportIssue)) {
      const signature = issueSignature(issue);
      if (signaturesOfRow.has(signature)) {
        continue;
      }
      signaturesOfRow.add(signature);
      const entry = entries.get(signature);
      entries.set(signature, { issue: entry?.issue ?? issue, rowCount: (entry?.rowCount ?? 0) + 1 });
    }
  }
  return [...entries.values()].sort(
    (a, b) =>
      CLIENT_IMPORT_SUMMARY_ISSUE_CODES.indexOf(a.issue.code) - CLIENT_IMPORT_SUMMARY_ISSUE_CODES.indexOf(b.issue.code),
  );
}

export function rowSpecificClientImportIssues(issues: readonly IClientImportIssue[]): IClientImportIssue[] {
  return issues
    .filter((issue) => !isSummarizedClientImportIssue(issue))
    .sort((a, b) => severityOrder(a) - severityOrder(b));
}

function severityOrder(issue: IClientImportIssue): number {
  return SEVERITY_ORDER[issue.severity] ?? UNKNOWN_SEVERITY_ORDER;
}

function issueSignature(issue: IClientImportIssue): string {
  if (CLIENT_IMPORT_SUMMARY_ISSUE_CODES_WITHOUT_TEXT_ARGS.includes(issue.code)) {
    return JSON.stringify([issue.code, []]);
  }
  const args = Object.keys(issue.args)
    .sort()
    .map((key) => [key, issue.args[key]]);
  return JSON.stringify([issue.code, args]);
}
