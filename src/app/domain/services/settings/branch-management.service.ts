import { Injectable, inject, signal, effect, DestroyRef, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DataBranchService } from 'src/app/infrastructure/api/settings/data-branch.service';
import { IBranch } from 'src/app/domain/models/branch';
import { cloneObject, compareComplexObjects } from 'src/app/shared/helpers/object.helper';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';

@Injectable({
  providedIn: 'root',
})
export class BranchManagementService {
  private dataBranchService = inject(DataBranchService);
  private destroyRef = inject(DestroyRef);

  public branchesList = signal<IBranch[]>([]);
  public isLoading = signal<boolean>(false);

  private branchesListDummy: IBranch[] = [];
  private pendingBranchOperations = 0;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      this.branchesList();

      untracked(() => {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(() => {
          this.autoSave();
        }, 1500);
      });
    });

    this.destroyRef.onDestroy(() => {
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer);
      }
    });
  }

  private autoSave(): void {
    if (this.isBranchesDirty()) {
      this.saveBranches();
    }
  }

  loadBranches(): void {
    this.isLoading.set(true);

    this.dataBranchService.getBranchList()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (branches) => {
          if (branches) {
            this.branchesList.set(branches as IBranch[]);
            this.branchesListDummy = cloneObject<IBranch[]>(this.branchesList());
          }
        },
        error: (error) => {
          console.error('Failed to load branches:', error);
        }
      });
  }

  async loadBranchesAsync(): Promise<void> {
    const branches = await firstValueFrom(this.dataBranchService.getBranchList());
    if (branches) {
      this.branchesList.set(branches as IBranch[]);
      this.branchesListDummy = cloneObject<IBranch[]>(this.branchesList());
    }
  }

  saveBranches(): void {
    const branchesToSave = this.branchesList();

    branchesToSave.forEach((branch) => {
      if (!branch.isDirty) {
        return;
      }

      const isEmpty = this.isBranchEmpty(branch);

      if (isEmpty && branch.isDirty === CreateEntriesEnum.rewrite) {
        this.deleteBranch(branch.id!);
      } else if (branch.isDirty === CreateEntriesEnum.delete) {
        this.deleteBranch(branch.id!);
      } else if (!isEmpty && branch.isDirty === CreateEntriesEnum.new) {
        this.addBranch(branch);
      } else if (!isEmpty && branch.isDirty === CreateEntriesEnum.rewrite) {
        this.updateBranch(branch);
      }
    });
  }

  private addBranch(branch: IBranch): void {
    this.pendingBranchOperations++;
    const branchToAdd = { ...branch };
    delete branchToAdd.id;

    this.dataBranchService.addBranch(branchToAdd)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to add branch:', error);
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        }
      });
  }

  private updateBranch(branch: IBranch): void {
    this.pendingBranchOperations++;

    this.dataBranchService.updateBranch(branch)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to update branch:', error);
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        }
      });
  }

  private deleteBranch(id: string): void {
    this.pendingBranchOperations++;

    this.dataBranchService.deleteBranch(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        },
        error: (error) => {
          console.error('Failed to delete branch:', error);
          this.pendingBranchOperations--;
          this.checkBranchOperationsComplete();
        }
      });
  }

  private checkBranchOperationsComplete(): void {
    if (this.pendingBranchOperations === 0) {
      this.reloadBranches();
    }
  }

  private reloadBranches(): void {
    this.dataBranchService.getBranchList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((branches) => {
        if (branches) {
          this.branchesList.set(branches as IBranch[]);
          this.branchesListDummy = cloneObject<IBranch[]>(this.branchesList());
        }
      });
  }

  isBranchesDirty(): boolean {
    const listOfExcludedProperties = ['isDirty'];
    const currentList = this.branchesList();

    if (!compareComplexObjects(currentList, this.branchesListDummy, listOfExcludedProperties)) {
      const incompleteEntries = currentList.filter(
        (branch) =>
          branch.isDirty === CreateEntriesEnum.new &&
          this.isBranchEmpty(branch)
      );

      return incompleteEntries.length === 0;
    }
    return false;
  }

  isDirty(): boolean {
    return this.isBranchesDirty();
  }

  private isBranchEmpty(branch: IBranch): boolean {
    return branch.name === '' && branch.address === '' && branch.phone === '' && branch.email === '';
  }
}
