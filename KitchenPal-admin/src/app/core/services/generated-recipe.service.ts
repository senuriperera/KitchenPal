import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PendingGeneratedRecipe {
  generated_id: number;
  suggested_discount_percent: number;
  suggested_discount_price: number;
  created_at: string;
  name: string;
  image_url?: string;
  base_price: number;
  cooking_time_minutes?: number;
  generated_by_name: string;
  branch_name: string;
  recipe_id: number;
  recipe_type: 'Auto-suggested' | 'Predefined';
}

export interface ApprovedGeneratedRecipe {
  generated_id: number;
  final_discount_percent: number;
  final_discount_price: number;
  reviewed_at: string;
  name: string;
  image_url?: string;
  base_price: number;
  cooking_time_minutes?: number;
  generated_by_name: string;
  branch_name: string;
  recipe_id: number;
  recipe_type: 'Auto-suggested' | 'Predefined';
}

export interface RejectedGeneratedRecipe {
  generated_id: number;
  name: string;
  image_url?: string;
  base_price: number;
  cooking_time_minutes?: number;
  generated_by_name: string;
  branch_name: string;
  recipe_id: number;
  recipe_type: 'Auto-suggested' | 'Predefined';
  admin_note: string;
  reviewed_at: string;
}

export interface RecipeIngredient {
  recipe_ingredient_id: number;
  quantity: number;
  unit: string;
  ingredient_id: number;
  name: string;
}

interface PendingResponse {
  items?: PendingGeneratedRecipe[];
}

interface ApprovedResponse {
  items?: ApprovedGeneratedRecipe[];
}

interface RejectedResponse {
  items?: RejectedGeneratedRecipe[];
}

interface IngredientsResponse {
  ingredients?: RecipeIngredient[];
}

interface ApproveRejectBody {
  final_discount_percent?: number;
  final_discount_price?: number;
  admin_note?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeneratedRecipeService {
  private readonly baseUrl = `${environment.apiUrl}/generated-recipes`;

  constructor(private http: HttpClient) {}

  getPending(): Observable<PendingGeneratedRecipe[]> {
    return this.http
      .get<PendingResponse>(`${this.baseUrl}/pending`)
      .pipe(map((res) => res.items || []));
  }

  getRecentlyApproved(): Observable<ApprovedGeneratedRecipe[]> {
    return this.http
      .get<ApprovedResponse>(`${this.baseUrl}/recently-approved`)
      .pipe(map((res) => res.items || []));
  }

  getRecentlyRejected(): Observable<RejectedGeneratedRecipe[]> {
    return this.http
      .get<RejectedResponse>(`${this.baseUrl}/recently-rejected`)
      .pipe(map((res) => res.items || []));
  }

  getIngredients(generatedId: number): Observable<RecipeIngredient[]> {
    return this.http
      .get<IngredientsResponse>(`${this.baseUrl}/${generatedId}/ingredients`)
      .pipe(map((res) => res.ingredients || []));
  }

  approve(
    generatedId: number,
    finalPercent: number,
    finalPrice: number,
  ): Observable<void> {
    const body: ApproveRejectBody = {
      final_discount_percent: finalPercent,
      final_discount_price: finalPrice,
    };
    return this.http.put<void>(`${this.baseUrl}/${generatedId}/approve`, body);
  }

  reject(generatedId: number, adminNote: string): Observable<void> {
    const body: ApproveRejectBody = { admin_note: adminNote };
    return this.http.put<void>(`${this.baseUrl}/${generatedId}/reject`, body);
  }
}
