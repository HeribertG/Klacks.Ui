// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IImagesThumps } from './images-thumps.interface';

export class ImagesThumps implements IImagesThumps {
  invisibleTicks = 0;
  imgThumb: ImageData | undefined = undefined;
  imgSelectedThumb: ImageData | undefined = undefined;
}
