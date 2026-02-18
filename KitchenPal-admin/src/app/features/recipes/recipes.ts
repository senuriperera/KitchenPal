import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../shared/components/header/header';
import { RecipeModalComponent, RecipeFormData } from '../../shared/components/recipe-modal/recipe-modal';

export interface RecipeIngredientDisplay {
  name: string;
  quantity: number | null;
  unit: string;
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
  imports: [CommonModule, FormsModule, HeaderComponent, RecipeModalComponent],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss'
})
export class Recipes {
  searchQuery: string = '';
  showCreateModal: boolean = false;

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
      ingredients: data.ingredients
        .filter(i => i.name.trim())
        .map(i => ({
          name: i.name.trim(),
          quantity: i.quantity,
          unit: String(i.unitId ?? '')
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
