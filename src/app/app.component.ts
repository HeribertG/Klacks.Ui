import { Component, OnInit, inject } from '@angular/core';
import { ApplicationInitService } from './services/application-init.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  private applicationInitService = inject(ApplicationInitService);
  public title = 'klacks';

  ngOnInit(): void {
    // Initialize only basic settings that don't require authentication
    this.applicationInitService.initializeBasics();
  }
}
