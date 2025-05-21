import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { IAuthentication } from 'src/app/core/authentification-class';

@Component({
  selector: 'app-group-scope-row',
  imports: [CommonModule, FormsModule, NgbModule, TranslateModule],
  templateUrl: './group-scope-row.component.html',
  styleUrl: './group-scope-row.component.scss',
  standalone: true,
})
export class GroupScopeRowComponent implements OnInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) groupForm: NgForm | undefined;
  @Input() user: IAuthentication | undefined;
  @Input() number = 0;

  private modalService = inject(NgbModal);
  public translate = inject(TranslateService);

  private formSubscription?: Subscription;

  ngOnInit(): void {
    // Diese Subscription aus macro-row.component.ts übernehmen
    if (this.groupForm?.valueChanges) {
      this.formSubscription = this.groupForm.valueChanges.subscribe(() => {
        if (this.groupForm?.dirty) {
          // Handle form changes if needed
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  open(content: any): void {
    console.log('Before opening modal');

    // Optionen hinzufügen, um versehentliches Schließen zu verhindern
    const modalRef = this.modalService.open(content, {
      size: 'md',
      centered: true,
      animation: true, // Stellt sicher, dass Animationen aktiviert sind
    });

    console.log('Modal reference:', modalRef);

    // Event-Listener für das Modal-Fenster
    setTimeout(() => {
      console.log('Timeout check - Is modal still open?');
      // Stelle sicher, dass das Modal noch geöffnet ist
    }, 500);

    modalRef.result.then(
      (result) => {
        console.log('Modal closed with result:', result);
      },
      (reason) => {
        console.log('Modal dismissed with reason:', reason);
      }
    );
  }
}
