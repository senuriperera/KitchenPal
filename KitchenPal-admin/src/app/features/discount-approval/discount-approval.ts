import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header';
import {
  GeneratedRecipeService,
  PendingGeneratedRecipe,
  ApprovedGeneratedRecipe,
  RecipeIngredient,
} from '../../core/services/generated-recipe.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-discount-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './discount-approval.html',
  styleUrls: ['./discount-approval.scss'],
})
export class DiscountApprovalComponent implements OnInit, OnDestroy {
  pending: PendingGeneratedRecipe[] = [];
  recentlyApproved: ApprovedGeneratedRecipe[] = [];
  isLoading = true;
  error: string | null = null;

  editMode: { [generatedId: number]: boolean } = {};
  editValues: {
    [generatedId: number]: { percent: number; price: number };
  } = {};

  showIngredients: { [generatedId: number]: boolean } = {};
  ingredients: { [generatedId: number]: RecipeIngredient[] } = {};
  loadingIngredients: { [generatedId: number]: boolean } = {};

  showRejectForm: { [generatedId: number]: boolean } = {};
  rejectNote: { [generatedId: number]: string } = {};

  private wsSubscription?: Subscription;

  constructor(
    private generatedRecipeService: GeneratedRecipeService,
    private wsService: WebSocketService,
  ) {}

  ngOnInit(): void {
    this.loadPending();
    this.loadRecentlyApproved();
    this.setupWebSocket();
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
  }

  setupWebSocket(): void {
    this.wsSubscription = this.wsService
      .on<PendingGeneratedRecipe>('recipe:pending')
      .subscribe({
        next: (newRecipe) => {
          console.log('New recipe pending approval:', newRecipe);
          this.pending.unshift(newRecipe);
          this.initializeEditValues(newRecipe);
        },
        error: (err) => {
          console.error('WebSocket error:', err);
        },
      });
  }

  loadPending(): void {
    this.isLoading = true;
    this.error = null;
    this.generatedRecipeService.getPending().subscribe({
      next: (items) => {
        this.pending = items;
        this.editMode = {};
        this.editValues = {};
        items.forEach((item) => this.initializeEditValues(item));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load pending generated recipes', err);
        this.error = 'Failed to load pending generated recipes';
        this.isLoading = false;
      },
    });
  }

  loadRecentlyApproved(): void {
    this.generatedRecipeService.getRecentlyApproved().subscribe({
      next: (items) => {
        this.recentlyApproved = items;
      },
      error: (err) => {
        console.error('Failed to load recently approved recipes', err);
      },
    });
  }

  initializeEditValues(item: PendingGeneratedRecipe): void {
    this.editValues[item.generated_id] = {
      percent: item.suggested_discount_percent,
      price: item.suggested_discount_price,
    };
  }

  toggleEdit(generatedId: number): void {
    this.editMode[generatedId] = !this.editMode[generatedId];
  }

  onDiscountPercentChange(item: PendingGeneratedRecipe): void {
    const percent = this.editValues[item.generated_id].percent;
    const newPrice = item.base_price * (1 - percent / 100);
    this.editValues[item.generated_id].price = Math.round(newPrice * 100) / 100;
  }

  onDiscountPriceChange(item: PendingGeneratedRecipe): void {
    const price = this.editValues[item.generated_id].price;
    const percent = ((item.base_price - price) / item.base_price) * 100;
    this.editValues[item.generated_id].percent = Math.round(percent * 10) / 10;
  }

  toggleIngredients(generatedId: number): void {
    this.showIngredients[generatedId] = !this.showIngredients[generatedId];
    console.log(`Toggle ingredients for ${generatedId}:`, this.showIngredients[generatedId]);

    if (
      this.showIngredients[generatedId] &&
      !this.ingredients[generatedId] &&
      !this.loadingIngredients[generatedId]
    ) {
      console.log(`Loading ingredients for ${generatedId}...`);
      this.loadIngredients(generatedId);
    }
  }

  loadIngredients(generatedId: number): void {
    this.loadingIngredients[generatedId] = true;
    this.generatedRecipeService.getIngredients(generatedId).subscribe({
      next: (ingredients) => {
        console.log(`Loaded ${ingredients.length} ingredients for ${generatedId}:`, ingredients);
        this.ingredients[generatedId] = ingredients;
        this.loadingIngredients[generatedId] = false;
      },
      error: (err) => {
        console.error('Failed to load ingredients', err);
        this.ingredients[generatedId] = [];
        this.loadingIngredients[generatedId] = false;
      },
    });
  }

  toggleRejectForm(generatedId: number): void {
    this.showRejectForm[generatedId] = !this.showRejectForm[generatedId];
  }

  approve(item: PendingGeneratedRecipe): void {
    const values = this.editValues[item.generated_id];
    const percent = values?.percent ?? item.suggested_discount_percent;
    const price = values?.price ?? item.suggested_discount_price;

    this.generatedRecipeService.approve(item.generated_id, percent, price).subscribe({
      next: () => {
        this.pending = this.pending.filter(
          (p) => p.generated_id !== item.generated_id,
        );
        this.loadRecentlyApproved();
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
        this.showRejectForm[item.generated_id] = false;
        this.rejectNote[item.generated_id] = '';
      },
      error: (err) => {
        console.error('Failed to reject generated recipe', err);
        this.error = 'Failed to reject this recipe';
      },
    });
  }
}
