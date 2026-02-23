import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import { catchError, map, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { HeaderComponent } from '../../shared/components/header/header';
import { MasterIngredientService, MasterIngredient } from '../../core/services/master-ingredient.service';
import { IngredientService } from '../../core/services/ingredient.service';

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unitId: string;
  masterIngredientId: number | null;
  isNew: boolean;
}

export interface RecipeFormData {
  name: string;
  cookingTime: number | null;
  price: number | null;
  description: string;
  imageFile: File | null;
  imagePreview: string | null;
  ingredients: RecipeIngredient[];
}

interface IngredientSearchState {
  query: string;
  suggestions: MasterIngredient[];
  isLoading: boolean;
  showDropdown: boolean;
}

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
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './recipes.html',
  styleUrl: './recipes.scss'
})
export class Recipes implements OnDestroy {
  searchQuery: string = '';
  showCreateModal: boolean = false;
  isSaving: boolean = false;

  private masterIngredientService = inject(MasterIngredientService);
  private ingredientService = inject(IngredientService);

  // Units from database (will be loaded)
  units: { id: number; code: string; label: string }[] = [];

  // Fallback static units (used until DB units load)
  private staticUnits = [
    { id: 1, code: 'g', label: 'g (grams)' },
    { id: 2, code: 'kg', label: 'kg (kilograms)' },
    { id: 3, code: 'ml', label: 'ml (millilitres)' },
    { id: 4, code: 'L', label: 'L (litres)' },
    { id: 5, code: 'tsp', label: 'tsp (teaspoon)' },
    { id: 6, code: 'tbsp', label: 'tbsp (tablespoon)' },
    { id: 7, code: 'cup', label: 'cup' },
    { id: 8, code: 'pcs', label: 'pcs (pieces)' },
    { id: 9, code: 'oz', label: 'oz (ounces)' },
    { id: 10, code: 'lb', label: 'lb (pounds)' },
  ];

  form: RecipeFormData = this.emptyForm();

  // Search state for each ingredient row
  ingredientSearchStates: Map<number, IngredientSearchState> = new Map();
  private searchSubjects: Map<number, Subject<string>> = new Map();
  private subscriptions: Subscription[] = [];
  private activeDropdownIndex: number | null = null;

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

  constructor() {
    this.loadUnits();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubjects.forEach(subject => subject.complete());
  }

  private loadUnits(): void {
    this.ingredientService.getUnits().subscribe({
      next: (units) => {
        this.units = units.map((u: any) => ({
          id: u.unit_id,
          code: u.code,
          label: `${u.code} (${u.name})`
        }));
      },
      error: () => {
        this.units = this.staticUnits;
      }
    });
  }

  get filteredRecipes(): Recipe[] {
    if (!this.searchQuery.trim()) return this.recipes;
    const q = this.searchQuery.toLowerCase();
    return this.recipes.filter(r => r.name.toLowerCase().includes(q));
  }

