import {
  Component,
  OnInit,
  OnDestroy,
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
import { DeletewindowComponent } from 'src/app/presentation/modal/deletewindow/deletewindow.component';
import { DataBranchService } from 'src/app/infrastructure/api/data-branch.service';
import { IBranch } from 'src/app/domain/models/branch';

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NgbModule,
    SpinnerModule,
    BranchesHeaderComponent,
    BranchesRowComponent
  ],
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
})
export class BranchesComponent implements OnInit, OnDestroy {
  @ViewChild('branchModal', { read: TemplateRef }) branchModal!: TemplateRef<any>;
  @ViewChild('branchForm') branchForm!: NgForm;

  private branchService = inject(DataBranchService);
  private toastService = inject(ToastShowService);
  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);
  private destroy$ = new Subject<void>();

  branches: IBranch[] = [];
  isLoading = false;
  editingBranch: IBranch | null = null;
  private originalBranch: IBranch | null = null;

  isNewBranch = false;
  private isSaving = false;

  ngOnInit(): void {
    this.loadBranches();
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
      isDirty: 0
    };

    this.originalBranch = null;

    setTimeout(() => {
      this.modalService.open(this.branchModal, {
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

    this.modalService.open(this.branchModal, {
      ariaLabelledBy: 'modal-title',
      size: 'lg',
    });
  }

  async onClickDelete(index: number): Promise<void> {
    if (index >= 0 && index < this.branches.length) {
      const branch = this.branches[index];

      if (branch) {
        const modalRef = this.modalService.open(DeletewindowComponent, {
          size: 'md',
          backdrop: 'static',
        });

        modalRef.componentInstance.title = this.translate.instant(
          'setting.branches.delete.title'
        );
        modalRef.componentInstance.message = this.translate.instant(
          'setting.branches.confirm-delete',
          { name: branch.name }
        );

        modalRef.result.then(
          async (result) => {
            if (result === 'delete') {
              try {
                if (!branch.id) {
                  this.toastService.showError(
                    'setting.branches.error.missing-id'
                  );
                  console.error('Branch is missing ID field:', branch);
                  return;
                }
                await firstValueFrom(this.branchService.deleteBranch(branch.id));

                this.branches.splice(index, 1);
                this.toastService.showSuccess(
                  'setting.branches.success.delete',
                  'Success'
                );
              } catch (error) {
                console.error('Error deleting branch:', error);
                this.toastService.showError('setting.branches.error.delete');
              }
            }
          },
          () => {}
        );
      }
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

    return !!(
      this.editingBranch.name &&
      this.editingBranch.address
    );
  }

  getValidationErrors(): string[] {
    const errors: string[] = [];

    if (!this.editingBranch) return errors;

    if (!this.editingBranch.name) {
      errors.push(
        this.translate.instant(
          'setting.branches.validation.name-required'
        )
      );
    }
    if (!this.editingBranch.address) {
      errors.push(
        this.translate.instant(
          'setting.branches.validation.address-required'
        )
      );
    }

    return errors;
  }
}
