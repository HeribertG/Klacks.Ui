import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { DataManagementSearchService } from 'src/app/data/management/data-management-search.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss'],
})
export class SearchComponent implements OnInit, AfterViewInit, OnDestroy {
  @HostListener('search', ['$event']) onsearch(event: KeyboardEvent) {
    this.onClickSearch();
  }

  public faSearch = faSearch;

  private ngUnsubscribe = new Subject<void>();

  constructor(
    private dataManagementSwitchboard: DataManagementSwitchboardService,
    private dataManagementSearch: DataManagementSearchService,
    private cdr: ChangeDetectorRef
  ) {}

  isIncludeAddress = false;
  includeAddress = false;
  isVisible = false;
  searchString = '';

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.dataManagementSwitchboard.isFocusChangedEvent
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.dataManagementSearch.resetFilter();
        this.searchString = '';
        this.isIncludeAddress =
          this.dataManagementSwitchboard.nameOfVisibleEntity ===
          'DataManagementClientService';
        this.isVisible = this.isComponentVisible();
        this.cdr.detectChanges();
      });

    this.dataManagementSearch.restoreSearch.subscribe((x: string) => {
      this.searchString = x;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickSearch() {
    this.dataManagementSearch.globalSearch(
      this.searchString,
      this.includeAddress
    );
  }

  onKeyupSearch(event: any) {
    if (event.srcElement && event.srcElement.value.toString() === '') {
      this.onClickSearch();
    }
  }

  private isComponentVisible(): boolean {
    switch (this.dataManagementSwitchboard.nameOfVisibleEntity) {
      case 'DataManagementClientService':
      case 'DataManagementBreakService':
      case 'DataManagementGroupService':
        return true;
    }

    return false;
  }
}
