import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EffectRef,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import {
  EqualDate,
  addDays,
  daysBetweenDates,
  equalDate,
  transformDateToNgbDateStruct,
} from 'src/app/helpers/format-helper';

import { AbsenceGanttRowHeaderComponent } from '../absence-gantt-row-header/absence-gantt-row-header.component';
import { CalendarSettingService } from 'src/app/workplace/absence-gantt/services/calendar-setting.service';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridColorService } from 'src/app/shared/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/shared/grid/services/grid-fonts.service';
import { HolidayCollectionService } from 'src/app/shared/grid/services/holiday-collection.service';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { Break, IBreak } from 'src/app/core/break-class';
import { CursorEnum } from 'src/app/shared/grid/enums/cursor_enums';
import { cloneObject } from 'src/app/helpers/object-helpers';
import { AbsenceGanttMaskComponent } from '../absence-gantt-mask/absence-gantt-mask.component';
import { TranslateService } from '@ngx-translate/core';
import { ContextMenuComponent } from 'src/app/shared/context-menu/context-menu.component';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { MenuDataTemplate } from 'src/app/helpers/context-menu-data-template';
import { Menu, MenuItem } from 'src/app/shared/context-menu/context-menu-class';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { Clipboard } from '@angular/cdk/clipboard';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';
import { Subject, takeUntil } from 'rxjs';
import { DrawCalendarGanttService } from 'src/app/workplace/absence-gantt/services/draw-calendar-gantt.service';
import { DrawRowHeaderService } from '../services/draw-row-header.service';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';
import { AbsenceCalendarDirective } from '../directives/absence-calendar.directive';
import { ResizeDirective } from 'src/app/directives/resize.directive';
import { ScrollbarService } from 'src/app/shared/scrollbar/scrollbar.service';
import { ContextMenuService } from 'src/app/shared/context-menu/context-menu.service';
import { SelectedArea } from 'src/app/shared/grid/enums/breaks_enums';

