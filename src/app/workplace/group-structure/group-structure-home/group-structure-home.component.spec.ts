import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupStructureHomeComponent } from './group-structure-home.component';

describe('GroupStructureHomeComponent', () => {
  let component: GroupStructureHomeComponent;
  let fixture: ComponentFixture<GroupStructureHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupStructureHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupStructureHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
