import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  effect,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
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

@Component({
  selector: 'app-absence-gantt-absence-list',
  templateUrl: './absence-gantt-absence-list.component.html',
  styleUrls: ['./absence-gantt-absence-list.component.scss'],
})
export class AbsenceGanttAbsenceListComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  checkmark = '&#10003;';
  private imageMap: Map<string, HTMLImageElement> = new Map();
  private ngUnsubscribe = new Subject<void>();
  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  constructor(
    public dataManagementAbsence: DataManagementAbsenceGanttService,
    public calendarSetting: CalendarSettingService,
    private dataManagementBreak: DataManagementBreakService,
    private translateService: TranslateService
  ) {
    effect(
      () => {
        const isReset = this.dataManagementAbsence.isReset();
        if (isReset) {
          this.fillImageMap();
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
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
    this.dataManagementBreak.isAbsenceHeaderInit.next(false);
    this.imageMap.clear();

    this.dataManagementBreak.breakFilter.absences = [];
    this.dataManagementAbsence.absenceList.forEach((x) => {
      const abs = new AbsenceTokenFilter();

      abs.id = x.id!;
      abs.name = x.name!.de!;
      abs.checked = true;
      this.dataManagementBreak.breakFilter.absences.push(abs);

      const img = new Image();
      img.src = this.createImage(x);
      this.imageMap.set(x.id!, img);
    });

    this.dataManagementBreak.isAbsenceHeaderInit.next(true);
  }

  private createImage(item: IAbsence): string {
    const clientWidth = this.cellWidth(item);
    const clientHeight = this.cellHeight();
    const cellLayerHeight = Math.floor(clientHeight / 4);
    const cellHeight = cellLayerHeight * 3;
    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    const ctx = DrawHelper.createHiDPICanvas(canvas, clientWidth, cellHeight);

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
}
