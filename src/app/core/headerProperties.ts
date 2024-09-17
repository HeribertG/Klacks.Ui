export enum HeaderDirection {
  Up = 'arrow_upward',
  Down = 'arrow_downward',
  None = 'unfold_more',
}

export interface IHeaderProperties {
  order: HeaderDirection;
  filter: string;
}
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
