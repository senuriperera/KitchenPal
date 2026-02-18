import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface RecipeIngredient {
    name: string;
    quantity: number | null;
    unitId: string;
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

@Component({
    selector: 'app-recipe-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './recipe-modal.html',
    styleUrl: './recipe-modal.scss'
})
export class RecipeModalComponent implements OnChanges {
    @Input() show: boolean = false;
    @Output() closeModal = new EventEmitter<void>();
    @Output() saveRecipe = new EventEmitter<RecipeFormData>();

    units = [
        { id: 'g', label: 'g (grams)' },
        { id: 'kg', label: 'kg (kilograms)' },
        { id: 'ml', label: 'ml (millilitres)' },
        { id: 'L', label: 'L (litres)' },
        { id: 'tsp', label: 'tsp (teaspoon)' },
        { id: 'tbsp', label: 'tbsp (tablespoon)' },
        { id: 'cup', label: 'cup' },
        { id: 'pcs', label: 'pcs (pieces)' },
        { id: 'oz', label: 'oz (ounces)' },
        { id: 'lb', label: 'lb (pounds)' },
    ];

    form: RecipeFormData = this.emptyForm();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['show'] && changes['show'].currentValue === true) {
            this.form = this.emptyForm();
        }
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
        return { name: '', quantity: null, unitId: 'g' };
    }

    addIngredient(): void {
        this.form.ingredients.push(this.newIngredient());
    }

    removeIngredient(index: number): void {
        if (this.form.ingredients.length > 1) {
            this.form.ingredients.splice(index, 1);
        }
    }

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
