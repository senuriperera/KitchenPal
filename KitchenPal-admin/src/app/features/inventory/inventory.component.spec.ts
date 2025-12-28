import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventoryComponent } from './inventory.component';
import { IngredientService } from '../../core/services/ingredient.service';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HeaderComponent } from '../../shared/components/header/header';
import { ActivatedRoute } from '@angular/router';

describe('InventoryComponent', () => {
    let component: InventoryComponent;
    let fixture: ComponentFixture<InventoryComponent>;
    let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;

    beforeEach(async () => {
        ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getIngredientsByBranch', 'updateIngredient', 'deleteIngredient']);
        ingredientServiceSpy.getIngredientsByBranch.and.returnValue(of({ ingredients: [] }));

        await TestBed.configureTestingModule({
            imports: [InventoryComponent, CommonModule, FormsModule, HttpClientTestingModule, HeaderComponent],
            providers: [
                { provide: IngredientService, useValue: ingredientServiceSpy },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => '1' } } }
                }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(InventoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load ingredients on init', () => {
        expect(ingredientServiceSpy.getIngredientsByBranch).toHaveBeenCalled();
    });

    it('should filter ingredients based on search query', () => {
        component.ingredients = [
            { id: 1, name: 'Apple', quantity: 10, unit: 'kg', location: 'Fridge', expiryDate: '2025-01-01', cost: 10, lastScanned: '2024-01-01', status: 'OK', image: '' },
            { id: 2, name: 'Banana', quantity: 5, unit: 'kg', location: 'Pantry', expiryDate: '2025-01-01', cost: 5, lastScanned: '2024-01-01', status: 'OK', image: '' }
        ];
        component.searchQuery = 'Apple';
        component.searchInventory();
        expect(component.filteredIngredients.length).toBe(1);
        expect(component.filteredIngredients[0].name).toBe('Apple');
    });
});
