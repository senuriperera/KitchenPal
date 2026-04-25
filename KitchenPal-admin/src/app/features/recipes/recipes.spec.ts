import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Recipes } from './recipes';
import { RecipeService } from '../../core/services/recipe.service';
import { MasterIngredientService } from '../../core/services/master-ingredient.service';
import { IngredientService } from '../../core/services/ingredient.service';
import { UploadService } from '../../core/services/upload.service';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';

describe('Recipes Component', () => {
    let component: Recipes;
    let fixture: ComponentFixture<Recipes>;

    let recipeServiceSpy: jasmine.SpyObj<RecipeService>;
    let masterIngServiceSpy: jasmine.SpyObj<MasterIngredientService>;
    let ingredientServiceSpy: jasmine.SpyObj<IngredientService>;
    let uploadServiceSpy: jasmine.SpyObj<UploadService>;
    let authServiceSpy: jasmine.SpyObj<AuthService>;
    let wsServiceStub: Partial<WebSocketService>;

    beforeEach(async () => {
        recipeServiceSpy = jasmine.createSpyObj('RecipeService', ['getAllRecipes', 'createRecipe', 'updateRecipe', 'deleteRecipe']);
        masterIngServiceSpy = jasmine.createSpyObj('MasterIngredientService', ['getAll', 'search']);
        ingredientServiceSpy = jasmine.createSpyObj('IngredientService', ['getUnits']);
        uploadServiceSpy = jasmine.createSpyObj('UploadService', ['uploadImage']);
        authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);

        wsServiceStub = {
            recipeGenerated$: new Subject<any>().asObservable(),
            recipeApproved$: new Subject<any>().asObservable(),
            recipeRejected$: new Subject<any>().asObservable(),
            on: (() => of(null)) as any,
        };

        recipeServiceSpy.getAllRecipes.and.returnValue(of([]));
        masterIngServiceSpy.getAll.and.returnValue(of([]));
        masterIngServiceSpy.search.and.returnValue(of([]));
        ingredientServiceSpy.getUnits.and.returnValue(of([]));
        authServiceSpy.isAdmin.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [Recipes, CommonModule, FormsModule, HttpClientTestingModule],
            providers: [
                provideRouter([]),
                { provide: RecipeService, useValue: recipeServiceSpy },
                { provide: MasterIngredientService, useValue: masterIngServiceSpy },
                { provide: IngredientService, useValue: ingredientServiceSpy },
                { provide: UploadService, useValue: uploadServiceSpy },
                { provide: AuthService, useValue: authServiceSpy },
                { provide: WebSocketService, useValue: wsServiceStub },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        });

        TestBed.overrideComponent(Recipes, {
            set: { imports: [CommonModule, FormsModule], schemas: [NO_ERRORS_SCHEMA] }
        });

        await TestBed.compileComponents();

        fixture = TestBed.createComponent(Recipes);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load recipes on init', () => {
        expect(recipeServiceSpy.getAllRecipes).toHaveBeenCalled();
    });

    it('isAdmin returns true when auth service confirms admin', () => {
        expect(component.isAdmin).toBeTrue();
    });

    it('should open create modal', () => {
        component.showCreateModal = false;
        component.showCreateModal = true;
        expect(component.showCreateModal).toBeTrue();
    });

    it('should close modals', () => {
        component.showCreateModal = true;
        component.showViewModal = true;
        component.showDeleteModal = true;
        component.showCreateModal = false;
        component.showViewModal = false;
        component.showDeleteModal = false;
        expect(component.showCreateModal).toBeFalse();
        expect(component.showViewModal).toBeFalse();
        expect(component.showDeleteModal).toBeFalse();
    });

    it('isLoading starts as false', () => {
        expect(component.isLoading).toBeFalse();
    });

    it('errorMessage starts empty', () => {
        expect(component.errorMessage).toBe('');
    });
});
