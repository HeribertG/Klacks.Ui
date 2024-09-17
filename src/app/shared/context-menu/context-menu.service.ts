import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ContextMenuService {
  public hasClicked = new Subject<string[]>();
  constructor() {}

  onClickEvent(event: string, valueEvent: string | undefined) {
    this.hasClicked.next([event, valueEvent ?? '']);
  }
}
