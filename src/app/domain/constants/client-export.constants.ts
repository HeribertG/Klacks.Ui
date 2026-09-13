// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Translation keys and CSV layout constants for the client list export, kept in one place so the
 * column order of the file and the order of the translated captions cannot drift apart.
 */

export const CLIENT_EXPORT_COLUMN_KEYS = [
  'client.export.column.number',
  'client.export.column.company',
  'client.export.column.first-name',
  'client.export.column.name',
  'client.export.column.birthdate',
  'client.export.column.type',
] as const;

export const CLIENT_EXPORT_CSV_SEPARATOR = ',';
export const CLIENT_EXPORT_CSV_LINE_BREAK = '\r\n';
export const CLIENT_EXPORT_CSV_BOM = '﻿';
export const CLIENT_EXPORT_CSV_QUOTE = '"';
export const CLIENT_EXPORT_CSV_ESCAPED_QUOTE = '""';
export const CLIENT_EXPORT_CSV_MIME_TYPE = 'text/csv;charset=utf-8;';
export const CLIENT_EXPORT_FILE_NAME = 'clients.csv';
