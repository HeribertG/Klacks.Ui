// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface IClientImage {
  id: string | undefined;
  clientId: string | undefined;
  imageData: string;
  contentType: string;
  fileName: string | undefined;
  fileSize: number;
}
