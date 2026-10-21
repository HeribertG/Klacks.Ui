// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { IHeaderProperties } from './header-properties.interface';
import { HeaderDirection } from './header-direction.enum';

export class HeaderProperties implements IHeaderProperties {
  order = HeaderDirection.Down;
  filter = '';

  public get directionArrow(): string {
    return this.order;
  }

  public DirectionSwitch() {
    if (this.order === HeaderDirection.Down) {
      this.order = HeaderDirection.Up;
    } else if (this.order === HeaderDirection.Up) {
      this.order = HeaderDirection.None;
    } else if (this.order === HeaderDirection.None) {
      this.order = HeaderDirection.Down;
    }
  }

  public DirectionSwitchSimple() {
    if (this.order === HeaderDirection.Down) {
      this.order = HeaderDirection.Up;
    } else if (
      this.order === HeaderDirection.Up ||
      this.order === HeaderDirection.None
    ) {
      this.order = HeaderDirection.Down;
    }
  }
}
