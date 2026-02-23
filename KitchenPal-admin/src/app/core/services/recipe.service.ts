import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RecipeIngredient {
  master_ingredient_id: number;
  name: string;
  quantity_required: number;
  unit_code: string;
  unit_name: string;
  unit_id: number;
}

export interface Recipe {
  recipe_id: number;
  recipe_name: string;
  image_url?: string;
  cooking_time_minutes?: number;
  description?: string;
  base_price: number;
  created_at: string;
  updated_at: string;
  ingredients: RecipeIngredient[];
}

export interface CreateRecipeRequest {
  name: string;
  image_url?: string;
  cooking_time_minutes?: number;
  description?: string;
  base_price: number;
  ingredients: {
    master_ingredient_id: number;
    quantity_required: number;
    unit_id: number;
  }[];
}

export interface RecipeResponse {
  recipes?: Recipe[];
  recipe?: Recipe;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private apiUrl = `${environment.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

  /**
   * Get all standard recipes (is_generated = false)
   */
  getAllRecipes(): Observable<Recipe[]> {
    return this.http.get<RecipeResponse>(this.apiUrl).pipe(
      map(response => response.recipes || [])
    );
  }

  /**
   * Get a single recipe by ID
   */
  getRecipeById(id: number): Observable<Recipe> {
    return this.http.get<RecipeResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.recipe!)
    );
  }

  /**
   * Create a new recipe with ingredients
   */
  createRecipe(recipeData: CreateRecipeRequest): Observable<Recipe> {
    return this.http.post<RecipeResponse>(this.apiUrl, recipeData).pipe(
      map(response => response.recipe!)
    );
  }

  /**
   * Update a recipe
   */
  updateRecipe(id: number, recipeData: Partial<CreateRecipeRequest>): Observable<Recipe> {
    return this.http.put<RecipeResponse>(`${this.apiUrl}/${id}`, recipeData).pipe(
      map(response => response.recipe!)
    );
  }

  /**
   * Delete a recipe
   */
  deleteRecipe(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