@Component({
  selector: 'app-absence-gantt-surface',
  templateUrl: './absence-gantt-surface.component.html',
  styleUrls: ['./absence-gantt-surface.component.scss'],
  standalone: true,
  imports: [ResizeDirective, AbsenceCalendarDirective, ContextMenuComponent],
  providers: [ScrollbarService, ContextMenuService],
})
export class AbsenceGanttSurfaceComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild('contextMenu', { static: false })
  contextMenu!: ContextMenuComponent;
  @Input() absenceMask: AbsenceGanttMaskComponent | undefined;
  @Input() absenceRowHeader: AbsenceGanttRowHeaderComponent | undefined;
  @Input() valueChangeHScrollbar!: number;
  @Input() valueChangeVScrollbar!: number;

  @Output() valueHScrollbar = new EventEmitter<number>();
  @Output() maxValueHScrollbar = new EventEmitter<number>();
  @Output() visibleValueHScrollbar = new EventEmitter<number>();
  @Output() valueVScrollbar = new EventEmitter<number>();
  @Output() maxValueVScrollbar = new EventEmitter<number>();
  @Output() visibleValueVScrollbar = new EventEmitter<number>();

  @ViewChild('boxCalendar') boxCalendar!: ElementRef<HTMLCanvasElement>;

  public calendarSetting = inject(CalendarSettingService);
  public holidayCollection = inject(HolidayCollectionService);
  public dataManagementBreak = inject(DataManagementBreakService);
  public dataManagementAbsence = inject(DataManagementAbsenceGanttService);
  public drawRowHeader = inject(DrawRowHeaderService);
  public scroll = inject(ScrollService);
  public drawCalendarGantt = inject(DrawCalendarGanttService);
  private renderer = inject(Renderer2);
  private gridColors = inject(GridColorService);
  private gridFonts = inject(GridFontsService);
  private translateService = inject(TranslateService);
  private el = inject(ElementRef);
  private clipboard = inject(Clipboard);
  private cd = inject(ChangeDetectorRef);
  private injector = inject(Injector);

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;
  public isShift = false;
  public isCtrl = false;

  private resizeSubject = new Subject<void>();
  private ngUnsubscribe = new Subject<void>();
  private effects: EffectRef[] = [];

  private tooltip: HTMLDivElement | undefined;
  private mouseToBarAlpha: { x: number; y: number } | undefined;
  private copiedBreaks: IBreak[] = [];
  private isAbsenceHeaderInit = false;
  private countServices = 0;
  private eventListeners = new Array<() => void>();

  private originalBreakPosition:
    | { startColumn: number; endColumn: number }
    | undefined;
  private dragStartMouseX: number | undefined;

  /* #region dom */
  setBodyCursorStyle(cursorStyle: string): void {
    const bodyElem = this.renderer.selectRootElement('body');
    this.renderer.setStyle(bodyElem, 'cursor', cursorStyle);
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
    this.readSignals();

    this.drawCalendarGantt.pixelRatio = DrawHelper.pixelRatio();

    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;

    this.absenceMask?.UpdateEvent.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
      () => {
        this.onUpdateMask();
      }
    );
  }

  ngAfterViewInit(): void {
    this.initializeDrawCalendarGantt();

    this.resizeSubject.pipe(takeUntil(this.ngUnsubscribe)).subscribe(() => {
      this.resize();
    });

    this.readServices();

    this.calendarSetting.zoomChangingEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawCalendarGantt.resetAll();
        this.setAllScrollValues();
      });

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.drawCalendarGantt.createRuler();
        this.drawCalendarGantt.drawCalendar();
      });

    this.contextMenu?.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.menuClicked(x);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    let vDirection = false;
    let hDirection = false;

    if (changes['valueChangeHScrollbar']) {
      this.scroll.horizontalScrollPosition = this.valueChangeHScrollbar;
      hDirection = true;
    }

    if (changes['valueChangeVScrollbar']) {
      this.scroll.verticalScrollPosition = this.valueChangeVScrollbar;
      vDirection = true;
    }

    if (vDirection || hDirection) {
      this.drawCalendarGantt.moveCalendar(hDirection, vDirection);
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

    this.effects.forEach((effectRef) => {
      if (effectRef) {
        effectRef.destroy();
      }
    });
    this.effects = [];

    this.eventListeners.forEach((fn) => fn());
    this.eventListeners = [];

    this.drawCalendarGantt.deleteCanvas();
    this.tooltip = undefined;
  }

  /* #endregion ng */

  /* #region   resize+visibility */

  setFocus(): void {
    const x = this.el.nativeElement as HTMLDivElement;
    if (x) {
      x.focus();
      this.drawCalendarGantt.isFocused = true;
    }
  }

  private resize = (): void => {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGantt.pixelRatio !== pixelRatio) {
      this.drawCalendarGantt.pixelRatio = pixelRatio;

      this.drawCalendarGantt.deleteCanvas();
      this.drawCalendarGantt.createCanvas();
    }
  };

  onResize(entries: ResizeObserverEntry[]): void {
    if (entries && entries.length > 0) {
      const entry = entries[0];
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.updateDrawCalendarGanttDimensions(entry.target as HTMLElement);
          this.checkPixelRatio();
          this.redrawComponents();
        });
      });
    }
  }

  private updateDrawCalendarGanttDimensions(element: HTMLElement): void {
    if (!this.drawCalendarGantt.isCanvasAvailable()) {
      return;
    }

    this.drawCalendarGantt.height = element.clientHeight;
    this.drawCalendarGantt.width = element.clientWidth;

    this.setAllScrollValues();
  }

  private checkPixelRatio(): void {
    const pixelRatio = DrawHelper.pixelRatio();
    if (this.drawCalendarGantt.pixelRatio !== pixelRatio) {
      this.drawCalendarGantt.deleteCanvas();
      this.drawCalendarGantt.createCanvas();
      this.drawCalendarGantt.pixelRatio = pixelRatio;
    }
  }

  private redrawComponents(): void {
    this.drawCalendarGantt.createRuler();
    this.drawCalendarGantt.renderCalendar();
    this.drawCalendarGantt.drawCalendar();
  }

  private initializeDrawCalendarGantt(): void {
    const box = this.boxCalendar.nativeElement;
    this.drawCalendarGantt.height = box.clientHeight;
    this.drawCalendarGantt.width = box.clientWidth;
    this.drawCalendarGantt.createCanvas();
  }

  /* #endregion   resize+visibility */

  /* #region   select */

  onMouseDown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const x = event.offsetX;
    const y = event.offsetY;

    if (this.selectedArea !== SelectedArea.None) {
      this.currentCursor = CursorEnum.wResize;
      if (!this.mouseToBarAlpha && this.drawCalendarGantt.selectedBreakRec) {
        this.mouseToBarAlpha = {
          x: x - this.drawCalendarGantt.selectedBreakRec.left,
          y: y - this.drawCalendarGantt.selectedBreakRec.top,
        };
      }

      if (
        this.selectedArea === SelectedArea.AbsenceBar &&
        this.drawCalendarGantt.selectedBreak
      ) {
        this.dragStartMouseX = x;
        this.originalBreakPosition = {
          startColumn: Math.floor(
            daysBetweenDates(
              this.drawCalendarGantt.startDate,
              this.drawCalendarGantt.selectedBreak.from as Date
            )
          ),
          endColumn: Math.floor(
            daysBetweenDates(
              this.drawCalendarGantt.startDate,
              this.drawCalendarGantt.selectedBreak.until as Date
            )
          ),
        };
      }
    }
  }

  onMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.currentCursor = CursorEnum.default;
    this.mouseToBarAlpha = undefined;
    this.originalBreakPosition = undefined;
    this.dragStartMouseX = undefined;
    this.UpdateSelectedBreakIfNecessary();
  }

  onMouseMove(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    const x = event.offsetX;

    if (this.selectedArea !== SelectedArea.None) {
      if (
        this.drawCalendarGantt.selectedBreakRec &&
        !this.drawCalendarGantt.selectedBreakRec.isEmpty()
      ) {
        switch (this.selectedArea) {
          case SelectedArea.LeftAnchor: {
            const leftDiffDay = this.drawCalendarGantt.calcX2Column(x);

            if (this.drawCalendarGantt.selectedBreak) {
              this.drawCalendarGantt.selectedBreak.from = addDays(
                this.drawCalendarGantt.startDate,
                leftDiffDay
              );

              if (
                equalDate(
                  this.drawCalendarGantt.selectedBreak.from!,
                  this.drawCalendarGantt.selectedBreak.until!
                ) > 0
              ) {
                this.drawCalendarGantt.selectedBreak.until =
                  this.drawCalendarGantt.selectedBreak.from!;
              }

              this.drawCalendarGantt.selectedBreak.internalFrom =
                transformDateToNgbDateStruct(
                  this.drawCalendarGantt.selectedBreak.from!
                );
            }
            break;
          }

          case SelectedArea.RightAnchor: {
            const rightDiffDay = this.drawCalendarGantt.calcX2Column(x);

            if (this.drawCalendarGantt.selectedBreak) {
              this.drawCalendarGantt.selectedBreak.until = addDays(
                this.drawCalendarGantt.startDate,
                rightDiffDay
              );

              if (
                equalDate(
                  this.drawCalendarGantt.selectedBreak.until!,
                  this.drawCalendarGantt.selectedBreak.from!
                ) < 0
              ) {
                this.drawCalendarGantt.selectedBreak.from =
                  this.drawCalendarGantt.selectedBreak.until!;
              }

              this.drawCalendarGantt.selectedBreak.internalUntil =
                transformDateToNgbDateStruct(
                  this.drawCalendarGantt.selectedBreak.until!
                );
            }
            break;
          }

          case SelectedArea.AbsenceBar:
            if (
              this.originalBreakPosition &&
              this.dragStartMouseX !== undefined &&
              this.drawCalendarGantt.selectedBreak
            ) {
              // Berechne die Pixel-Verschiebung seit dem Drag-Start
              const pixelDelta = x - this.dragStartMouseX;

              // Konvertiere zu Spalten-Verschiebung
              const columnDelta = Math.round(
                pixelDelta / this.calendarSetting.cellWidth
              );

              // Berechne neue Spalten basierend auf der ursprünglichen Position
              const newStartColumn =
                this.originalBreakPosition.startColumn + columnDelta;
              const newEndColumn =
                this.originalBreakPosition.endColumn + columnDelta;

              this.drawCalendarGantt.selectedBreak.from = addDays(
                this.drawCalendarGantt.startDate,
                newStartColumn
              );
              this.drawCalendarGantt.selectedBreak.until = addDays(
                this.drawCalendarGantt.startDate,
                newEndColumn
              );

              this.drawCalendarGantt.selectedBreak.internalFrom =
                transformDateToNgbDateStruct(
                  this.drawCalendarGantt.selectedBreak.from!
                );
              this.drawCalendarGantt.selectedBreak.internalUntil =
                transformDateToNgbDateStruct(
                  this.drawCalendarGantt.selectedBreak.until!
                );
            }
            break;
        }

        // Zeichne die Änderungen
        this.redrawSelectedRow();
      }
    }
  }

  isMouseOverSelectedBreak(event: MouseEvent): boolean {
    let isSelected = false;

    this.existActiveSelection(event);
    if (this.selectedArea === SelectedArea.AbsenceBar) {
      isSelected = true;
    }

    return isSelected;
  }

  onSelectByMouse(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    const dy = y - this.calendarSetting.cellHeaderHeight;
    const height = this.calendarSetting.cellHeight;

    if (dy >= 0) {
      const tmpRow = Math.floor(dy / height);
      const tmpSelectedRow = tmpRow + this.drawCalendarGantt.firstVisibleRow;

      if (this.drawCalendarGantt.selectedRow !== tmpSelectedRow) {
        this.drawCalendarGantt.selectedRow = tmpSelectedRow;
        this.selectedArea = SelectedArea.None;

        // Explizites Neuzeichnen der ausgewählten Zeile erzwingen
        this.drawCalendarGantt.unDrawSelectionRow();
        this.drawCalendarGantt.drawSelectionRow();
      }

      this.existActiveSelection(event);
      if (
        this.selectedArea === SelectedArea.LeftAnchor ||
        this.selectedArea === SelectedArea.RightAnchor
      ) {
        return;
      }

      this.createBreakSelection(tmpSelectedRow, x);
      this.drawCalendarGantt.drawSelectedBreak();
    }
  }

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }

  private createBreakSelection(selectedRow: number, x: number): void {
    const width = this.calendarSetting.cellWidth;

    if (x >= 0) {
      const tmpCol =
        Math.floor(x / width) + this.drawCalendarGantt.firstVisibleColumn();

      // Debug-Ausgabe für das Datum dieser Spalte
      const date = new Date(this.drawCalendarGantt.startDate);
      date.setDate(date.getDate() + tmpCol);

      if (tmpCol === this.drawCalendarGantt.selectedBreakIndex) {
        return;
      }

      this.drawCalendarGantt.selectedBreakIndex = -1;
      this.selectedArea = SelectedArea.None;

      // Breaks für diese Zeile suchen
      const allBreaks = this.dataManagementBreak.readData(selectedRow);

      let index = 0;
      if (allBreaks) {
        allBreaks.forEach((abs) => {
          const diff = Math.floor(
            daysBetweenDates(abs.from as Date, abs.until as Date)
          );
          const col1 = Math.floor(
            daysBetweenDates(this.drawCalendarGantt.startDate, abs.from as Date)
          );
          const col2 = col1 + diff;

          if (tmpCol >= col1 && tmpCol <= col2) {
            this.drawCalendarGantt.selectedBreakIndex = index;
            this.selectedArea = SelectedArea.AbsenceBar;
            return;
          }

          index++;
        });
      }
    }
  }

  /// Schaut nach ob ein selektierter Break existiert
  private existActiveSelection(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    if (
      this.drawCalendarGantt.selectedBreakRec &&
      this.drawCalendarGantt.selectedBreakRec!.pointInRect(x, y)
    ) {
      this.selectedArea = SelectedArea.AbsenceBar;
      return;
    }
    if (
      this.drawCalendarGantt.selectedBreakRec &&
      !this.drawCalendarGantt.selectedBreakRec.isEmpty()
    ) {
      const left = this.drawCalendarGantt.calcLeftAnchorRectangle(
        this.drawCalendarGantt.selectedBreakRec!
      );
      if (left.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.LeftAnchor;
        return;
      }

      const right = this.drawCalendarGantt.calcRightAnchorRectangle(
        this.drawCalendarGantt.selectedBreakRec!
      );
      if (right.pointInRect(x, y)) {
        this.selectedArea = SelectedArea.RightAnchor;
        return;
      }
    }
    this.selectedArea = SelectedArea.None;
  }

  /* #endregion   select */

  /* #region db*/

  public async UpdateSelectedBreakIfNecessary() {
    const isDirty = this.drawCalendarGantt.isSelectedBreak_Dirty;

    if (isDirty) {
      await this.dataManagementBreak.updateBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak!
      );
    }
  }

  /* #endregion db*/

  /* #region position and selection */

  holidayInfo(column: number): HolidayDate | undefined {
    const today = addDays(this.drawCalendarGantt.startDate, column);
    return this.holidayCollection.holidays.holidayList.find(
      (x) => EqualDate(x.currentDate, today) === 0
    );
  }
  setShiftKey(): void {
    if (!this.isShift) {
      this.isShift = true;
      // this.AnchorKeyPosition = this.position;
    }
  }

  unSetShiftKey(): void {
    this.isShift = false;
    // this.AnchorKeyPosition = undefined;
  }

  calcCorrectCoordinate(event: MouseEvent) {
    return this.drawCalendarGantt.calcCorrectCoordinate(event);
  }

  /* #endregion position and selection */

  /* #region ToolTips */

  showToolTip(value: MultiLanguage, event: MouseEvent): void {
    const name = this.correctName(value);
    if (this.tooltip && this.tooltip!.innerHTML !== name) {
      this.tooltip!.innerHTML = name;

      this.tooltip!.style.display = 'block';
      this.tooltip!.style.opacity = '1';
      this.tooltip!.style.visibility = 'visible';
    }

    this.tooltip!.style.top = event.clientY + 'px';
    this.tooltip!.style.left = event.clientX + 'px';
  }

  hideToolTip() {
    this.destroyToolTip();
  }

  destroyToolTip() {
    this.tooltip!.style.opacity = '0';
    this.tooltip!.style.display = 'none';
    this.tooltip!.innerHTML = '';
    this.tooltip!.style.top = '-9000px';
    this.tooltip!.style.left = '-9000px';
    this.tooltip!.style.visibility = 'hidden';
  }
  /* #endregion ToolTips */

  /* #region   private */

  private readProperty(name: string): string {
    const bodyStyles = window.getComputedStyle(document.body);
    return bodyStyles.getPropertyValue(name);
  }

  private readServices() {
    this.countServices = 0;
    this.gridColors.readData();
    this.gridFonts.readData();
    this.holidayCollection.readData();
    this.dataManagementAbsence.readData();
  }

  private addServicesCount(): void {
    this.countServices++;

    if (this.countServices === 4) {
      this.countServices = 0;
      this.drawCalendarGantt.resetAll();
    }
  }

  private correctName(value: MultiLanguage): string {
    const lang = this.translateService.currentLang;

    if (value[lang] !== undefined) {
      return value[lang] ?? '';
    }

    return '';
  }

  private redrawSelectedRow(): void {
    if (this.drawCalendarGantt.selectedRow >= 0) {
      this.drawCalendarGantt.drawRowIntern(this.drawCalendarGantt.selectedRow);

      this.drawCalendarGantt.drawSelectionRow();
      this.drawCalendarGantt.drawSelectedBreak();
    }
  }

  /* #endregion   private */

  /* #region   drag-drop */

  dragOver(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();

    if (event.dataTransfer) {
      const position = this.calcDroppedCell(event.offsetX, event.offsetY);
      if (this.drawCalendarGantt.dragRow !== position[1]) {
        this.drawCalendarGantt.unDrawDragRow();
        this.drawCalendarGantt.dragRow = position[1];
        this.drawCalendarGantt.drawDragRow();
        this.drawCalendarGantt.unDrawSelectionRow();
        this.drawCalendarGantt.drawSelectionRow();
      }
    }
  }

  drop(event: DragEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (event.dataTransfer) {
      const absenceId = event.dataTransfer.getData('text/plain');
      const position = this.calcDroppedCell(event.offsetX, event.offsetY);

      this.drawCalendarGantt.unDrawDragRow();
      this.drawCalendarGantt.selectedRow = position[1];

      this.addBreak(position, absenceId);
    }
  }

  /**
   * Calculates grid coordinates from mouse coordinates (pixels)
   *
   * @param offsetX - X-coordinate of mouse click (in pixels)
   * @param offsetY - Y-coordinate of mouse click (in pixels)
   * @returns number[] - Array with [columnIndex, rowIndex]
   *   - First number [0]: Horizontal day index (X-axis)
   *   - Second number [1]: Vertical client/employee index (Y-axis)
   *   - Returns [-1, -1] if canvas is invalid
   */
  private calcDroppedCell(offsetX: number, offsetY: number): number[] {
    if (this.drawCalendarGantt.isCanvasAvailable()) {
      let deltaX = Math.ceil(offsetX / this.calendarSetting.cellWidth) - 1;
      let deltaY =
        Math.ceil(
          (offsetY - this.calendarSetting.cellHeaderHeight) /
            this.calendarSetting.cellHeight
        ) - 1;

      deltaX += this.scroll.horizontalScrollPosition;
      deltaY += this.scroll.verticalScrollPosition;

      return [deltaX, deltaY];
    }
    return [-1, -1];
  }

  /* #endregion   drag-drop */

  /* #region   show Entry */

  onChangeIndex(index: number): void {
    this.drawCalendarGantt.selectedBreakIndex = index - 1;
    this.drawCalendarGantt.drawSelectedBreak();
    this.showBreak();
  }

  showBreak() {
    const tmpBreak = this.dataManagementBreak.readData(
      this.drawCalendarGantt.selectedRow
    )![this.drawCalendarGantt.selectedBreakIndex];
    if (tmpBreak) {
      const col1 = Math.floor(
        daysBetweenDates(this.drawCalendarGantt.startDate, tmpBreak.from!)
      );
      const col2 = Math.floor(
        daysBetweenDates(this.drawCalendarGantt.startDate, tmpBreak.until!)
      );

      if (this.drawCalendarGantt.firstVisibleColumn() > col1) {
        const m = col1;

        this.scroll.horizontalScrollPosition = m;
        this.valueHScrollbar.emit(m);
        this.drawCalendarGantt.drawCalendar();
      } else if (this.drawCalendarGantt.lastVisibleColumn() < col2) {
        const m = col2 - this.drawCalendarGantt.visibleCol() + 2;
        this.valueHScrollbar.emit(m);
        this.scroll.horizontalScrollPosition = m;
        this.drawCalendarGantt.drawCalendar();
      }
    }
  }

  onUpdateMask() {
    this.drawCalendarGantt.unDrawSelectionRow();
    this.drawCalendarGantt.drawSelectionRow();
    this.drawCalendarGantt.drawSelectedBreak();
    this.showBreak();
  }
  /* #endregion   show Entry */

  /* #region   context Menu */

  menuClicked(keys: string[]) {
    switch (keys[0]) {
      case 'del':
        this.contextMenu!.closeMenu(true);
        this.Delete();
        break;

      case 'copy':
        this.contextMenu!.closeMenu(true);
        this.copy();
        break;
      case 'cut':
        this.contextMenu!.closeMenu(true);
        this.copy();
        this.Delete();
        break;
      case 'paste':
        this.contextMenu!.closeMenu(true);
        this.paste();
        break;
      case 'convertItem':
        this.contextMenu!.closeMenu(true);
        if (this.drawCalendarGantt.selectedBreak && keys[1]) {
          this.drawCalendarGantt.selectedBreak.absenceId = keys[1];
          this.updateBreak();
        }
        break;
    }
  }

  createContextMenu(event: MouseEvent) {
    const menuData = new Menu();
    const isOverSelection = this.isMouseOverSelectedBreak(event);

    if (isOverSelection) {
      menuData.list.push(...MenuDataTemplate.divider()); // menuitem
      menuData.list.push(...MenuDataTemplate.copyCutPaste()); //3 menuitem
      menuData.list.push(...MenuDataTemplate.delete()); //1 menuitem
      menuData.list.push(...MenuDataTemplate.divider()); // 1 menuitem

      const convertMenu = new MenuItem(
        'convert',
        MessageLibrary.CONVERT,
        false
      );
      convertMenu.hasMenu = true;
      menuData.list.push(convertMenu); //1 menuitem

      const subMenu = this.createSubConvertMenu();
      if (subMenu) {
        menuData.list[6].menu = subMenu;
      }
    } else {
      menuData.list.push(...MenuDataTemplate.paste()); //1
    }

    const pastMenu = menuData.list.find((x) => x.key === 'paste');
    if (pastMenu) {
      pastMenu.disabled = !this.hasCopiedBreaks();
    }

    this.contextMenu!.menuData = menuData;
  }

  private createSubConvertMenu(): Menu | undefined {
    if (this.drawCalendarGantt.selectedBreak) {
      const menuData = new Menu();
      const list = this.dataManagementAbsence.absenceList();
      const id = this.drawCalendarGantt.selectedBreak.id;
      const c = new FallbackPipe();
      list.forEach((x) => {
        if (x.id !== id) {
          const menuItem = new MenuItem(
            'convertItem',
            c.transform(x.name!, this.translateService.currentLang)!,
            false
          );
          menuItem.valueKey = x.id!;
          menuItem.color = x.color;
          menuData.list.push(menuItem);
        }
      });
      return menuData;
    }
    return undefined;
  }
  menuClose() {
    this.contextMenu!.closeMenu();
  }
  /* #endregion   context Menu */

  /* #region   CRUD */

  // position[0]: day index, position[1]: client/employee index
  private addBreak(position: number[], absenceId: string) {
    const client = this.dataManagementBreak.clients[position[1]];
    const absence = this.dataManagementAbsence
      .absenceList()
      .find((x) => x.id === absenceId);
    const newBreak = new Break();
    newBreak.clientId = client.id!;
    delete newBreak.client;
    delete newBreak.absence;
    delete newBreak.id;

    newBreak.absenceId = absenceId!;
    newBreak.from = addDays(this.drawCalendarGantt.startDate, position[0]);
    newBreak.until = addDays(
      newBreak.from,
      absence!.defaultLength! > 1 ? absence!.defaultLength - 1 : 0
    );
    this.dataManagementBreak.dataBreakService
      .addBreak(newBreak)
      .subscribe((x) => {
        this.dataManagementBreak.addBreak(position[1], x);
        this.drawCalendarGantt.selectedRow = position[1];
        this.drawCalendarGantt.selectedBreakIndex =
          this.dataManagementBreak.indexOfBreak(x);
      });
  }

  private updateBreak() {
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      this.dataManagementBreak.updateBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak
      );
    }
  }
  public Delete() {
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      this.dataManagementBreak.deleteBreak(
        this.drawCalendarGantt.selectedRow,
        this.drawCalendarGantt.selectedBreak
      );
    }
  }
  /* #endregion   CRUD */

  /* #region CopyCutPaste */

  public copy() {
    this.copiedBreaks = [];
    if (
      this.drawCalendarGantt.selectedRow > -1 &&
      this.drawCalendarGantt.selectedBreak
    ) {
      const tmp = cloneObject<IBreak>(
        this.drawCalendarGantt.selectedBreak
      ) as Break;

      delete tmp.client;
      delete tmp.absence;
      delete tmp.id;

      const txt = JSON.stringify(tmp);
      this.clipboard.copy(txt);

      this.copiedBreaks.push(tmp);
    }
  }

  private hasCopiedBreaks(): boolean {
    return this.copiedBreaks.length > 0;
  }

  public async paste() {
    if (this.drawCalendarGantt.selectedRow) {
      this.copiedBreaks.forEach((x) => {
        this.dataManagementBreak.addBreak(
          this.drawCalendarGantt.selectedRow,
          x
        );
      });
    }
  }

  public cut(): void {
    this.copy();
    this.Delete();
  }
  /* #endregion CopyCutPaste */

  /* #region Scroll */
  private setAllScrollValues(): void {
    this.setRowsScrollValues();
    this.setColumnsScrollValues();
  }

  private setColumnsScrollValues(): void {
    this.scroll.maxCols = this.drawCalendarGantt.columns;
    this.scroll.visibleCols = this.drawCalendarGantt.visibleCol();
    this.maxValueHScrollbar.emit(this.drawCalendarGantt.columns);
    this.visibleValueHScrollbar.emit(this.drawCalendarGantt.visibleCol());
  }

  private setRowsScrollValues(): void {
    this.scroll.maxRows = this.dataManagementBreak.rows;
    this.scroll.visibleRows = this.drawCalendarGantt.visibleRow();
    this.maxValueVScrollbar.emit(this.drawCalendarGantt.rows);
    this.visibleValueVScrollbar.emit(this.drawCalendarGantt.visibleRow());
  }

  /* #endregion Scroll */

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const effect1 = effect(() => {
        if (this.dataManagementBreak.isRead()) {
          this.setAllScrollValues();
          this.drawCalendarGantt.setMetrics();
          this.drawCalendarGantt.checkSelectedRowVisibility();
          this.drawCalendarGantt.renderCalendar();
          this.drawCalendarGantt.drawCalendar();
        }
      });
      this.effects.push(effect1);

      const effect2 = effect(() => {
        if (this.gridColors.isReset()) {
          this.addServicesCount();
        }
      });
      this.effects.push(effect2);

      const effect3 = effect(() => {
        if (this.gridFonts.isReset()) {
          this.addServicesCount();
        }
      });
      this.effects.push(effect3);

      const effect4 = effect(() => {
        if (this.holidayCollection.isReset()) {
          this.drawCalendarGantt.selectedRow = -1;
          this.drawCalendarGantt.updateStartDate =
            this.holidayCollection.currentYear;
          this.drawCalendarGantt.resetAll();
        }
      });
      this.effects.push(effect4);

      const effect5 = effect(() => {
        const isUpdate = this.dataManagementBreak.isUpdate();
        if (isUpdate) {
          this.drawCalendarGantt.selectedBreakIndex =
            this.dataManagementBreak.indexOfBreak(isUpdate);

          this.onUpdateMask();
          this.cd.detectChanges();
        }
      });
      this.effects.push(effect5);

      const effect6 = effect(() => {
        this.isAbsenceHeaderInit =
          this.dataManagementBreak.isAbsenceHeaderInit();
        if (this.isAbsenceHeaderInit) {
          this.drawCalendarGantt.selectedRow = -1;
          this.dataManagementBreak.canReadBreaks = true;
          this.dataManagementBreak.readYear();
          this.cd.detectChanges();
        }
      });
      this.effects.push(effect6);
    });
  }
}
