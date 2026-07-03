// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * DTOs for the automatically managed ERP drop point (single mailbox polled by the backend importer).
 * @param IErpDropPoint - Drop point as returned by the default endpoint
 * @param IErpDropPointRequest - Update request body (used to toggle the import on and off)
 * @param IErpDropPointFile - Single stored file in the drop point (pending or processed)
 * @param IErpDropPointErrorFile - Failed file including the reason the import rejected it
 * @param IErpDropPointFiles - File listing grouped by processing state, newest first
 */

export interface IErpDropPoint {
  id: string;
  name: string;
  sourceSystemId: string;
  bucketPrefix: string;
  isEnabled: boolean;
  lastPolledAt?: string;
  lastError?: string;
}

export interface IErpDropPointRequest {
  name: string;
  sourceSystemId: string;
  bucketPrefix: string;
  isEnabled: boolean;
}

export interface IErpDropPointFile {
  key: string;
  fileName: string;
  sizeBytes: number;
  lastModifiedUtc: string;
}

export interface IErpDropPointErrorFile extends IErpDropPointFile {
  errorReason: string | null;
}

export interface IErpDropPointFiles {
  pending: IErpDropPointFile[];
  processed: IErpDropPointFile[];
  error: IErpDropPointErrorFile[];
}
