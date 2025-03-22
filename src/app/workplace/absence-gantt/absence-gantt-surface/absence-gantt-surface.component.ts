import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild,
  effect,
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
import { GridColorService } from 'src/app/grid/services/grid-color.service';
import { GridFontsService } from 'src/app/grid/services/grid-fonts.service';
import { HolidayCollectionService } from 'src/app/grid/services/holiday-collection.service';
import { HolidayDate } from 'src/app/core/calendar-rule-class';
import { DataManagementBreakService } from 'src/app/data/management/data-management-break.service';
import { DataManagementAbsenceGanttService } from 'src/app/data/management/data-management-absence-gantt.service';
import { Break, IBreak } from 'src/app/core/break-class';
import { CursorEnum } from 'src/app/grid/enums/cursor_enums';
import {
  cloneObject,
  compareComplexObjects,
} from 'src/app/helpers/object-helpers';
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
import { SelectedArea } from 'src/app/grid/enums/breaks_enums';
import { ScrollService } from 'src/app/shared/scrollbar/scroll.service';

@Component({
  selector: 'app-absence-gantt-surface',
  templateUrl: './absence-gantt-surface.component.html',
  styleUrls: ['./absence-gantt-surface.component.scss'],
  standalone: false,
})
export class AbsenceGanttSurfaceComponent
  implements OnInit, AfterViewInit, OnChanges, OnDestroy
{
  @Input() contextMenu: ContextMenuComponent | undefined;
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

  public selectedArea: SelectedArea = SelectedArea.None;
  public isLeftMouseDown = false;
  public isShift = false;
  public isCtrl = false;

  private resizeSubject = new Subject<void>();
  private ngUnsubscribe = new Subject<void>();

  private tooltip: HTMLDivElement | undefined;
  private mouseToBarAlpha: { x: number; y: number } | undefined;
  private copiedBreaks: IBreak[] = [];
  private firstDayDate = new Date(2023, 0, 1);
  private isAbsenceHeaderInit = false;
  private countServices = 0;
  private eventListeners = new Array<() => void>();

  constructor(
    public calendarSetting: CalendarSettingService,
    public holidayCollection: HolidayCollectionService,
    public dataManagementBreak: DataManagementBreakService,
    public dataManagementAbsence: DataManagementAbsenceGanttService,
    public drawRowHeader: DrawRowHeaderService,
    public scroll: ScrollService,
    public drawCalendarGantt: DrawCalendarGanttService,
    private renderer: Renderer2,
    private gridColors: GridColorService,
    private gridFonts: GridFontsService,
    private translateService: TranslateService,
    private el: ElementRef,
    private clipboard: Clipboard,
    private cd: ChangeDetectorRef
  ) {
    this.readSignals();
  }

  /* #region dom */
  setBodyCursorStyle(cursorStyle: string): void {
    const bodyElem = this.renderer.selectRootElement('body');
    this.renderer.setStyle(bodyElem, 'cursor', cursorStyle);
  }
  /* #endregion dom */

  /* #region ng */

  ngOnInit(): void {
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
    //console.log('ngOnChanges surface');
    if (changes['valueChangeHScrollbar']) {
      this.scroll.horizontalScrollPosition = this.valueChangeHScrollbar;
      this.drawCalendarGantt.drawCalendar();
    }
    if (changes['valueChangeVScrollbar']) {
      this.scroll.verticalScrollPosition = this.valueChangeVScrollbar;

      this.drawCalendarGantt.moveCalendar(
        this.valueChangeHScrollbar,
        this.valueChangeVScrollbar
      );
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();

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
      this.updateDrawCalendarGanttDimensions(entry.target as HTMLElement);
      this.checkPixelRatio();
      this.redrawComponents();
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
    }
  }

  onMouseUp(event: MouseEvent): void {
    this.currentCursor = CursorEnum.default;
    this.mouseToBarAlpha = undefined;
    this.UpdateSelectedBreakIfNecessary();
  }

  onMouseMove(event: MouseEvent): void {
    const x = event.offsetX;
    const y = event.offsetY;

    if (this.selectedArea !== SelectedArea.None) {
      if (
        this.drawCalendarGantt.selectedBreakRec &&
        !this.drawCalendarGantt.selectedBreakRec.isEmpty()
      ) {
        switch (this.selectedArea) {
          case SelectedArea.LeftAnchor:
            if (this.mouseToBarAlpha) {
              const diffDay = this.drawCalendarGantt.calcX2Column(x);
              if (diffDay !== 0) {
                if (this.drawCalendarGantt.selectedBreak) {
                  this.drawCalendarGantt.selectedBreak.from = addDays(
                    this.firstDayDate,
                    diffDay
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
              }
            }
            break;
          case SelectedArea.RightAnchor:
            if (this.mouseToBarAlpha) {
              const diffDay = this.drawCalendarGantt.calcX2Column(x);
              if (diffDay !== 0) {
                if (this.drawCalendarGantt.selectedBreak) {
                  this.drawCalendarGantt.selectedBreak.until = addDays(
                    this.firstDayDate,
                    diffDay
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
              }
            }
            break;
          case SelectedArea.AbsenceBar:
            if (this.mouseToBarAlpha) {
              const diffA = cloneObject<{ x: number; y: number } | undefined>(
                this.mouseToBarAlpha
              ) as { x: number; y: number } | undefined;
              if (diffA) {
                const diffDay = Math.floor(
                  (x - this.drawCalendarGantt.selectedBreakRec.left - diffA.x) /
                    this.calendarSetting.cellWidth
                );
                if (diffDay !== 0) {
                  if (this.drawCalendarGantt.selectedBreak) {
                    this.drawCalendarGantt.selectedBreak.from = addDays(
                      this.drawCalendarGantt.selectedBreak.from!,
                      diffDay
                    );
                    this.drawCalendarGantt.selectedBreak.until = addDays(
                      this.drawCalendarGantt.selectedBreak.until!,
                      diffDay
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
                }
              }
            }
        }

        this.drawCalendarGantt.drawRowIntern(
          this.drawCalendarGantt.selectedRow
        );
        this.drawCalendarGantt.drawSelectionRow();
        this.drawCalendarGantt.drawSelectedBreak();
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

      // Debug-Ausgabe hinzufügen
      console.log('Selecting row:', tmpSelectedRow);

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

      if (tmpCol === this.drawCalendarGantt.selectedBreakIndex) {
        return;
      }

      this.drawCalendarGantt.selectedBreakIndex = -1;
      this.selectedArea = SelectedArea.None;
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

  public isSelectedBreak_Dirty(): boolean {
    if (this.drawCalendarGantt.selectedBreak) {
      const a = this.drawCalendarGantt.selectedBreak as Break;
      const b = this.drawCalendarGantt.selectedBreak_dummy as Break;

      if (!compareComplexObjects(a, b)) {
        return true;
      }
    }
    return false;
  }

  public UpdateSelectedBreakIfNecessary() {
    if (this.isSelectedBreak_Dirty()) {
      this.dataManagementBreak.updateBreak(
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

  /* #endregion   private */

  /* #region   drag-drop */
  dragOver(ev: DragEvent) {
    ev.preventDefault();
    if (ev.dataTransfer) {
      const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);
      if (this.drawCalendarGantt.dragRow !== position[1]) {
        this.drawCalendarGantt.unDrawDragRow();
        this.drawCalendarGantt.dragRow = position[1];
        this.drawCalendarGantt.drawDragRow();
        this.drawCalendarGantt.unDrawSelectionRow();
        this.drawCalendarGantt.drawSelectionRow();
      }
    }
  }

  drop(ev: DragEvent) {
    ev.preventDefault();
    if (ev.dataTransfer) {
      const absenceId = ev.dataTransfer.getData('text/plain');
      const position = this.calcDroppedCell(ev.offsetX, ev.offsetY);

      this.drawCalendarGantt.unDrawDragRow();
      this.drawCalendarGantt.selectedRow = position[1];

      this.addBreak(position, absenceId);
    }
  }

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
      menuData.list.push(...MenuDataTemplate.copyCutPaste()); //3 menuitem
      menuData.list.push(...MenuDataTemplate.divider()); // menuitem
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
      const list = this.dataManagementAbsence.absenceList;
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
  private addBreak(position: number[], absenceId: string) {
    const client = this.dataManagementBreak.clients[position[1]];
    const absence = this.dataManagementAbsence.absenceList.find(
      (x) => x.id === absenceId
    );
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
      this.drawCalendarGantt.selectedRow &&
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
      this.drawCalendarGantt.selectedRow &&
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
    effect(() => {
      if (this.dataManagementBreak.isRead()) {
        this.setAllScrollValues();
        this.drawCalendarGantt.setMetrics();
        this.drawCalendarGantt.checkSelectedRowVisibility();
        this.drawCalendarGantt.renderCalendar();
        this.drawCalendarGantt.drawCalendar();
      }
    });

    effect(() => {
      if (this.gridColors.isReset()) {
        this.addServicesCount();
      }
    });

    effect(() => {
      if (this.gridFonts.isReset()) {
        this.addServicesCount();
      }
    });

    effect(() => {
      if (this.holidayCollection.isReset()) {
        this.drawCalendarGantt.selectedRow = -1;

        this.firstDayDate = new Date(this.holidayCollection.currentYear, 0, 1);
        this.drawCalendarGantt.resetAll();
        this.dataManagementBreak.readYear();
      }
    });

    //Zeichnet die selektierte Zeile neu
    effect(() => {
      const isUpdate = this.dataManagementBreak.isUpdate();
      if (isUpdate) {
        this.drawCalendarGantt.selectedBreakIndex =
          this.dataManagementBreak.indexOfBreak(isUpdate);
        this.drawCalendarGantt.unDrawSelectionRow();
        if (this.drawCalendarGantt.isSelectedRowVisible()) {
          this.drawCalendarGantt.drawSelectionRow();
        }
        this.drawCalendarGantt.drawSelectedBreak();
        this.drawCalendarGantt.drawRow(
          this.drawCalendarGantt.selectedRow,
          this.drawCalendarGantt.selectedBreak
        );
        this.cd.detectChanges();
      }
    });

    effect(() => {
      this.isAbsenceHeaderInit = this.dataManagementBreak.isAbsenceHeaderInit();
      if (this.isAbsenceHeaderInit) {
        this.drawCalendarGantt.selectedRow = -1;
        this.dataManagementBreak.canReadBreaks = true;
        this.dataManagementBreak.readYear();
        this.cd.detectChanges();
      }
    });
  }
}
