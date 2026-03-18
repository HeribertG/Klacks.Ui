// Copyright (c) Heribert Gasparoli Private. All rights reserved.

export interface IClientImage {
  id: string | undefined;
  clientId: string | undefined;
  imageData: string;
  contentType: string;
  fileName: string | undefined;
  fileSize: number;
}
