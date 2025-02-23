import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Component({
    selector: 'app-all-group-nav',
    templateUrl: './all-group-nav.component.html',
    styleUrls: ['./all-group-nav.component.scss'],
    standalone: false
})
export class AllGroupNavComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('navGroupForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;
  navClient: HTMLElement | undefined;

  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();
  objectForUnsubscribe: any;

  isComboBoxOpen = false;
  constructor(
    public dataManagementGroupService: DataManagementGroupService,
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
    this.dataManagementGroupService.readPage(false);
  }
}
