import { Component } from '@angular/core';
import { ToastService } from './toast/toast.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent {
  title = 'klacks';

  constructor(public toastService: ToastService) {}
}
