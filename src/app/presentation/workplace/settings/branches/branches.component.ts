/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  inject,
  TemplateRef,
  ViewChild,
} from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { BranchesHeaderComponent } from './branches-header/branches-header.component';
import { BranchesRowComponent } from './branches-row/branches-row.component';
import { DataBranchService } from 'src/app/infrastructure/api/data-branch.service';
import { IBranch } from 'src/app/domain/models/branch';
import {
  ModalService,
  ModalType,
} from 'src/app/presentation/modal/modal.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    BranchesHeaderComponent,
    BranchesRowComponent,
  ],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
})
export class BranchesComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('branchModal', { read: TemplateRef })
  branchModal!: TemplateRef<any>;
  @ViewChild('branchForm') branchForm!: NgForm;

  private branchService = inject(DataBranchService);
  private toastService = inject(ToastShowService);
  private ngbModal = inject(NgbModal);
  private modalService = inject(ModalService);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  branches: IBranch[] = [];
  isLoading = false;
  editingBranch: IBranch | null = null;
  private originalBranch: IBranch | null = null;

  isNewBranch = false;
  private isSaving = false;
  message = MessageLibrary.DELETE_ENTRY;

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
        },
        error: (error) => {
          console.error('Error loading branches:', error);
          this.toastService.showError('setting.branches.error.load-branches');
          this.isLoading = false;
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

    this.originalBranch = null;

    setTimeout(() => {
      this.ngbModal.open(this.branchModal, {
        ariaLabelledBy: 'modal-title',
        size: 'lg',
      });
    }, 0);
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

    this.ngbModal.open(this.branchModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
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

      this.toastService.showSuccess(
        'setting.branches.success.delete',
        'Success'
      );
    } catch (error) {
      console.error('Error deleting branch:', error);
      this.toastService.showError('setting.branches.error.delete');
    }
  }

  private async saveBranch(): Promise<boolean> {
    if (!this.editingBranch || !this.isFormValid() || this.isSaving) {
      return false;
    }

    this.isSaving = true;

    try {
      if (this.originalBranch && this.originalBranch.id) {
        const updatedBranch = { ...this.originalBranch, ...this.editingBranch };
        await firstValueFrom(this.branchService.updateBranch(updatedBranch));
        this.toastService.showSuccess(
          'setting.branches.success.update',
          'Success'
        );
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
          this.toastService.showSuccess(
            'setting.branches.success.create',
            'Success'
          );
        }
      }

      if (this.branchForm) {
        this.branchForm.form.markAsPristine();
      }
      return true;
    } catch (error) {
      console.error('Error saving branch:', error);
      this.toastService.showError('setting.branches.error.save');
      this.loadBranches();
      return false;
    } finally {
      this.isSaving = false;
    }
  }

  isFormValid(): boolean {
    if (!this.editingBranch) return false;

    return !!(this.editingBranch.name && this.editingBranch.address);
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.editingBranch) return errors;

    if (!this.editingBranch.name) {
      errors.push(
        this.translate.instant('setting.branches.validation.name-required')
      );
    }
    if (!this.editingBranch.address) {
      errors.push(
        this.translate.instant('setting.branches.validation.address-required')
      );
    }

    return errors;
  }
}
