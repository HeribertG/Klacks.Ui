// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Reads the machine-readable 409 body of a payroll export. The download requests ask for a blob, so an error
 * body arrives as a Blob and has to be read as text before it can be parsed.
 * @param error - The failed HTTP response
 * @returns The conflict, or null when the response is not a payroll export conflict
 */

import { PayrollExportConflict } from 'src/app/infrastructure/api/period-closing/models/payroll-export-conflict';
import {
  PAYROLL_EXPORT_ERROR_CODES,
  PayrollExportErrorCode,
} from 'src/app/infrastructure/api/period-closing/models/payroll-export-error-codes';

const HTTP_STATUS_CONFLICT = 409;
const KNOWN_CODES: readonly string[] = Object.values(PAYROLL_EXPORT_ERROR_CODES);

interface ConflictBody {
  errorCode?: string;
  blockers?: PayrollExportConflict['blockers'];
  blockerTotal?: number;
}

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

async function readBody(body: unknown): Promise<ConflictBody | null> {
  if (body instanceof Blob) {
    try {
      return JSON.parse(await readBlobText(body)) as ConflictBody;
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? (body as ConflictBody) : null;
}

export async function parsePayrollExportConflict(
  error: { status?: number; error?: unknown } | null | undefined,
): Promise<PayrollExportConflict | null> {
  if (error?.status !== HTTP_STATUS_CONFLICT) {
    return null;
  }
  const body = await readBody(error.error);
  const code = body?.errorCode;
  if (!body || !code || !KNOWN_CODES.includes(code)) {
    return null;
  }
  return {
    code: code as PayrollExportErrorCode,
    blockers: body.blockers,
    blockerTotal: body.blockerTotal,
  };
}
