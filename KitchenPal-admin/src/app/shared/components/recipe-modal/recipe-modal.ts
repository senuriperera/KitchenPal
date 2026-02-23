import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { MasterIngredientService, MasterIngredient } from '../../../core/services/master-ingredient.service';
import { IngredientService } from '../../../core/services/ingredient.service';

export interface RecipeIngredient {
    name: string;
    quantity: number | null;
    unitId: string;
    masterIngredientId: number | null;
    isNew: boolean; // true if this is a new ingredient not in master_ingredients
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

@Component({
    selector: 'app-recipe-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, HttpClientModule],
    templateUrl: './recipe-modal.html',
    styleUrl: './recipe-modal.scss'
})
export class RecipeModalComponent implements OnChanges, OnDestroy {
    @Input() show: boolean = false;
    @Output() closeModal = new EventEmitter<void>();
    @Output() saveRecipe = new EventEmitter<RecipeFormData>();

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

    constructor() {
        this.loadUnits();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['show'] && changes['show'].currentValue === true) {
            this.form = this.emptyForm();
            this.clearSearchStates();
        }
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
                // Fall back to static units if API fails
                this.units = this.staticUnits;
            }
        });
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
        ingredient.masterIngredientId = null; // Reset selection when typing
        ingredient.isNew = true; // Mark as potentially new until selected

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
            // Trigger a new search if we have a query
            this.getSearchSubject(index).next(ingredient.name);
        }
    }

    onIngredientBlur(index: number): void {
        // Delay hiding to allow click on dropdown item
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

        // Set default unit if available
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
        return state.showDropdown && (state.suggestions.length > 0 || state.isLoading);
    }

    isSearchLoading(index: number): boolean {
        return this.getSearchState(index).isLoading;
    }

    canCreateNewIngredient(index: number): boolean {
        const ingredient = this.form.ingredients[index];
        const state = this.getSearchState(index);
        // Can create if there's a name, no masterIngredientId, and either loading is done or no exact match found
        return ingredient.name.length >= 2 && !ingredient.masterIngredientId && !state.isLoading &&
            !state.suggestions.some(s => s.name.toLowerCase() === ingredient.name.toLowerCase());
    }

    createNewIngredient(index: number): void {
        const ingredient = this.form.ingredients[index];
        ingredient.isNew = true;
        ingredient.masterIngredientId = null; // Will be created on save

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

    // ─── Modal Actions ──────────────────────────────────────────────────────────

    onOverlayClick(): void {
        this.closeModal.emit();
    }

    onCancel(): void {
        this.closeModal.emit();
    }

    onSave(): void {
        this.saveRecipe.emit({ ...this.form });
        this.closeModal.emit();
    }

    isFormValid(): boolean {
        return !!(this.form.name.trim() && this.form.cookingTime && this.form.price);
    }
}