  // ─── Modal Methods ────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.showCreateModal = true;
    this.form = this.emptyForm();
    this.clearSearchStates();
  }

  closeModal(): void {
    this.showCreateModal = false;
  }

  onOverlayClick(): void {
    this.closeModal();
  }

  private emptyForm(): RecipeFormData {
    return {
      name: '',
      cookingTime: null,
      price: null,
      description: '',
      imageFile: null,
      imagePreview: null,
      ingredients: [this.newIngredient()]
    };
  }

  newIngredient(): RecipeIngredient {
    return {
      name: '',
      quantity: null,
      unitId: 'g',
      masterIngredientId: null,
      isNew: false
    };
  }

  addIngredient(): void {
    this.form.ingredients.push(this.newIngredient());
  }

  removeIngredient(index: number): void {
    if (this.form.ingredients.length > 1) {
      this.form.ingredients.splice(index, 1);
      this.ingredientSearchStates.delete(index);
      this.searchSubjects.get(index)?.complete();
      this.searchSubjects.delete(index);
    }
  }

  // ─── Searchable Ingredient Dropdown ─────────────────────────────────────────

  private getSearchState(index: number): IngredientSearchState {
    if (!this.ingredientSearchStates.has(index)) {
      this.ingredientSearchStates.set(index, {
        query: '',
        suggestions: [],
        isLoading: false,
        showDropdown: false
      });
    }
    return this.ingredientSearchStates.get(index)!;
  }

  private getSearchSubject(index: number): Subject<string> {
    if (!this.searchSubjects.has(index)) {
      const subject = new Subject<string>();
      this.searchSubjects.set(index, subject);

      const subscription = subject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          const state = this.getSearchState(index);
          if (query.length < 2) {
            state.suggestions = [];
            state.isLoading = false;
            return of([]);
          }
          state.isLoading = true;
          return this.masterIngredientService.search(query).pipe(
            catchError(() => of([]))
          );
        })
      ).subscribe(suggestions => {
        const state = this.getSearchState(index);
        state.suggestions = suggestions;
        state.isLoading = false;
      });

      this.subscriptions.push(subscription);
    }
    return this.searchSubjects.get(index)!;
  }

  onIngredientNameInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    const ingredient = this.form.ingredients[index];

    ingredient.name = query;
    ingredient.masterIngredientId = null;
    ingredient.isNew = true;

    const state = this.getSearchState(index);
    state.query = query;
    state.showDropdown = query.length >= 2;

    this.getSearchSubject(index).next(query);
  }

  onIngredientFocus(index: number): void {
    this.activeDropdownIndex = index;
    const state = this.getSearchState(index);
    const ingredient = this.form.ingredients[index];

    if (ingredient.name.length >= 2) {
      state.showDropdown = true;
      this.getSearchSubject(index).next(ingredient.name);
    }
  }

  onIngredientBlur(index: number): void {
    setTimeout(() => {
      if (this.activeDropdownIndex === index) {
        const state = this.getSearchState(index);
        state.showDropdown = false;
        this.activeDropdownIndex = null;
      }
    }, 200);
  }

  selectIngredient(index: number, masterIngredient: MasterIngredient): void {
    const ingredient = this.form.ingredients[index];
    ingredient.name = masterIngredient.name;
    ingredient.masterIngredientId = masterIngredient.master_ingredient_id;
    ingredient.isNew = false;

    if (masterIngredient.defaultUnit) {
      ingredient.unitId = masterIngredient.defaultUnit.code;
    }

    const state = this.getSearchState(index);
    state.showDropdown = false;
    state.suggestions = [];
  }

  getSuggestions(index: number): MasterIngredient[] {
    return this.getSearchState(index).suggestions;
  }

  isDropdownVisible(index: number): boolean {
    const state = this.getSearchState(index);
    const ingredient = this.form.ingredients[index];
    return state.showDropdown && (state.suggestions.length > 0 || state.isLoading || ingredient.name.length >= 2);
  }

  isSearchLoading(index: number): boolean {
    return this.getSearchState(index).isLoading;
  }

  canCreateNewIngredient(index: number): boolean {
    const ingredient = this.form.ingredients[index];
    const state = this.getSearchState(index);
    return ingredient.name.length >= 2 && !ingredient.masterIngredientId && !state.isLoading &&
      !state.suggestions.some(s => s.name.toLowerCase() === ingredient.name.toLowerCase());
  }

  createNewIngredient(index: number): void {
    const ingredient = this.form.ingredients[index];
    ingredient.isNew = true;
    ingredient.masterIngredientId = null;

    const state = this.getSearchState(index);
    state.showDropdown = false;
  }

  private clearSearchStates(): void {
    this.ingredientSearchStates.clear();
    this.searchSubjects.forEach(subject => subject.complete());
    this.searchSubjects.clear();
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    this.activeDropdownIndex = null;
  }

  // ─── Image Upload ───────────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.form.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.form.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('recipeImageInput') as HTMLInputElement;
    fileInput?.click();
  }

  isFormValid(): boolean {
    return !!(this.form.name.trim() && this.form.cookingTime && this.form.price);
  }

  // ─── Recipe CRUD ────────────────────────────────────────────────────────────

  onSaveRecipe(): void {
    const validIngredients = this.form.ingredients.filter(i => i.name.trim());

    if (validIngredients.length === 0) {
      this.createAndAddRecipe(this.form, []);
      return;
    }

    this.isSaving = true;

    const ingredientRequests = validIngredients.map(ingredient => {
      if (ingredient.masterIngredientId) {
        return of({
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unitId,
          masterIngredientId: ingredient.masterIngredientId
        });
      } else {
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
        this.createAndAddRecipe(this.form, processedIngredients);
        this.isSaving = false;
      },
      error: () => {
        this.createAndAddRecipe(this.form, validIngredients.map(i => ({
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
