import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { HeaderComponent } from '../../shared/components/header/header';
import { MasterIngredientService, MasterIngredient } from '../../core/services/master-ingredient.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { RecipeService, Recipe as ApiRecipe, RecipeIngredient as ApiRecipeIngredient } from '../../core/services/recipe.service';
import { UploadService } from '../../core/services/upload.service';

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unitId: number | null;
  unitCode: string;
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
  unitId: number;
  masterIngredientId?: number | null;
}

export interface Recipe {
  id: number;
  name: string;
  image: string;
  totalCost: number;
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
export class Recipes implements OnInit, OnDestroy {
  searchQuery: string = '';
  showCreateModal: boolean = false;
  showViewModal: boolean = false;
  showDeleteModal: boolean = false;
  isSaving: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  isEditMode: boolean = false;
  selectedRecipe: Recipe | null = null;
  recipeToDelete: Recipe | null = null;

  private masterIngredientService = inject(MasterIngredientService);
  private ingredientService = inject(IngredientService);
  private recipeService = inject(RecipeService);
  private uploadService = inject(UploadService);

  // Units
  units: { id: number; code: string; label: string; unit_family: string | null }[] = [];
  private _allUnits: { id: number; code: string; label: string; unit_family: string | null }[] = [];
  // Per-ingredient filtered units (Change 1 & 2): keyed by ingredient index
  filteredUnitsMap: Map<number, { id: number; code: string; label: string; unit_family: string | null }[]> = new Map();

  private staticUnits = [
    { id: 1, code: 'g', label: 'g (grams)', unit_family: 'weight' },
    { id: 2, code: 'kg', label: 'kg (kilograms)', unit_family: 'weight' },
    { id: 3, code: 'ml', label: 'ml (millilitres)', unit_family: 'volume' },
    { id: 4, code: 'L', label: 'L (litres)', unit_family: 'volume' },
    { id: 5, code: 'tsp', label: 'tsp (teaspoon)', unit_family: 'volume' },
    { id: 6, code: 'tbsp', label: 'tbsp (tablespoon)', unit_family: 'volume' },
    { id: 7, code: 'cup', label: 'cup', unit_family: 'volume' },
    { id: 8, code: 'pcs', label: 'pcs (pieces)', unit_family: 'count' },
    { id: 9, code: 'oz', label: 'oz (ounces)', unit_family: 'weight' },
    { id: 10, code: 'lb', label: 'lb (pounds)', unit_family: 'weight' },
  ];

  form: RecipeFormData = this.emptyForm();

  // Search state for each ingredient row
  ingredientSearchStates: Map<number, IngredientSearchState> = new Map();
  private searchSubjects: Map<number, Subject<string>> = new Map();
  private subscriptions: Subscription[] = [];
  private activeDropdownIndex: number | null = null;

  recipes: Recipe[] = [];
  private nextId: number = 1;

  constructor() {
    this.loadUnits();
  }

  ngOnInit(): void {
    this.loadRecipes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchSubjects.forEach(subject => subject.complete());
  }

  private loadRecipes(): void {
    this.isLoading = true;
    this.recipeService.getAllRecipes().subscribe({
      next: (apiRecipes) => {
        this.recipes = apiRecipes.map(r => this.mapApiRecipeToRecipe(r));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load recipes:', error);
        this.errorMessage = 'Failed to load recipes. Please try again.';
        this.isLoading = false;
      }
    });
  }

