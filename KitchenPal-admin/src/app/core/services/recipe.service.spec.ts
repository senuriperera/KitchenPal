import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RecipeService, Recipe, CreateRecipeRequest } from './recipe.service';
import { environment } from '../../../environments/environment';

describe('RecipeService', () => {
    let service: RecipeService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/recipes`;

    const mockRecipe: Recipe = {
        recipe_id: 1,
        recipe_name: 'Pasta',
        base_price: 12.5,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        ingredients: [],
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [RecipeService],
        });
        service = TestBed.inject(RecipeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getAllRecipes returns recipes array', (done) => {
        service.getAllRecipes().subscribe(recipes => {
            expect(recipes).toEqual([mockRecipe]);
            done();
        });
        httpMock.expectOne(apiUrl).flush({ recipes: [mockRecipe] });
    });

    it('getAllRecipes returns empty array when response has no recipes', (done) => {
        service.getAllRecipes().subscribe(recipes => {
            expect(recipes).toEqual([]);
            done();
        });
        httpMock.expectOne(apiUrl).flush({});
    });

    it('getRecipeById makes GET to correct URL', (done) => {
        service.getRecipeById(1).subscribe(recipe => {
            expect(recipe).toEqual(mockRecipe);
            done();
        });
        httpMock.expectOne(`${apiUrl}/1`).flush({ recipe: mockRecipe });
    });

    it('createRecipe makes POST request', (done) => {
        const payload: CreateRecipeRequest = { name: 'Pasta', base_price: 12.5, ingredients: [] };
        service.createRecipe(payload).subscribe(recipe => {
            expect(recipe.recipe_name).toBe('Pasta');
            done();
        });
        const req = httpMock.expectOne(apiUrl);
        expect(req.request.method).toBe('POST');
        req.flush({ recipe: mockRecipe });
    });

    it('updateRecipe makes PUT request', (done) => {
        service.updateRecipe(1, { name: 'Updated' }).subscribe(recipe => {
            expect(recipe).toEqual(mockRecipe);
            done();
        });
        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('PUT');
        req.flush({ recipe: mockRecipe });
    });

    it('deleteRecipe makes DELETE request', () => {
        service.deleteRecipe(1).subscribe();
        const req = httpMock.expectOne(`${apiUrl}/1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
