import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { StateCountryToken } from 'src/app/core/calendar-rule-class';
import { DataManagementCalendarRulesService } from 'src/app/data/management/data-management-calendar-rules.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-calendar-dropdown',
  templateUrl: './calendar-dropdown.component.html',
  styleUrls: ['./calendar-dropdown.component.scss'],
})
export class CalendarDropdownComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Input() header: string = '';

  @Output() isOpening = new EventEmitter();
  @Output() isClosing = new EventEmitter();
  @Output() changed = new EventEmitter();

  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  constructor(
    public dataManagementCalendarRulesService: DataManagementCalendarRulesService,
    private translateService: TranslateService
  ) {}
  ngOnInit(): void {
    this.dataManagementCalendarRulesService.init();
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

  onOpenChange() {
    this.isOpening.emit();
  }

  onSelectStates(value: boolean): void {
    this.dataManagementCalendarRulesService.selectStates(
      this.dataManagementCalendarRulesService.selectedCountry,
      value
    );
    this.changed.emit();
  }

  onCountryChange() {
    this.dataManagementCalendarRulesService.filterStatesByCountries(
      this.dataManagementCalendarRulesService.selectedCountry
    );
  }
  onChangeStateSelection(value: StateCountryToken) {
    this.dataManagementCalendarRulesService.setValue(value);
    this.changed.emit();
  }

  onClose() {
    this.isClosing.emit();
  }
}
