import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
} from '@angular/core';
import { ScheduleScheduleRowHeaderComponent } from '../schedule-schedule-row-header/schedule-schedule-row-header.component';

@Component({
  selector: 'app-schedule-shift-row-header',
  templateUrl: './schedule-shift-row-header.component.html',
  styleUrls: ['./schedule-shift-row-header.component.scss'],
})
export class ScheduleShiftRowHeaderComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() scheduleRowHeader: ScheduleScheduleRowHeaderComponent | undefined;

  constructor(private el: ElementRef, private renderer: Renderer2) {}
  ngOnInit(): void {
    //this.el.nativeElement.
  }
  ngAfterViewInit(): void {
    //throw new Error('Method not implemented.');
  }
  ngOnDestroy(): void {
    // throw new Error('Method not implemented.');
  }
}
