// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Host component that opens ng-bootstrap modals (input, delete/confirmation, message) in response to ModalService events.
 * @param contentInput - Template ref for the text-input modal
 * @param contentDelete - Template ref for the delete/confirmation modal
 * @param contentMessage - Template ref for the message modal
 */
import { AfterViewInit, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ModalService, ModalType } from '../modal.service';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DeletewindowComponent } from '../deletewindow/deletewindow.component';
import { MessageWindowComponent } from '../message-window/message-window.component';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  standalone: true,
  imports: [
    FormsModule,
    NgbModule,
    TranslateModule,
    DeletewindowComponent,
    MessageWindowComponent
],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent implements OnInit, AfterViewInit {
  @ViewChild('contentInput', { static: true })
  public contentInput!: ElementRef<HTMLElement>;
  @ViewChild('contentDelete', { static: true })
  private contentDelete!: ElementRef<HTMLElement>;
  @ViewChild('contentMessage', { static: true })
  private contentMessage!: ElementRef<HTMLElement>;

  public modalService = inject(ModalService);
  private ngbModal = inject(NgbModal);
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.modalService.deleteMessageTitleDefault = 'delete';
    this.modalService.deleteMessageOkButtonDefault = '';
  }

  ngAfterViewInit(): void {
    this.modalService.openModelEvent
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((x: ModalType) => {
        switch (x) {
          case ModalType.Input: {
            this.open(this.contentInput, ModalType.Input);
            break;
          }
          case ModalType.Delete:
          case ModalType.Confirmation: {
            this.open(this.contentDelete, x);
            break;
          }
          case ModalType.Message: {
            this.open(this.contentMessage, ModalType.Message);
            break;
          }
        }
      });
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