  private mapApiRecipeToRecipe(apiRecipe: ApiRecipe): Recipe {
    return {
      id: apiRecipe.recipe_id,
      name: apiRecipe.recipe_name,
      image: apiRecipe.image_url || 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
      totalCost: apiRecipe.base_price,
      cookingTime: apiRecipe.cooking_time_minutes || 0,
      description: apiRecipe.description || '',
      showIngredients: false,
      ingredients: apiRecipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity_required,
        unit: ing.unit_code,
        unitId: ing.unit_id,
        masterIngredientId: ing.master_ingredient_id
      }))
    };
  }

  private loadUnits(): void {
    this.ingredientService.getUnits().subscribe({
      next: (units) => {
        this._allUnits = units.map((u: any) => ({
          id: u.unit_id,
          code: u.code,
          label: `${u.code} (${u.name})`,
          unit_family: u.unit_family || null
        }));
        this.units = this._allUnits;
      },
      error: () => {
        this._allUnits = this.staticUnits;
        this.units = this._allUnits;
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
    this.isEditMode = false;
    this.selectedRecipe = null;
    this.form = this.emptyForm();
    this.filteredUnitsMap.clear();
    this.clearSearchStates();
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showViewModal = false;
    this.isEditMode = false;
    this.selectedRecipe = null;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.recipeToDelete = null;
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
      unitId: null,
      unitCode: 'g',
      masterIngredientId: null,
      isNew: false
    };
  }

  addIngredient(): void {
    const newIng = this.newIngredient();
    this.form.ingredients.push(newIng);
    console.log('Added new ingredient, total count:', this.form.ingredients.length);
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

    // Change 1: filter unit dropdown to the ingredient's unit_family.
    // If unit_family is null (legacy DB data), fall back by looking up the default_unit_id's family.
    let familyToFilter: string | null = masterIngredient.unit_family;
    if (!familyToFilter && masterIngredient.default_unit_id) {
      const defaultUnit = this._allUnits.find(u => u.id === masterIngredient.default_unit_id);
      familyToFilter = defaultUnit?.unit_family ?? null;
    }

    if (familyToFilter) {
      const filtered = this._allUnits.filter(u => u.unit_family === familyToFilter);
      this.filteredUnitsMap.set(index, filtered);
    } else {
      // Truly no family info available — show all units
      this.filteredUnitsMap.delete(index);
    }

    // Pre-select the default unit for this ingredient
    if (masterIngredient.default_unit_id) {
      ingredient.unitId = masterIngredient.default_unit_id;
      const matchingUnit = this._allUnits.find(u => u.id === masterIngredient.default_unit_id);
      ingredient.unitCode = matchingUnit?.code || masterIngredient.defaultUnit?.code || 'g';
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
    // For new ingredients show all units (no filter yet — filter applied on unit selection)
    this.filteredUnitsMap.delete(index);

    const state = this.getSearchState(index);
    state.showDropdown = false;
  }

  /**
   * Called when admin changes the unit dropdown for any ingredient row.
   * Change 2: for NEW ingredients, immediately filter the dropdown to the selected unit's family.
   */
  onUnitChange(index: number): void {
    const ingredient = this.form.ingredients[index];
    if (!ingredient.isNew || !ingredient.unitId) return;

    const selectedUnit = this._allUnits.find(u => u.id === Number(ingredient.unitId));
    if (selectedUnit?.unit_family) {
      const filtered = this._allUnits.filter(u => u.unit_family === selectedUnit.unit_family);
      this.filteredUnitsMap.set(index, filtered);
    } else {
      this.filteredUnitsMap.delete(index);
    }
  }

  /**
   * Returns the filtered units for a given ingredient row.
   * Change 1 & 2: returns family-filtered list when available, otherwise all units.
   */
  getFilteredUnits(index: number): { id: number; code: string; label: string; unit_family: string | null }[] {
    return this.filteredUnitsMap.get(index) ?? this._allUnits;
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

  // ─── Recipe CRUD ────────────────────────────────────────────

  async onSaveRecipe(): Promise<void> {
    this.isSaving = true;
    this.errorMessage = '';

    console.log('Form ingredients before processing:', this.form.ingredients);

    // Process new ingredients - create them in master ingredients first
    const newIngredients = this.form.ingredients.filter(i =>
      i.isNew && !i.masterIngredientId && i.name.trim() && i.quantity && i.unitId
    );

    if (newIngredients.length > 0) {
      console.log('Creating new master ingredients:', newIngredients.length);
      try {
        for (const ingredient of newIngredients) {
          const result = await this.masterIngredientService
            .findOrCreate(ingredient.name.trim(), ingredient.unitId!)
            .toPromise();

          if (result) {
            ingredient.masterIngredientId = result.ingredient.master_ingredient_id;
            ingredient.isNew = false;
            console.log(`Created/found master ingredient: ${ingredient.name} (ID: ${ingredient.masterIngredientId})`);
          }
        }
      } catch (error) {
        console.error('Failed to create master ingredients:', error);
        this.errorMessage = 'Failed to create new ingredients. Please try again.';
        this.isSaving = false;
        return;
      }
    }

    const validIngredients = this.form.ingredients
      .filter(i => i.name.trim() && i.quantity && i.unitId && i.masterIngredientId)
      .map(i => ({
        master_ingredient_id: i.masterIngredientId!,
        quantity_required: i.quantity!,
        unit_id: i.unitId!
      }));

    console.log('Valid ingredients after processing:', validIngredients);

    if (validIngredients.length === 0) {
      this.errorMessage = 'Please add at least one valid ingredient with quantity and unit';
      this.isSaving = false;
      return;
    }

    // Upload image to Cloudinary if a new image file is selected
    let imageUrl: string | undefined = this.form.imagePreview || undefined;
    if (this.form.imageFile) {
      try {
        imageUrl = await this.uploadService.uploadImage(this.form.imageFile).toPromise();
      } catch (uploadError) {
        console.warn('Image upload failed, using existing or no image:', uploadError);
        // Continue with existing image or without image - don't block recipe save
      }
    }

    const recipeData = {
      name: this.form.name.trim(),
      image_url: imageUrl,
      cooking_time_minutes: this.form.cookingTime || undefined,
      description: this.form.description || undefined,
      base_price: this.form.price!,
      ingredients: validIngredients
    };

    console.log('Saving recipe:', { isEditMode: this.isEditMode, recipeId: this.selectedRecipe?.id, recipeData });

    if (this.isEditMode && this.selectedRecipe) {
      // Update existing recipe
      console.log('Updating recipe ID:', this.selectedRecipe.id);
      this.recipeService.updateRecipe(this.selectedRecipe.id, recipeData).subscribe({
        next: (response) => {
          console.log('Recipe updated successfully:', response);
          this.loadRecipes();
          this.showCreateModal = false;
          this.showViewModal = false;
          this.isSaving = false;
          this.isEditMode = false;
          this.selectedRecipe = null;
        },
        error: (error) => {
          console.error('Failed to update recipe:', error);
          this.errorMessage = error.error?.error || 'Failed to update recipe. Please try again.';
          this.isSaving = false;
        }
      });
    } else {
      // Create new recipe
      console.log('Creating new recipe');
      this.recipeService.createRecipe(recipeData).subscribe({
        next: (response) => {
          console.log('Recipe created successfully:', response);
          this.loadRecipes();
          this.showCreateModal = false;
          this.isSaving = false;
        },
        error: (error) => {
          console.error('Failed to create recipe:', error);
          this.errorMessage = error.error?.error || 'Failed to create recipe. Please try again.';
          this.isSaving = false;
        }
      });
    }
  }

  toggleIngredients(recipe: Recipe): void {
    recipe.showIngredients = !recipe.showIngredients;
  }

  viewRecipe(recipe: Recipe): void {
    this.selectedRecipe = recipe;
    this.showViewModal = true;
  }

  editRecipe(recipe: Recipe): void {
    this.selectedRecipe = recipe;
    this.isEditMode = true;
    this.showViewModal = false; // Close view modal

    // Populate form with recipe data
    this.form = {
      name: recipe.name,
      cookingTime: recipe.cookingTime,
      price: recipe.totalCost,
      description: recipe.description,
      imageFile: null,
      imagePreview: recipe.image,
      ingredients: recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unitId: ing.unitId,
        unitCode: ing.unit,
        masterIngredientId: ing.masterIngredientId || null,
        isNew: !ing.masterIngredientId
      }))
    };

    // Change 1: pre-populate filteredUnitsMap for each existing (non-new) ingredient
    this.filteredUnitsMap.clear();
    recipe.ingredients.forEach((ing, index) => {
      if (ing.unitId) {
        const unit = this._allUnits.find(u => u.id === ing.unitId);
        if (unit?.unit_family) {
          const filtered = this._allUnits.filter(u => u.unit_family === unit.unit_family);
          this.filteredUnitsMap.set(index, filtered);
        }
      }
    });

    this.showCreateModal = true;
    this.clearSearchStates();
  }

  private getUnitIdFromCode(code: string): number | null {
    const unit = this.units.find(u => u.code === code);
    return unit ? unit.id : null;
  }

  deleteRecipe(recipe: Recipe): void {
    this.recipeToDelete = recipe;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.recipeToDelete) return;

    this.isSaving = true;
    this.recipeService.deleteRecipe(this.recipeToDelete.id).subscribe({
      next: () => {
        this.loadRecipes();
        this.errorMessage = '';
        this.closeDeleteModal();
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Failed to delete recipe:', error);
        this.errorMessage = 'Failed to delete recipe. Please try again.';
        this.isSaving = false;
        this.closeDeleteModal();
      }
    });
  }

  dismissError(): void {
    this.errorMessage = '';
  }

  trackByIndex(index: number): number {
    return index;
  }

  formatQuantity(value: number | null): string {
    if (value === null || value === undefined) return '';
    const formatted = parseFloat(value.toFixed(4));
    return formatted.toString();
  }
}
