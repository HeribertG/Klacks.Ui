// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component, ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
  signal,
  ChangeDetectorRef,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { form, FormField, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { BranchesHeaderComponent } from './branches-header/branches-header.component';
import { BranchesRowComponent } from './branches-row/branches-row.component';
import { DataBranchService } from 'src/app/infrastructure/api/settings/data-branch.service';
import { SettingsListCardComponent } from 'src/app/presentation/shared/settings-list-card/settings-list-card.component';
import { IBranch } from 'src/app/domain/models/settings/branch';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface BranchFormModel {
  name: string;
  address: string;
  phone: string;
  email: string;
}

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    FormsModule,
    FormField,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    BranchesHeaderComponent,
    BranchesRowComponent,
    SettingsListCardComponent,
  ],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('branchModal', { read: TemplateRef })
  branchModal!: TemplateRef<any>;

  private branchService = inject(DataBranchService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  branches: IBranch[] = [];
  isLoading = false;
  editingBranch: IBranch | null = null;
  private originalBranch: IBranch | null = null;

  isNewBranch = false;
  private isSaving = false;
  message = DomainMessages.DELETE_ENTRY;

  private formModel = signal<BranchFormModel>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  branchForm = form(this.formModel, f => {
    debounce(f.name, 300);
    debounce(f.address, 300);
    debounce(f.phone, 300);
    debounce(f.email, 300);
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  ngAfterViewInit(): void {
    this.modalService.resultEvent
      .pipe(takeUntil(this.destroy$))
      .subscribe((x: ModalType) => {
        if (
          x === ModalType.Delete &&
          this.modalService.componentContext === 'branches'
        ) {
          this.deleteBranch(this.modalService.Filing);
          this.modalService.componentContext = '';
          this.modalService.Filing = '';
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadBranches(): void {
    this.isLoading = true;
    this.branchService
      .getBranchList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (branches) => {
          this.branches = branches;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading branches:', error);
          this.toastService.showError('setting.branches.error.load-branches');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onClickAdd(): void {
    this.isNewBranch = true;
    this.editingBranch = {
      id: undefined,
      name: '',
      address: '',
      phone: '',
      email: '',
      select: false,
      isDirty: 0,
    };

    this.initFormFromBranch(this.editingBranch);
    this.originalBranch = null;

    setTimeout(() => {
      this.ngbModal.open(this.branchModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  private initFormFromBranch(branch: IBranch): void {
    this.formModel.set({
      name: branch.name || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
    });
  }

  private applyFormToBranch(): void {
    if (!this.editingBranch) return;
    const formData = this.formModel();
    this.editingBranch.name = formData.name;
    this.editingBranch.address = formData.address;
    this.editingBranch.phone = formData.phone;
    this.editingBranch.email = formData.email;
  }

  async onSaveModal(modal: any): Promise<void> {
    const success = await this.saveBranch();
    if (success) {
      modal.close();
    }
  }

  onClickEdit(branch: IBranch): void {
    this.isNewBranch = false;
    this.editingBranch = { ...branch };
    this.originalBranch = branch;
    this.initFormFromBranch(this.editingBranch);

    setTimeout(() => {
      this.ngbModal.open(this.branchModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
  }

  openDeleteBranch(branch: IBranch): void {
    if (branch.id) {
      this.modalService.Filing = '';
      this.modalService.componentContext = 'branches';

      this.modalService.Filing = branch.id;
      this.modalService.deleteMessage = this.message;
      this.modalService.setDefault(ModalType.Delete);
      this.modalService.openModel(ModalType.Delete);
    }
  }

  private async deleteBranch(id: string): Promise<void> {
    try {
      await firstValueFrom(this.branchService.deleteBranch(id));

      const index = this.branches.findIndex((b) => b.id === id);
      if (index !== -1) {
        this.branches.splice(index, 1);
      }
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error deleting branch:', error);
      this.toastService.showError('setting.branches.error.delete');
      this.cdr.markForCheck();
    }
  }

  private async saveBranch(): Promise<boolean> {
    if (!this.editingBranch || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.applyFormToBranch();
    this.isSaving = true;

    try {
      if (this.originalBranch && this.originalBranch.id) {
        const updatedBranch = { ...this.originalBranch, ...this.editingBranch };
        await firstValueFrom(this.branchService.updateBranch(updatedBranch));
        this.loadBranches();
      } else {
        const createdBranch = await firstValueFrom(
          this.branchService.addBranch(this.editingBranch)
        );
        if (createdBranch) {
          this.branches.push(createdBranch);
          this.isNewBranch = false;
          this.editingBranch = createdBranch;
          this.originalBranch = createdBranch;
        }
      }

      this.cdr.markForCheck();
      return true;
    } catch (error) {
      console.error('Error saving branch:', error);
      this.toastService.showError('setting.branches.error.save');
      this.loadBranches();
      return false;
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  isFormValid(): boolean {
    if (!this.editingBranch) return false;
    const formData = this.formModel();

    return !!(formData.name && formData.address);
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];
    if (!this.editingBranch) return errors;

    const formData = this.formModel();

    if (!formData.name) {
      errors.push(
        this.translate.instant('setting.branches.validation.name-required')
      );
    }
    if (!formData.address) {
      errors.push(
        this.translate.instant('setting.branches.validation.address-required')
      );
    }

    return errors;
  }
}
