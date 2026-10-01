// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import {
  isSummarizedClientImportIssue,
  rowSpecificClientImportIssues,
  summarizeClientImportIssues,
} from './client-import-issue-summary.helper';
import { ClientImportIssueSeverity, ClientImportRowStatus } from 'src/app/domain/enums/client-import.enums';
import { IClientImportIssue } from 'src/app/domain/models/client-import/i-client-import-issue';
import { IClientImportPreviewRow } from 'src/app/domain/models/client-import/i-client-import-preview-row';

const issue = (
  code: string,
  severity = ClientImportIssueSeverity.Info,
  args: Record<string, string> = {},
): IClientImportIssue => ({ field: null, severity, code, args });

const row = (rowIndex: number, issues: IClientImportIssue[]): IClientImportPreviewRow => ({
  rowIndex,
  status: ClientImportRowStatus.Ready,
  record: {
    firstName: null, lastName: null, title: null, gender: null, birthdate: null, street: null, addressLine2: null,
    zip: null, city: null, state: null, country: null, email: null, phone: null, mobile: null,
    entryDate: '2026-01-01', exitDate: null, contractName: null, groupName: null, note: null,
  },
  issues,
  duplicateOfClientId: null,
  duplicateOfName: null,
  duplicateOfRowIndex: null,
});

describe('client import issue summary helper', () => {
  describe('isSummarizedClientImportIssue', () => {
    it.each([
      'contract-from-policy',
      'group-from-policy',
      'entry-date-from-policy',
      'zip-city-split',
      'personnel-number-not-imported',
    ])('collects the info issue %s in the notes block', (code) => {
      expect(isSummarizedClientImportIssue(issue(code))).toBe(true);
    });

    it('keeps row-specific info issues on the row', () => {
      expect(isSummarizedClientImportIssue(issue('gender-from-salutation'))).toBe(false);
      expect(isSummarizedClientImportIssue(issue('former-employee-skipped'))).toBe(false);
      expect(isSummarizedClientImportIssue(issue('possible-duplicate-name'))).toBe(false);
    });

    it('never collects a warning or error, even with a summarized code', () => {
      expect(
        isSummarizedClientImportIssue(issue('zip-city-split', ClientImportIssueSeverity.Warning, { reason: 'not-split' })),
      ).toBe(false);
      expect(isSummarizedClientImportIssue(issue('contract-from-policy', ClientImportIssueSeverity.Error))).toBe(false);
    });
  });

  describe('summarizeClientImportIssues', () => {
    it('counts each identical note once per row and orders the notes by the summary code list', () => {
      const contract = issue('contract-from-policy', ClientImportIssueSeverity.Info, { name: 'Full time' });
      const rows = [
        row(0, [issue('personnel-number-not-imported'), contract, contract]),
        row(1, [contract, issue('personnel-number-not-imported')]),
        row(2, [issue('gender-from-salutation', ClientImportIssueSeverity.Info, { value: 'Mr' })]),
      ];

      const summary = summarizeClientImportIssues(rows);

      expect(summary.map((entry) => [entry.issue.code, entry.rowCount])).toEqual([
        ['contract-from-policy', 2],
        ['personnel-number-not-imported', 2],
      ]);
    });

    it('keeps notes with different arguments apart, independent of the argument order', () => {
      const rows = [
        row(0, [issue('entry-date-from-policy', ClientImportIssueSeverity.Info, { date: '2026-01-01', x: '1' })]),
        row(1, [issue('entry-date-from-policy', ClientImportIssueSeverity.Info, { x: '1', date: '2026-01-01' })]),
        row(2, [issue('entry-date-from-policy', ClientImportIssueSeverity.Info, { date: '2026-02-01' })]),
      ];

      expect(summarizeClientImportIssues(rows).map((entry) => entry.rowCount)).toEqual([2, 1]);
    });

    it('merges notes whose text has no argument even when the arguments differ per row', () => {
      const rows = [
        row(0, [issue('zip-city-split', ClientImportIssueSeverity.Info, { value: '8000 Zurich' })]),
        row(1, [issue('zip-city-split', ClientImportIssueSeverity.Info, { value: '3000 Bern' })]),
        row(2, [issue('zip-city-split', ClientImportIssueSeverity.Info, { value: '6000 Luzern' })]),
      ];

      expect(summarizeClientImportIssues(rows).map((entry) => [entry.issue.code, entry.rowCount])).toEqual([
        ['zip-city-split', 3],
      ]);
    });

    it('returns no notes without rows', () => {
      expect(summarizeClientImportIssues([])).toEqual([]);
    });
  });

  describe('rowSpecificClientImportIssues', () => {
    it('drops the collected notes and orders errors before warnings before info', () => {
      const issues = [
        issue('gender-from-salutation'),
        issue('contract-from-policy'),
        issue('invalid-email', ClientImportIssueSeverity.Warning),
        issue('missing-gender', ClientImportIssueSeverity.Error),
        issue('zip-city-split', ClientImportIssueSeverity.Warning, { reason: 'not-split' }),
      ];

      expect(rowSpecificClientImportIssues(issues).map((entry) => entry.code)).toEqual([
        'missing-gender',
        'invalid-email',
        'zip-city-split',
        'gender-from-salutation',
      ]);
    });
  });
});
