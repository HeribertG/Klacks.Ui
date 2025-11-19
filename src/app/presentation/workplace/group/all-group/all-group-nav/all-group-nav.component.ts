
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

@Component({
  selector: 'app-all-group-nav',
  templateUrl: './all-group-nav.component.html',
  styleUrls: ['./all-group-nav.component.scss'],
  standalone: true,
  imports: [FormsModule, NgbDropdownModule, TranslateModule],
})
export class AllGroupNavComponent implements OnInit, AfterViewInit, OnDestroy {
  dataManagementGroupService = inject(DataManagementGroupService);
  private translateService = inject(TranslateService);

  @ViewChild('navGroupForm', { static: false }) navGroupForm:
    | NgForm
    | undefined;
  navClient: HTMLElement | undefined;

  currentLang: Language = MessageLibrary.DEFAULT_LANG;
  private ngUnsubscribe = new Subject<void>();

  isComboBoxOpen = false;
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

  onClose() {
    this.dataManagementGroupService.readPage(false);
  }
}
