import {
  AfterViewInit,
  Component,
  EventEmitter,
  Inject,
  LOCALE_ID,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { DataManagementGroupService } from 'src/app/data/management/data-management-group.service';
import { Language } from 'src/app/helpers/sharedItems';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { ModalService, ModalType } from 'src/app/modal/modal.service';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-edit-group-item',
  templateUrl: './edit-group-item.component.html',
  styleUrls: ['./edit-group-item.component.scss'],
})
export class EditGroupItemComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('groupForm', { static: false }) groupForm: NgForm | undefined;

  public currentLang: Language = MessageLibrary.DEFAULT_LANG;
  public faCalendar = faCalendar;

  private ngUnsubscribe = new Subject<void>();
  private objectForUnsubscribe: Subscription | undefined;

  constructor(
    public dataManagementGroupService: DataManagementGroupService,
    private ngbModal: NgbModal,
    @Inject(LOCALE_ID) private locale: string,
    private translateService: TranslateService,
    private modalService: ModalService
  ) {
    this.locale = MessageLibrary.DEFAULT_LANG;
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
    this.dataManagementGroupService.init();
  }

  ngAfterViewInit(): void {
    this.objectForUnsubscribe = this.groupForm!.valueChanges!.subscribe(() => {
      if (this.groupForm!.dirty) {
        setTimeout(() => this.isChangingEvent.emit(true), 100);
      }
    });

    this.dataManagementGroupService.isReset
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        setTimeout(() => this.isChangingEvent.emit(false), 100);
      });

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
        setTimeout(() => {}, 200);
      });
  }

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
