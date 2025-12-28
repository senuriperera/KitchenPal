import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IngredientResponse {
  ingredient_id: number;
  branch_id?: number;
  name: string;
  image_url?: string;
  quantity: number;
  unit_id?: number;
  price: number;
  expiry_date?: string;
  manufacture_date?: string;
  storage_type_id?: number;
  added_at?: string;
  is_active?: boolean;
  branch?: {
    branch_name: string;
  };
  unit?: {
    code: string;
    name: string;
  };
  storageType?: {
    code: string;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class IngredientService {
  private apiUrl = `${environment.apiUrl}/ingredients`;

  constructor(private http: HttpClient) {}

  getAllIngredients(): Observable<IngredientResponse[]> {
    return this.http.get<IngredientResponse[]>(this.apiUrl);
  }

  getIngredientsByBranch(branchId: number): Observable<IngredientResponse[]> {
    return this.http.get<IngredientResponse[]>(`${this.apiUrl}/branch/${branchId}`);
  }

  createIngredient(ingredient: Partial<IngredientResponse>): Observable<IngredientResponse> {
    return this.http.post<IngredientResponse>(this.apiUrl, ingredient);
  }

  updateIngredient(id: number, ingredient: Partial<IngredientResponse>): Observable<IngredientResponse> {
    return this.http.put<IngredientResponse>(`${this.apiUrl}/${id}`, ingredient);
  }

  deleteIngredient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
