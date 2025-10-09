import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DragDropFileUploadDirective } from 'src/app/presentation/directives/drag-drop-file-upload.directive';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { DataLoadFileService } from 'src/app/infrastructure/api/data-load-file.service';
import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';

@Component({
  selector: 'app-client-image',
  templateUrl: './client-image.component.html',
  styleUrls: ['./client-image.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    NgbModule,
    DragDropFileUploadDirective,
    IconAngleDownComponent,
    IconAngleRightComponent,
  ],
})
export class ClientImageComponent implements OnInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();

  @ViewChild('imageForm', { static: false }) imageForm: NgForm | undefined;

  selectedFile: File | undefined;
  imageUrl = signal<string | undefined>(undefined);
  isLoading = signal(false);
  errorMessage = signal<string | undefined>(undefined);

  public dataLoadFileService = inject(DataLoadFileService);
  public translate = inject(TranslateService);
  public dataManagementClientService = inject(DataManagementClientService);
  public visibleTable = 'inline';

  ngOnInit(): void {
    this.loadImage();
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  loadImage() {
    const client = this.dataManagementClientService.editClient();
    if (!client || !client.clientImage) {
      this.imageUrl.set(undefined);
      return;
    }

    const imageData = client.clientImage.imageData;
    const contentType = client.clientImage.contentType;

    if (imageData && contentType) {
      try {
        const byteArray = this.base64ToBlob(imageData, contentType);
        const url = URL.createObjectURL(byteArray);
        this.imageUrl.set(url);
      } catch (error) {
        console.error('Error converting image:', error);
        this.imageUrl.set(undefined);
      }
    } else {
      this.imageUrl.set(undefined);
    }
  }

  private base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] as File;
    this.uploadImage();
  }

  onUploadImage(event: any) {
    this.selectedFile = event[0] as File;
    this.uploadImage();
  }

  onUploadImage1(event: any) {
    this.selectedFile = event.target.files[0] as File;
    this.uploadImage();
  }

  private uploadImage() {
    const client = this.dataManagementClientService.editClient();
    if (!client || !this.selectedFile) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(undefined);

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];

      const clientImage = {
        id: client.clientImage?.id,
        clientId: client.id,
        imageData: base64Data,
        contentType: this.selectedFile!.type,
        fileName: this.selectedFile!.name,
        fileSize: this.selectedFile!.size,
      };

      this.dataManagementClientService.editClient.update((c) => {
        if (c) {
          c.clientImage = clientImage;
        }
        return c;
      });

      this.loadImage();
      this.selectedFile = undefined;
      this.isLoading.set(false);
      this.isChangingEvent.emit(true);
    };

    reader.onerror = () => {
      console.error('Error reading file');
      this.errorMessage.set('Error reading file');
      this.isLoading.set(false);
    };

    reader.readAsDataURL(this.selectedFile);
  }

  onClickDeleteImage() {
    if (
      !confirm(this.translate.instant('address.edit-address.client-image.confirm-delete'))
    ) {
      return;
    }

    this.dataManagementClientService.editClient.update((c) => {
      if (c) {
        c.clientImage = undefined;
      }
      return c;
    });

    this.imageUrl.set(undefined);
    this.isChangingEvent.emit(true);
  }
}
