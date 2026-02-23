import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HeaderComponent } from '../../shared/components/header/header';
import { RecipeModalComponent, RecipeFormData, RecipeIngredient } from './recipe-modal';
import { MasterIngredientService } from '../../core/services/master-ingredient.service';

export interface RecipeIngredientDisplay {
  name: string;
  quantity: number | null;
  unit: string;
  masterIngredientId?: number | null;
}

export interface Recipe {
  id: number;
  name: string;
  image: string;
  totalCost: number;
  suggestedPrice: number;
  discount: number;
  ingredients: RecipeIngredientDisplay[];
  showIngredients: boolean;
  cookingTime: number;
  description: string;
}

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, HeaderComponent, RecipeModalComponent],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss'
})
export class Recipes {
  searchQuery: string = '';
  showCreateModal: boolean = false;
  isSaving: boolean = false;

  private masterIngredientService = inject(MasterIngredientService);

  recipes: Recipe[] = [
    {
      id: 1,
      name: 'Cappuccino',
      image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
      totalCost: 8.00,
      suggestedPrice: 12.00,
      discount: 10,
      cookingTime: 10,
      description: 'Classic Italian coffee drink',
      showIngredients: false,
      ingredients: [
        { name: 'Espresso', quantity: 30, unit: 'ml' },
        { name: 'Milk', quantity: 120, unit: 'ml' },
        { name: 'Milk Foam', quantity: 60, unit: 'ml' },
      ]
    },
    {
      id: 2,
      name: 'Avocado Toast',
      image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=400&q=80',
      totalCost: 5.50,
      suggestedPrice: 9.00,
      discount: 15,
      cookingTime: 15,
      description: 'Healthy breakfast with avocado on sourdough',
      showIngredients: false,
      ingredients: [
        { name: 'Sourdough Bread', quantity: 2, unit: 'pcs' },
        { name: 'Avocado', quantity: 1, unit: 'pcs' },
        { name: 'Lemon Juice', quantity: 10, unit: 'ml' },
        { name: 'Salt', quantity: 2, unit: 'g' },
      ]
    }
  ];

  get filteredRecipes(): Recipe[] {
    if (!this.searchQuery.trim()) return this.recipes;
    const q = this.searchQuery.toLowerCase();
    return this.recipes.filter(r => r.name.toLowerCase().includes(q));
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeModal(): void {
    this.showCreateModal = false;
  }

  onSaveRecipe(data: RecipeFormData): void {
    const validIngredients = data.ingredients.filter(i => i.name.trim());
    
    if (validIngredients.length === 0) {
      this.createAndAddRecipe(data, []);
      return;
    }

    this.isSaving = true;

    // Process each ingredient: find or create in master_ingredients
    const ingredientRequests = validIngredients.map(ingredient => {
      if (ingredient.masterIngredientId) {
        // Already selected from catalog, use existing ID
        return of({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unitId,
          masterIngredientId: ingredient.masterIngredientId
        });
      } else {
        // New ingredient - find or create
        return this.masterIngredientService.findOrCreate(ingredient.name.trim()).pipe(
          map(result => ({
            name: result.ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unitId,
            masterIngredientId: result.ingredient.master_ingredient_id
          })),
          catchError(() => of({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unitId,
            masterIngredientId: null
          }))
        );
      }
    });

    forkJoin(ingredientRequests).subscribe({
      next: (processedIngredients) => {
        this.createAndAddRecipe(data, processedIngredients);
        this.isSaving = false;
      },
      error: () => {
        // Fallback: create recipe without master ingredient IDs
        this.createAndAddRecipe(data, validIngredients.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unitId,
          masterIngredientId: null
        })));
        this.isSaving = false;
      }
    });
  }

  private createAndAddRecipe(
    data: RecipeFormData,
    ingredients: { name: string; quantity: number | null; unit: string; masterIngredientId: number | null }[]
  ): void {
    const newRecipe: Recipe = {
      id: Date.now(),
      name: data.name,
      image: data.imagePreview || 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
      totalCost: data.price ?? 0,
      suggestedPrice: Math.round((data.price ?? 0) * 1.5 * 100) / 100,
      discount: 10,
      cookingTime: data.cookingTime ?? 0,
      description: data.description,
      showIngredients: false,
      ingredients: ingredients.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        masterIngredientId: i.masterIngredientId
      }))
    };
    this.recipes.unshift(newRecipe);
    this.showCreateModal = false;
  }

  toggleIngredients(recipe: Recipe): void {
    recipe.showIngredients = !recipe.showIngredients;
  }

  editRecipe(recipe: Recipe): void {
    console.log('Edit recipe:', recipe.name);
  }

  deleteRecipe(recipe: Recipe): void {
    this.recipes = this.recipes.filter(r => r.id !== recipe.id);
  }
}
