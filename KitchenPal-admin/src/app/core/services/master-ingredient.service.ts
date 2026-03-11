import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MasterIngredient {
  master_ingredient_id: number;
  name: string;
  unit_family: string | null;
  base_unit_id: number | null;
  default_unit_id: number | null;
  is_custom: boolean;
  created_at: string;
  defaultUnit: {
    code: string;
    name: string;
  } | null;
}

export interface MasterIngredientSearchResponse {
  ingredients: MasterIngredient[];
}

export interface MasterIngredientResponse {
  ingredient: MasterIngredient;
  message?: string;
  created?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MasterIngredientService {
  private apiUrl = `${environment.apiUrl}/master-ingredients`;

  constructor(private http: HttpClient) { }

  /**
   * Search master ingredients by name
   */
  search(query: string, limit: number = 20): Observable<MasterIngredient[]> {
    return this.http.get<MasterIngredientSearchResponse>(
      `${this.apiUrl}/search`,
      { params: { q: query, limit: limit.toString() } }
    ).pipe(
      map(response => response.ingredients)
    );
  }

  /**
   * Get all master ingredients
   */
  getAll(): Observable<MasterIngredient[]> {
    return this.http.get<MasterIngredientSearchResponse>(this.apiUrl).pipe(
      map(response => response.ingredients)
    );
  }

  /**
   * Get master ingredient by ID
   */
  getById(id: number): Observable<MasterIngredient> {
    return this.http.get<MasterIngredientResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.ingredient)
    );
  }

  /**
   * Create a new master ingredient
   */
  create(data: { name: string; default_unit_id?: number; is_custom?: boolean }): Observable<MasterIngredient> {
    return this.http.post<MasterIngredientResponse>(this.apiUrl, data).pipe(
      map(response => response.ingredient)
    );
  }

  /**
   * Find or create a master ingredient
   * Returns the ingredient (existing or newly created)
   */
  findOrCreate(name: string, unitId?: number): Observable<{ ingredient: MasterIngredient; created: boolean }> {
    return this.http.post<MasterIngredientResponse>(
      `${this.apiUrl}/find-or-create`,
      { name, unit_id: unitId }   // Change 2: send unit_id so backend derives unit_family + base_unit_id
    ).pipe(
      map(response => ({
        ingredient: response.ingredient,
        created: response.created ?? false
      }))
    );
  }

  /**
   * Update a master ingredient
   */
  update(id: number, data: { name?: string; default_unit_id?: number }): Observable<MasterIngredient> {
    return this.http.put<MasterIngredientResponse>(`${this.apiUrl}/${id}`, data).pipe(
      map(response => response.ingredient)
    );
  }

  /**
   * Delete a master ingredient
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
