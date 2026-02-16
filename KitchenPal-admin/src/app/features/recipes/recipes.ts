import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from '../../shared/components/header/header';
import { RecipeService, RecipeResponse } from '../../core/services/recipe.service';
import { IngredientService, IngredientResponse } from '../../core/services/ingredient.service';

interface Recipe {
  id: number;
  name: string;
  totalCost: number;
  suggestedPrice: number;
  discount: number;
  image: string;
  cookingTime: number;
  description?: string;
  ingredients: Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
  }>;
  ingredientsExpanded: boolean;
}

interface NewRecipeForm {
  name: string;
  cookingTime: number;
  description: string;
  basePrice: number;
  imageUrl: string;
  ingredients: Array<{
    ingredientId: number;
    quantity: number;
    unitId: number;
  }>;
}

@Component({
  selector: 'app-recipes',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HttpClientModule],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss',
})
export class Recipes implements OnInit {
  recipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;
  showNewRecipeModal: boolean = false;
  availableIngredients: IngredientResponse[] = [];
  availableUnits: any[] = [];

  // Hardcoded Branch ID for now
  private readonly BRANCH_ID = 1;

  newRecipeForm: NewRecipeForm = {
    name: '',
    cookingTime: 30,
    description: '',
    basePrice: 0,
    imageUrl: '',
    ingredients: []
  };

  constructor(
    private recipeService: RecipeService,
    private ingredientService: IngredientService
  ) {}

  ngOnInit(): void {
    this.loadRecipes();
    this.loadIngredients();
    this.loadUnits();
  }

  loadRecipes(): void {
    this.isLoading = true;
    this.error = null;

    this.recipeService.getRecipesByBranch(this.BRANCH_ID).subscribe({
      next: (data: RecipeResponse[]) => {
        this.recipes = data.map(recipe => this.mapRecipeResponse(recipe));
        this.filteredRecipes = [...this.recipes];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading recipes:', err);
        this.error = 'Failed to load recipes';
        this.isLoading = false;
        // Use mock data for demonstration
        this.loadMockData();
      }
    });
  }

  loadIngredients(): void {
    this.ingredientService.getIngredientsByBranch(this.BRANCH_ID).subscribe({
      next: (data) => {
        this.availableIngredients = data;
      },
      error: (err) => {
        console.error('Error loading ingredients:', err);
      }
    });
  }

  loadUnits(): void {
    this.ingredientService.getUnits().subscribe({
      next: (data) => {
        this.availableUnits = data;
      },
      error: (err) => {
        console.error('Error loading units:', err);
      }
    });
  }

  mapRecipeResponse(recipe: RecipeResponse): Recipe {
    return {
      id: recipe.recipe_id,
      name: recipe.name,
      totalCost: recipe.total_cost || recipe.base_price * 0.7,
      suggestedPrice: recipe.suggested_price || recipe.base_price,
      discount: recipe.discount_percentage || 0,
      image: recipe.image_url || '🍽️',
      cookingTime: recipe.cooking_time_minutes,
      description: recipe.description,
      ingredients: (recipe.ingredients || []).map(ing => ({
        id: ing.ingredient_id,
        name: ing.ingredient_name,
        quantity: ing.quantity_required,
        unit: ing.unit_code || ing.unit_name || ''
      })),
      ingredientsExpanded: false
    };
  }

