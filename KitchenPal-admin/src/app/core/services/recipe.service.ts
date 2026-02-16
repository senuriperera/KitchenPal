import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RecipeIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity_required: number;
  unit_id: number;
  unit_code?: string;
  unit_name?: string;
}

export interface RecipeStep {
  step_id: number;
  step_number: number;
  instruction: string;
}

export interface RecipeResponse {
  recipe_id: number;
  branch_id: number;
  name: string;
  image_url?: string;
  cooking_time_minutes: number;
  description?: string;
  base_price: number;
  is_generated: boolean;
  created_by: number;
  created_at?: string;
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  total_cost?: number;
  suggested_price?: number;
  discount_percentage?: number;
}

export interface CreateRecipeRequest {
  branch_id: number;
  name: string;
  image_url?: string;
  cooking_time_minutes: number;
  description?: string;
  base_price: number;
  ingredients?: Array<{
    ingredient_id?: number;        // For existing ingredients
    ingredient_name?: string;      // For new ingredients to be created
    quantity_required: number;
    unit_id: number;
  }>;
  steps?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private apiUrl = `${environment.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

  getRecipesByBranch(branchId: number): Observable<RecipeResponse[]> {
    return this.http.get<any>(`${this.apiUrl}/branch/${branchId}`).pipe(
      map(response => response.recipes || response)
    );
  }

  getRecipeById(id: number): Observable<RecipeResponse> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.recipe || response)
    );
  }

  createRecipe(recipe: CreateRecipeRequest): Observable<RecipeResponse> {
    return this.http.post<any>(this.apiUrl, recipe).pipe(
      map(response => response.recipe || response)
    );
  }

  updateRecipe(id: number, recipe: Partial<CreateRecipeRequest>): Observable<RecipeResponse> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, recipe).pipe(
      map(response => response.recipe || response)
    );
  }

  deleteRecipe(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
