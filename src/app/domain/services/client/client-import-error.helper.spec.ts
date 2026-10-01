// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { HttpErrorResponse } from '@angular/common/http';
import {
  clientImportErrorKey,
  clientImportFileErrorKey,
  extractClientImportErrorCode,
  extractClientImportUploadErrorCode,
  isClientImportConflict,
  readClientImportErrorCode,
} from './client-import-error.helper';
import { CLIENT_IMPORT_MAX_FILE_SIZE_BYTES } from 'src/app/domain/constants/client-import.constants';

const problem = (body: unknown, status = 400) => new HttpErrorResponse({ status, error: body });

describe('client import error helper', () => {
  describe('extractClientImportErrorCode', () => {
    it('reads the code property of a ProblemDetails body', () => {
      expect(extractClientImportErrorCode(problem({ code: 'file-empty', errorCode: 'other' }))).toBe('file-empty');
    });

    it('falls back to errorCode', () => {
      expect(extractClientImportErrorCode(problem({ errorCode: 'invalid-policy' }))).toBe('invalid-policy');
    });

    it('reads a code nested in an extensions object', () => {
      expect(extractClientImportErrorCode(problem({ extensions: { errorCode: 'rows-have-errors' } }))).toBe(
        'rows-have-errors',
      );
      expect(extractClientImportErrorCode(problem({ extensions: { code: 'invalid-request' } }))).toBe(
        'invalid-request',
      );
    });

    it('parses a body that arrives as JSON text', () => {
      expect(extractClientImportErrorCode(problem('{"code":"no-header-row"}'))).toBe('no-header-row');
    });

    it('returns null for bodies without a usable code', () => {
      expect(extractClientImportErrorCode(problem(null))).toBeNull();
      expect(extractClientImportErrorCode(problem('not json'))).toBeNull();
      expect(extractClientImportErrorCode(problem({ code: '' }))).toBeNull();
      expect(extractClientImportErrorCode(problem({ code: 5 }))).toBeNull();
      expect(extractClientImportErrorCode(new Error('x'))).toBeNull();
    });

    it('maps a bodiless 413 to file-too-large', () => {
      expect(extractClientImportErrorCode(problem(null, 413))).toBe('file-too-large');
    });
  });

  describe('extractClientImportUploadErrorCode', () => {
    const limit = CLIENT_IMPORT_MAX_FILE_SIZE_BYTES;

    it('keeps the code of a coded rejection', () => {
      expect(extractClientImportUploadErrorCode(problem({ code: 'no-header-row' }), limit)).toBe('no-header-row');
    });

    it('reads an uncoded 400 for a file at the size limit as file-too-large', () => {
      expect(extractClientImportUploadErrorCode(problem({ title: 'Bad Request' }), limit)).toBe('file-too-large');
    });

    it('leaves an uncoded 400 for a small file without a code', () => {
      expect(extractClientImportUploadErrorCode(problem({ title: 'Bad Request' }), 1024)).toBeNull();
    });

    it('maps a 413 to file-too-large regardless of the size', () => {
      expect(extractClientImportUploadErrorCode(problem(null, 413), 1)).toBe('file-too-large');
    });
  });

  describe('readClientImportErrorCode', () => {
    it('reads the code of an error body that is a blob', async () => {
      const error = problem(new Blob([JSON.stringify({ code: 'unsupported-language' })]));

      expect(await readClientImportErrorCode(error)).toBe('unsupported-language');
    });

    it('returns null for a blob that is not JSON', async () => {
      expect(await readClientImportErrorCode(problem(new Blob(['<html>'])))).toBeNull();
    });

    it('behaves like the synchronous reader for other bodies', async () => {
      expect(await readClientImportErrorCode(problem({ code: 'file-empty' }))).toBe('file-empty');
    });
  });

  describe('isClientImportConflict', () => {
    it('is true for HTTP 409 only', () => {
      expect(isClientImportConflict(problem(null, 409))).toBe(true);
      expect(isClientImportConflict(problem(null, 400))).toBe(false);
    });
  });

  describe('clientImportErrorKey', () => {
    it('resolves file, request and already-committed codes', () => {
      expect(clientImportErrorKey('too-many-rows', 'fallback')).toBe('clientImport.fileError.too-many-rows');
      expect(clientImportErrorKey('invalid-policy', 'fallback')).toBe('clientImport.error.invalid-policy');
      expect(clientImportErrorKey('already-committed', 'fallback')).toBe('clientImport.error.alreadyCommitted');
    });

    it('falls back for unknown or missing codes', () => {
      expect(clientImportErrorKey('teapot', 'fallback')).toBe('fallback');
      expect(clientImportErrorKey(null, 'fallback')).toBe('fallback');
    });

    it('keeps the file error key contract: null without code, generic for unknown codes', () => {
      expect(clientImportFileErrorKey(null)).toBeNull();
      expect(clientImportFileErrorKey('unknown')).toBe('clientImport.error.generic');
      expect(clientImportFileErrorKey('file-empty')).toBe('clientImport.fileError.file-empty');
    });
  });
});
