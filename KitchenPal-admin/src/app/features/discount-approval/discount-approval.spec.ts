import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscountApprovalComponent } from './discount-approval';

describe('DiscountApprovalComponent', () => {
  let component: DiscountApprovalComponent;
  let fixture: ComponentFixture<DiscountApprovalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscountApprovalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DiscountApprovalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
