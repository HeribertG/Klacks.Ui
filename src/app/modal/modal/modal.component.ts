/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalService, ModalType } from '../modal.service';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeletewindowComponent } from '../deletewindow/deletewindow.component';
import { MessageWindowComponent } from '../message-window/message-window.component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    TranslateModule,
    DeletewindowComponent,
    MessageWindowComponent,
  ],
})
export class ModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('contentDelete', { static: true })
  private contentDelete!: ElementRef<HTMLElement>;
  @ViewChild('contentMessage', { static: true })
  private contentMessage!: ElementRef<HTMLElement>;
  @ViewChild('contentInput', { static: true })
  public contentInput!: ElementRef<HTMLElement>;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    public modalService: ModalService,
    private ngbModal: NgbModal,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.translateService
      .get('delete')
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.modalService.deleteMessageTitleDefault = x;
      });
    this.translateService
      .get('button.delete')
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.modalService.deleteMessageOkButtonDefault = x;
      });
    this.translateService
      .get('delete')
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x) => {
        this.modalService.deleteMessageTitleDefault = x;
      });
  }

  ngAfterViewInit(): void {
    this.modalService.openModelEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((x: ModalType) => {
        switch (x) {
          case ModalType.Input: {
            this.open(this.contentInput, ModalType.Input);
            break;
          }
          case ModalType.Delete:
          case ModalType.Confirmation: {
            // Füge Confirmation hinzu
            this.open(this.contentDelete, x); // x verwenden statt ModalType.Delete
            break;
          }
          case ModalType.Message: {
            this.open(this.contentMessage, ModalType.Message);
            break;
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  open(content: any, modalType: ModalType): void {
    this.modalService.contentInputString = '';
    this.ngbModal.open(content, { size: 'sm', centered: true }).result.then(
      () => {
        this.modalService.result(modalType);
      },
      () => {
        this.modalService.failedReason(modalType);
      }
    );
  }
}
