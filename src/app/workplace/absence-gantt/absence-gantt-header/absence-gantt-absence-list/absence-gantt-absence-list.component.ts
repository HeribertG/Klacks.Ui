import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  effect,
  EffectRef,
  inject,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { IAbsence } from 'src/app/core/absence-class';
import { AbsenceTokenFilter } from 'src/app/core/break-class';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { invertColor } from 'src/app/helpers/format-helper';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { NgStyle } from '@angular/common';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';

@Component({
  selector: 'app-absence-gantt-absence-list',
  templateUrl: './absence-gantt-absence-list.component.html',
  styleUrls: ['./absence-gantt-absence-list.component.scss'],
  standalone: true,
  imports: [NgStyle, TranslateModule, FallbackPipe],
})
export class AbsenceGanttAbsenceListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public calendarSetting = inject(CalendarSettingService);
  private dataManagementBreak = inject(DataManagementBreakService);
  private translateService = inject(TranslateService);
  private injector = inject(Injector);

  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  checkmark = '&#10003;';

  private imageMap = new Map<string, HTMLImageElement>();
  private ngUnsubscribe = new Subject<void>();
  private effectRef: EffectRef | null = null;

  ngOnInit(): void {
    this.readSignals();
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    if (this.effectRef) {
      this.effectRef.destroy();
      this.effectRef = null;
    }
  }

  onColor(value: IAbsence): string {
    if (value && value.color) {
      return value.color;
    }
    return 'transparent';
  }

  onInvertColor(value: IAbsence): string {
    if (value && value.color) {
      return invertColor(value.color);
    }
    return 'black';
  }

  dragStart(event: DragEvent, item: IAbsence): void {
    const img = this.imageMap.get(item.id!);

    if (event.dataTransfer && img) {
      event.dataTransfer.setData('text/plain', item.id!);
      event.dataTransfer.effectAllowed = 'copy';
      const cellLayerHeight = Math.floor(this.cellHeight() / 4);
      event.dataTransfer.setDragImage(
        img,
        Math.floor(this.calendarSetting.cellWidth / 2),
        cellLayerHeight
      );
    }
  }

  onIsChecked(item: IAbsence): boolean {
    const abs = this.dataManagementBreak.breakFilter.absences.find(
      (x) => x.id === item.id
    );
    if (abs) {
      return abs.checked;
    }
    return false;
  }
  onCheck(item: IAbsence) {
    const abs = this.dataManagementBreak.breakFilter.absences.find(
      (x) => x.id === item.id
    );
    if (abs) {
      abs.checked = !abs.checked;
      this.dataManagementBreak.readYear();
    }
  }

  private fillImageMap() {
    this.dataManagementBreak.isAbsenceHeaderInit.set(false);
    this.imageMap.clear();

    this.dataManagementBreak.breakFilter.absences = [];
    this.dataManagementAbsence.absenceList().forEach((x) => {
      const abs = new AbsenceTokenFilter();

      abs.id = x.id!;
      abs.name = x.name!.de!;
      abs.checked = true;
      this.dataManagementBreak.breakFilter.absences.push(abs);

      const img = new Image();
      img.src = this.createImage(x);
      this.imageMap.set(x.id!, img);
    });

    this.dataManagementBreak.isAbsenceHeaderInit.set(true);
  }

  private createImage(item: IAbsence): string {
    const clientWidth = this.cellWidth(item);
    const clientHeight = this.cellHeight();
    const cellLayerHeight = Math.floor(clientHeight / 4);
    const cellHeight = cellLayerHeight * 3;
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    const ctx = DrawHelper.createHiDPICanvas(
      canvas,
      clientWidth,
      cellHeight,
      false
    );

    ctx.fillStyle = item.color!;
    ctx.fillRect(0, 0, clientWidth, cellHeight);

    return canvas.toDataURL('image/jpeg');
  }
  private cellHeight(): number {
    return this.calendarSetting.cellHeight;
  }
  private cellWidth(item: IAbsence): number {
    return (
      this.calendarSetting.cellWidth *
      (item.defaultLength === 0 ? 1 : item.defaultLength)
    );
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      this.effectRef = effect(() => {
        const isReset = this.dataManagementAbsence.isReset();
        if (isReset) {
          this.fillImageMap();
        }
      });
    });
  }
}
