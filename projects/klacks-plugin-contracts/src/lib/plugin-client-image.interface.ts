// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Profile image of a client exposed to plugins.
 * @param imageData - Base64-encoded image bytes
 * @param contentType - MIME type of the image
 */

export interface IPluginClientImage {
  imageData: string;
  contentType: string;
}
