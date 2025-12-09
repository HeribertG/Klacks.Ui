import {
  AfterViewInit,
  Component,
  EffectRef,
  ElementRef,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  runInInjectionContext,
  SimpleChanges,
  ViewChild,
  effect,
} from '@angular/core';
import { Subject } from 'rxjs';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { ScrollService } from 'src/app/presentation/shared/scrollbar/scroll.service';
import { ScrollEventService } from 'src/app/presentation/shared/scrollbar/scroll-event.service';
import { BaseDataService } from 'src/app/presentation/shared/grid/services/data-setting/data.service';
import { ShiftRowHeaderCanvasService } from './services/shift-row-header-canvas.service';
import { ShiftCreateRowHeaderService } from './services/shift-create-row-header.service';
import { ShiftDrawRowHeaderService } from './services/shift-draw-row-header.service';
import { ShiftRowHeaderIconsService } from './services/shift-row-header-icons.service';

@Component({
  selector: 'app-schedule-shift-row-header',
  templateUrl: './schedule-shift-row-header.component.html',
  styleUrls: ['./schedule-shift-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective],
  providers: [
    ShiftRowHeaderCanvasService,
    ShiftCreateRowHeaderService,
    ShiftDrawRowHeaderService,
    ShiftRowHeaderIconsService,
  ],
})
export class ScheduleShiftRowHeaderComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('box') boxElement!: ElementRef<HTMLDivElement>;

  @Input() valueChangeVScrollbar!: number;

  private injector = inject(Injector);
  private scroll = inject(ScrollService);
  private scrollEventService = inject(ScrollEventService);
  private drawRowHeader = inject(ShiftDrawRowHeaderService);
  private dataService = inject(BaseDataService);

  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  ngAfterViewInit(): void {
    this.initializeDrawRowHeader();
    this.readSignals();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
    this.drawRowHeader.deleteCanvas();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['valueChangeVScrollbar']) {
      const prevV = changes['valueChangeVScrollbar'].previousValue;
      const currV = changes['valueChangeVScrollbar'].currentValue;
      if (currV !== prevV) {
        this.scroll.verticalScrollPosition = currV;
      }
    }
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      this.updateDrawRowHeaderDimensions(entry.target as HTMLElement);
      this.drawRowHeader.refresh();
    }
  }

  private initializeDrawRowHeader(): void {
    this.updateDrawRowHeaderDimensions();
    this.drawRowHeader.createCanvas();
  }

  private updateDrawRowHeaderDimensions(element?: Element): void {
    const box = element || this.boxElement.nativeElement;
    this.drawRowHeader.width = box.clientWidth;
    this.drawRowHeader.height = box.clientHeight;
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const refreshEffect = effect(() => {
        this.dataService.refreshSignal();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.redraw();
        }
      });
      this.effects.push(refreshEffect);

      const scrollEffect = effect(() => {
        this.scrollEventService.scrollPosition();
        if (this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.moveGrid();
        }
      });
      this.effects.push(scrollEffect);
    });
  }
}
