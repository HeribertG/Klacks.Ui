/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SpinnerModule } from 'src/app/presentation/spinner/spinner.module';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { getFileExtension } from 'src/app/domain/helpers/format-helper';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile-picture',
  templateUrl: './profile-picture.component.html',
  styleUrls: ['./profile-picture.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgbModule,
    SpinnerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
})
export class ProfilePictureComponent implements OnDestroy {
  @Output() isChangingEvent = new EventEmitter();

  selectedFile: File | undefined = undefined;
  profileImage: any;

  public translate = inject(TranslateService);
  public dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);
  private destroy$ = new Subject<void>();

  onFileSelected(event: { target: { files: File[] } }): void {
    this.selectedFile = event.target.files[0] as File;
    this.upload();
  }

  private upload(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);

    if (id) {
      const ext = getFileExtension(this.selectedFile!.name);

      const filename =
        ext !== null && ext.length > 0 ? `${id}profile.` + ext : `${id}profile`;
      const fd = new FormData();
      fd.append('file', this.selectedFile!, filename);

      this.dataLoadFileService.upLoadFile(fd)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.tryLoadProfileImage();
          this.selectedFile = undefined;
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDeleteImg(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);

    if (id) {
      const type = `${id}profile`;
      this.dataLoadFileService.deleteFile(type);
    }
  }

  onUpload(event: any): void {
    this.selectedFile = event[0] as File;
    this.upload();
  }

  onUpload1(event: any): void {
    this.selectedFile = event.target.files[0] as File;
    this.upload();
  }

  private tryLoadProfileImage(): void {
    const id = this.localStorageService.get(MessageLibrary.TOKEN_USERID);
    const imgId = `${id}profile`;
    this.dataLoadFileService.downLoadFile(imgId);
  }
}
