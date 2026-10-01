// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Extracts the machine-readable error code of a failed employee import request. The backend answers
 * rejected requests with a ProblemDetails body (HTTP 400, or 409 when the import token was already
 * committed) that carries the code as `code` and as `errorCode`; both names and a nested `extensions`
 * object are read, and a body that arrives as JSON text is parsed. A request rejected by the server's
 * size limit arrives as 413 without a body, which is the same situation as an oversized file.
 * extractClientImportUploadErrorCode additionally reads an uncoded 400 on upload as file-too-large when
 * the file is at the size limit (an upload the server's form reader refused before the import saw it);
 * the client-side size check normally stops such files first, so this is a safety net.
 * The template download asks for a blob, so its error body is a Blob: readClientImportErrorCode reads
 * it asynchronously, extractClientImportErrorCode cannot.
 * A 409 on commit means the import token was already used, i.e. an earlier commit of the same file went
 * through (for example when its response was lost).
 * clientImportErrorKey turns a code into its translation key (file error, request error or already
 * committed) and falls back to the given key for codes outside the contract.
 * @param error - The error thrown by the HTTP call (any value)
 * @param fileSize - Size in bytes of the uploaded file
 * @param code - Error code taken from a failed request, or null when none could be read
 * @param fallbackKey - Translation key used when the code is unknown
 */

import { HttpErrorResponse } from '@angular/common/http';
import {
  CLIENT_IMPORT_ALREADY_COMMITTED_KEY,
  CLIENT_IMPORT_BAD_REQUEST_STATUS,
  CLIENT_IMPORT_CONFLICT_STATUS,
  CLIENT_IMPORT_ERROR_CODE_ALREADY_COMMITTED,
  CLIENT_IMPORT_FILE_ERROR_CODES,
  CLIENT_IMPORT_FILE_ERROR_KEY_PREFIX,
  CLIENT_IMPORT_FILE_ERROR_TOO_LARGE,
  CLIENT_IMPORT_GENERIC_ERROR_KEY,
  CLIENT_IMPORT_MAX_FILE_SIZE_BYTES,
  CLIENT_IMPORT_PAYLOAD_TOO_LARGE_STATUS,
  CLIENT_IMPORT_REQUEST_ERROR_CODES,
  CLIENT_IMPORT_REQUEST_ERROR_KEY_PREFIX,
} from 'src/app/domain/constants/client-import.constants';

const CODE_PROPERTIES = ['code', 'errorCode'] as const;
const EXTENSIONS_PROPERTY = 'extensions';

function codeOf(candidate: unknown): string | null {
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }
  const record = candidate as Record<string, unknown>;
  for (const property of CODE_PROPERTIES) {
    const value = record[property];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return null;
}

function codeOfBody(body: unknown): string | null {
  if (typeof body === 'string') {
    try {
      return codeOfBody(JSON.parse(body));
    } catch {
      return null;
    }
  }
  if (!body || typeof body !== 'object') {
    return null;
  }
  return codeOf(body) ?? codeOf((body as Record<string, unknown>)[EXTENSIONS_PROPERTY]);
}

export function extractClientImportErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }

  if (error.status === CLIENT_IMPORT_PAYLOAD_TOO_LARGE_STATUS) {
    return CLIENT_IMPORT_FILE_ERROR_TOO_LARGE;
  }

  return codeOfBody(error.error);
}

export function extractClientImportUploadErrorCode(error: unknown, fileSize: number): string | null {
  const code = extractClientImportErrorCode(error);
  if (code) {
    return code;
  }
  const uncodedBadRequest =
    error instanceof HttpErrorResponse && error.status === CLIENT_IMPORT_BAD_REQUEST_STATUS;
  return uncodedBadRequest && fileSize >= CLIENT_IMPORT_MAX_FILE_SIZE_BYTES ? CLIENT_IMPORT_FILE_ERROR_TOO_LARGE : null;
}

function readBlobText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function readClientImportErrorCode(error: unknown): Promise<string | null> {
  if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
    if (error.status === CLIENT_IMPORT_PAYLOAD_TOO_LARGE_STATUS) {
      return CLIENT_IMPORT_FILE_ERROR_TOO_LARGE;
    }
    try {
      return codeOfBody(await readBlobText(error.error));
    } catch {
      return null;
    }
  }
  return extractClientImportErrorCode(error);
}

export function isClientImportConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === CLIENT_IMPORT_CONFLICT_STATUS;
}

export function clientImportErrorKey(code: string | null, fallbackKey: string): string {
  if (!code) {
    return fallbackKey;
  }
  if ((CLIENT_IMPORT_FILE_ERROR_CODES as readonly string[]).includes(code)) {
    return CLIENT_IMPORT_FILE_ERROR_KEY_PREFIX + code;
  }
  if ((CLIENT_IMPORT_REQUEST_ERROR_CODES as readonly string[]).includes(code)) {
    return CLIENT_IMPORT_REQUEST_ERROR_KEY_PREFIX + code;
  }
  if (code === CLIENT_IMPORT_ERROR_CODE_ALREADY_COMMITTED) {
    return CLIENT_IMPORT_ALREADY_COMMITTED_KEY;
  }
  return fallbackKey;
}

export function clientImportFileErrorKey(code: string | null): string | null {
  return code ? clientImportErrorKey(code, CLIENT_IMPORT_GENERIC_ERROR_KEY) : null;
}
