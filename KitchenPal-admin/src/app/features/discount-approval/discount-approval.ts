import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header';
import {
  GeneratedRecipeService,
  PendingGeneratedRecipe,
} from '../../core/services/generated-recipe.service';

@Component({
  selector: 'app-discount-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './discount-approval.html',
  styleUrls: ['./discount-approval.scss'],
})
export class DiscountApprovalComponent implements OnInit {
  pending: PendingGeneratedRecipe[] = [];
  isLoading = true;
  error: string | null = null;

  approveEdit: {
    [generatedId: number]: { percent: number; price: number };
  } = {};

  rejectNote: { [generatedId: number]: string } = {};

  constructor(private generatedRecipeService: GeneratedRecipeService) {}

  ngOnInit(): void {
    this.loadPending();
  }

  loadPending(): void {
    this.isLoading = true;
    this.error = null;
    this.generatedRecipeService.getPending().subscribe({
      next: (items) => {
        this.pending = items;
        this.approveEdit = {};
        for (const item of items) {
          this.approveEdit[item.generated_id] = {
            percent: item.suggested_discount_percent,
            price: item.suggested_discount_price,
          };
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load pending generated recipes', err);
        this.error = 'Failed to load pending generated recipes';
        this.isLoading = false;
      },
    });
  }

  approve(item: PendingGeneratedRecipe): void {
    const form = this.approveEdit[item.generated_id];
    const percent = form?.percent ?? item.suggested_discount_percent;
    const price = form?.price ?? item.suggested_discount_price;

    this.generatedRecipeService
      .approve(item.generated_id, percent, price)
      .subscribe({
        next: () => {
          this.pending = this.pending.filter(
            (p) => p.generated_id !== item.generated_id,
          );
        },
        error: (err) => {
          console.error('Failed to approve generated recipe', err);
          this.error = 'Failed to approve this recipe';
        },
      });
  }

  reject(item: PendingGeneratedRecipe): void {
    const note = this.rejectNote[item.generated_id]?.trim();
    if (!note) {
      this.error = 'Please provide a note when rejecting a recipe.';
      return;
    }

    this.generatedRecipeService.reject(item.generated_id, note).subscribe({
      next: () => {
        this.pending = this.pending.filter(
          (p) => p.generated_id !== item.generated_id,
        );
      },
      error: (err) => {
        console.error('Failed to reject generated recipe', err);
        this.error = 'Failed to reject this recipe';
      },
    });
  }
}
