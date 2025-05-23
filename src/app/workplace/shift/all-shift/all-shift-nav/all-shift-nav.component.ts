import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
  selector: 'app-all-shift-nav',
  templateUrl: './all-shift-nav.component.html',
  styleUrl: './all-shift-nav.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDropdownModule, TranslateModule],
})
export class AllShiftNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navShiftForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;
  navClient: HTMLElement | undefined;

  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  objectForUnsubscribe: any;

  isComboBoxOpen = false;
  constructor(
    public dataManagementShiftService: DataManagementShiftService,
    private translateService: TranslateService
  ) {}
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
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClose() {
    this.dataManagementShiftService.readPage(false);
  }
}
