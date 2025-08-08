import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import {
  NgbDropdownModule,
  NgbTooltipModule,
} from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { StateCountryToken } from 'src/app/domain/models/calendar-rule-class';
import { DataManagementCalendarRulesService } from 'src/app/domain/services/data-management-calendar-rules.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { FallbackPipe } from 'src/app/pipes/fallback/fallback.pipe';

@Component({
  selector: 'app-calendar-dropdown',
  templateUrl: './calendar-dropdown.component.html',
  styleUrls: ['./calendar-dropdown.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbDropdownModule,
    NgbTooltipModule,
    TranslateModule,
    FontAwesomeModule,
    FallbackPipe,
  ],
})
export class CalendarDropdownComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // @Input() properties
  @Input() header = 'Versuch';

  // @Output() properties
  @Output() changed = new EventEmitter();
  @Output() isClosing = new EventEmitter();
  @Output() isOpening = new EventEmitter();

  // Public injected services
  public dataManagementCalendarRulesService = inject(
    DataManagementCalendarRulesService
  );

  // Private injected services
  private translateService = inject(TranslateService);

  // Public properties (used in templates)
  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  public faSearch = faSearch;

  // Private properties
  private ngUnsubscribe = new Subject<void>();

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

  get hasFilteredTokens(): boolean {
    return !!this.dataManagementCalendarRulesService.filteredRulesToken?.length;
  }
}
