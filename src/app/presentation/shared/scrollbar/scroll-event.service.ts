import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ScrollEventService {
  private scrollSubject = new Subject<{horizontal: number, vertical: number}>();
  
  public scroll$ = this.scrollSubject.asObservable();
  
  public emitScroll(horizontal: number, vertical: number) {
    this.scrollSubject.next({horizontal, vertical});
  }
}