// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for uploading, displaying, and deleting the user's profile picture.
 */
import { Component, ChangeDetectorRef, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { getFileExtension } from 'src/app/shared/helpers/string.helper';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile-picture',
  templateUrl: './profile-picture.component.html',
  styleUrls: ['./profile-picture.component.scss'],
  standalone: true,
  imports: [SpinnerModule, TranslateModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePictureComponent implements OnDestroy {
  selectedFile: File | undefined = undefined;

  public dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  onFileSelected(event: { target: { files: File[] } }): void {
    this.selectedFile = event.target.files[0] as File;
    this.upload();
  }

  private upload(): void {
    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    if (id) {
      const ext = getFileExtension(this.selectedFile!.name);
      const filename = ext !== null && ext.length > 0 ? `${id}profile.` + ext : `${id}profile`;
      const fd = new FormData();
      fd.append('file', this.selectedFile!, filename);

      this.dataLoadFileService.upLoadFile(fd)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.tryLoadProfileImage();
          this.selectedFile = undefined;
          this.cdr.markForCheck();
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDeleteImg(): void {
    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    if (id) {
      this.dataLoadFileService.deleteFile(`${id}profile`);
    }
  }

  onUpload(files: unknown): void {
    this.selectedFile = (files as FileList)[0];
    this.upload();
  }

  onUpload1(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFile = input.files[0];
      this.upload();
    }
  }

  private tryLoadProfileImage(): void {
    const id = this.localStorageService.get(StorageKeys.TOKEN_USERID);
    this.dataLoadFileService.downLoadFile(`${id}profile`);
  }
}
