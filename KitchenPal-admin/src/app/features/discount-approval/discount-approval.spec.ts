import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscountApproval } from './discount-approval';

describe('DiscountApproval', () => {
  let component: DiscountApproval;
  let fixture: ComponentFixture<DiscountApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscountApproval]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiscountApproval);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
