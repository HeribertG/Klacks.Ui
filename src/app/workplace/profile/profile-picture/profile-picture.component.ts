/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Output, inject } from '@angular/core';

// Angular und Bibliotheksmodule
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

// Anwendungsmodule
import { SharedModule } from 'src/app/shared/shared.module';
import { SpinnerModule } from 'src/app/spinner/spinner.module';

// Services und Utilities
import { DataLoadFileService } from 'src/app/data/data-load-file.service';
import { getFileExtension } from 'src/app/helpers/format-helper';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { LocalStorageService } from 'src/app/services/local-storage.service';

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
    SharedModule,
    SpinnerModule,
    TranslateModule,
    FontAwesomeModule,
  ],
})
export class ProfilePictureComponent {
  @Output() isChangingEvent = new EventEmitter();

  selectedFile: File | undefined = undefined;
  profileImage: any;

  public translate = inject(TranslateService);
  public dataLoadFileService = inject(DataLoadFileService);
  private localStorageService = inject(LocalStorageService);

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

      this.dataLoadFileService.upLoadFile(fd).subscribe(() => {
        this.tryLoadProfileImage();
        this.selectedFile = undefined;
      });
    }
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