  loadMockData(): void {
    this.recipes = [
      {
        id: 1,
        name: 'Vegetable Soup',
        totalCost: 8.50,
        suggestedPrice: 12.99,
        discount: 15,
        image: '🥗',
        cookingTime: 30,
        ingredients: [
          { id: 1, name: 'Carrots', quantity: 2, unit: 'pcs' },
          { id: 2, name: 'Celery', quantity: 3, unit: 'stalks' },
          { id: 3, name: 'Onion', quantity: 1, unit: 'pc' },
          { id: 4, name: 'Vegetable Stock', quantity: 500, unit: 'ml' }
        ],
        ingredientsExpanded: false
      },
      {
        id: 2,
        name: 'Fruit Salad',
        totalCost: 5.25,
        suggestedPrice: 8.99,
        discount: 20,
        image: '🥗',
        cookingTime: 15,
        ingredients: [
          { id: 5, name: 'Strawberries', quantity: 200, unit: 'g' },
          { id: 6, name: 'Blueberries', quantity: 100, unit: 'g' },
          { id: 7, name: 'Banana', quantity: 2, unit: 'pcs' }
        ],
        ingredientsExpanded: false
      },
      {
        id: 3,
        name: 'Pasta Primavera',
        totalCost: 7.80,
        suggestedPrice: 13.99,
        discount: 15,
        image: '🍝',
        cookingTime: 25,
        ingredients: [
          { id: 8, name: 'Pasta', quantity: 250, unit: 'g' },
          { id: 9, name: 'Bell Peppers', quantity: 2, unit: 'pcs' },
          { id: 10, name: 'Zucchini', quantity: 1, unit: 'pc' }
        ],
        ingredientsExpanded: false
      },
      {
        id: 4,
        name: 'Greek Yogurt Parfait',
        totalCost: 6.20,
        suggestedPrice: 9.99,
        discount: 10,
        image: '🥛',
        cookingTime: 10,
        ingredients: [
          { id: 11, name: 'Greek Yogurt', quantity: 200, unit: 'g' },
          { id: 12, name: 'Granola', quantity: 50, unit: 'g' },
          { id: 13, name: 'Berries', quantity: 100, unit: 'g' }
        ],
        ingredientsExpanded: false
      }
    ];
    this.filteredRecipes = [...this.recipes];
  }

  searchRecipes(): void {
    if (!this.searchQuery.trim()) {
      this.filteredRecipes = [...this.recipes];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredRecipes = this.recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(query)
    );
  }

  toggleIngredients(recipe: Recipe): void {
    recipe.ingredientsExpanded = !recipe.ingredientsExpanded;
  }

  openNewRecipeModal(): void {
    this.showNewRecipeModal = true;
    this.resetForm();
  }

  closeNewRecipeModal(): void {
    this.showNewRecipeModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newRecipeForm = {
      name: '',
      cookingTime: 30,
      description: '',
      basePrice: 0,
      imageUrl: '',
      ingredients: []
    };
  }

  addIngredientToForm(): void {
    this.newRecipeForm.ingredients.push({
      ingredientId: 0,
      quantity: 0,
      unitId: 0
    });
  }

  removeIngredientFromForm(index: number): void {
    this.newRecipeForm.ingredients.splice(index, 1);
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // In a real app, you would upload to a server or cloud storage
      // For now, we'll just use a placeholder
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newRecipeForm.imageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  saveNewRecipe(): void {
    if (!this.newRecipeForm.name || !this.newRecipeForm.basePrice) {
      alert('Please fill in required fields');
      return;
    }

    this.isLoading = true;

    const recipeData = {
      branch_id: this.BRANCH_ID,
      name: this.newRecipeForm.name,
      cooking_time_minutes: this.newRecipeForm.cookingTime,
      description: this.newRecipeForm.description,
      base_price: this.newRecipeForm.basePrice,
      image_url: this.newRecipeForm.imageUrl,
      ingredients: this.newRecipeForm.ingredients.map(ing => ({
        ingredient_id: ing.ingredientId,
        quantity_required: ing.quantity,
        unit_id: ing.unitId
      }))
    };

    this.recipeService.createRecipe(recipeData).subscribe({
      next: (response) => {
        this.loadRecipes();
        this.closeNewRecipeModal();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error creating recipe:', err);
        alert('Failed to create recipe');
        this.isLoading = false;
      }
    });
  }

  editRecipe(recipe: Recipe): void {
    // TODO: Implement edit functionality
    console.log('Edit recipe:', recipe);
  }

  deleteRecipe(recipe: Recipe): void {
    if (!confirm(`Are you sure you want to delete "${recipe.name}"?`)) {
      return;
    }

    this.recipeService.deleteRecipe(recipe.id).subscribe({
      next: () => {
        this.loadRecipes();
      },
      error: (err) => {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe');
      }
    });
  }
}
