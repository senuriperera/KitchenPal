import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../../shared/components/header/header';
import { IngredientService, IngredientResponse } from '../../core/services/ingredient.service';
import { environment } from '../../../environments/environment';

interface Ingredient {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  manufactureDate?: string;
  expiryDate: string;
  cost: number;
  lastScanned: string;
  status: 'OK' | 'Near expiry' | 'Expired';
  image: string;
  storageTypeId?: number;
  unitId?: number;
}

// Cloudinary config (same as mobile app)
const CLOUDINARY_CLOUD_NAME = 'dzf4mceyk';
const CLOUDINARY_UPLOAD_PRESET = 'kitchenpal';
const CLOUDINARY_FOLDER = 'kitchenpal/ingredients';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HttpClientModule],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.scss']
})
export class InventoryComponent implements OnInit {
  ingredients: Ingredient[] = [];
  filteredIngredients: Ingredient[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  // Hardcoded Branch ID for now
  private readonly BRANCH_ID = 1;

  // Storage types and units for dropdowns
  storageTypes: any[] = [];
  units: any[] = [];

  constructor(private ingredientService: IngredientService, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadIngredients();
    this.loadStorageTypes();
    this.loadUnits();
  }

  loadStorageTypes(): void {
    this.ingredientService.getStorageTypes().subscribe({
      next: (types) => {
        this.storageTypes = types;
      },
      error: (err) => console.error('Failed to load storage types:', err)
    });
  }

  loadUnits(): void {
    this.ingredientService.getUnits().subscribe({
      next: (units) => {
        this.units = units;
      },
      error: (err) => console.error('Failed to load units:', err)
    });
  }

  loadIngredients(): void {
    this.isLoading = true;
    this.error = null;

    this.ingredientService.getIngredientsByBranch(this.BRANCH_ID).subscribe({
      next: (response: any) => {
        const data = response.ingredients || response;

        if (Array.isArray(data)) {
          this.ingredients = data.map((item: IngredientResponse) => this.mapToIngredient(item));
          this.filteredIngredients = [...this.ingredients];
        } else {
          console.error('Unexpected API response format:', response);
          this.error = 'Invalid data received from server';
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading ingredients:', err);
        this.error = 'Failed to load ingredients. Please try again.';
        this.isLoading = false;
      }
    });
  }

  mapToIngredient(item: IngredientResponse): Ingredient {
    const expiryDate = new Date(item.expiry_date || new Date());
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'OK' | 'Near expiry' | 'Expired' = 'OK';
    if (daysUntilExpiry < 0) {
      status = 'Expired';
    } else if (daysUntilExpiry <= 7) {
      status = 'Near expiry';
    }



    return {
      id: item.ingredient_id,
      name: item.name,
      quantity: Number(item.quantity) || 0,
      unit: item.unit?.code || 'units',
      location: item.storageType?.name || 'Storage',
      manufactureDate: item.manufacture_date ? new Date(item.manufacture_date).toISOString().split('T')[0] : undefined,
      expiryDate: item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : 'N/A',
      cost: Number(item.price) || 0,
      lastScanned: item.added_at ? new Date(item.added_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: status,
      image: item.image_url || '',
      storageTypeId: item.storage_type_id,
      unitId: item.unit_id
    } as any;
  }

  private getPlaceholderIcon(_name: string): string {
    return '';
  }

  searchInventory(): void {
    if (!this.searchQuery.trim()) {
      this.filteredIngredients = [...this.ingredients];
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredIngredients = this.ingredients.filter(ingredient =>
      ingredient.name.toLowerCase().includes(query) ||
      ingredient.location.toLowerCase().includes(query)
    );
  }

  // ─── Modal State ────────────────────────────────────────────────────────────
  selectedIngredient: Ingredient | null = null;
  showViewModal: boolean = false;
  showEditModal: boolean = false;
  showDeleteModal: boolean = false;
  ingredientToDelete: Ingredient | null = null;
  editData: Partial<Ingredient> = {};
  editError: string | null = null;
  isSaving: boolean = false;
  isDeleting: boolean = false;

  // Upload / OCR flags
  isEditUploadingImage: boolean = false;
  isEditScanning: boolean = false;

  // ─── View ────────────────────────────────────────────────────────────────────
  viewDetails(ingredient: Ingredient): void {
    this.selectedIngredient = ingredient;
    this.showViewModal = true;
  }

  // ─── Edit ────────────────────────────────────────────────────────────────────
  editIngredient(ingredient: Ingredient): void {
    this.selectedIngredient = ingredient;
    this.editData = {
      ...ingredient,
      storageTypeId: ingredient.storageTypeId,
      unitId: ingredient.unitId
    };
    this.editError = null;
    this.showEditModal = true;
  }

  /** Upload a new image for the Edit modal → Cloudinary → store URL in editData.image */
  async onEditImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Show local preview immediately
    this.editData = { ...this.editData, image: URL.createObjectURL(file) };
    this.isEditUploadingImage = true;

    try {
      const url = await this.uploadToCloudinary(file);
      this.editData = { ...this.editData, image: url };
    } catch (e) {
      console.error('Edit image upload failed:', e);
      this.editError = 'Image upload failed. Changes saved without new image.';
    } finally {
      this.isEditUploadingImage = false;
    }
  }

  /** OCR scan using the already-uploaded edit image URL */
  async scanDatesForEdit(): Promise<void> {
    if (!this.editData.image || !this.editData.image.startsWith('https://')) return;
    this.isEditScanning = true;
    try {
      const result = await this.callOcrScan(this.editData.image);
      if (result.manufactureDate) this.editData = { ...this.editData, manufactureDate: result.manufactureDate };
      if (result.expiryDate) this.editData = { ...this.editData, expiryDate: result.expiryDate };
    } catch (e) {
      console.error('OCR scan failed:', e);
      this.editError = 'Could not extract dates from image. Please enter manually.';
    } finally {
      this.isEditScanning = false;
    }
  }

  saveEdit(): void {
    if (!this.selectedIngredient || !this.editData.id) return;
    this.editError = null;

    // Date validation
    if (this.editData.manufactureDate && this.editData.expiryDate &&
      this.editData.expiryDate < this.editData.manufactureDate) {
      this.editError = 'Expiry date cannot be before manufacture date.';
      return;
    }

    const updatePayload: any = {
      name: this.editData.name,
      quantity_in_stock: this.editData.quantity,
      cost_per_unit: this.editData.cost,
      expiry_date: this.editData.expiryDate,
      manufacture_date: this.editData.manufactureDate || null,
      storage_type_id: this.editData.storageTypeId,
      unit_id: this.editData.unitId,
      image_url: this.editData.image?.startsWith('https://') ? this.editData.image : null
    };

    this.isSaving = true;
    this.ingredientService.updateIngredient(this.editData.id, updatePayload).subscribe({
      next: () => {
        this.loadIngredients();
        this.closeModals();
      },
      error: (err) => {
        console.error('Failed to update:', err);
        this.editError = 'Failed to save changes. Please try again.';
        this.isSaving = false;
      }
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  openDeleteModal(ingredient: Ingredient): void {
    this.ingredientToDelete = ingredient;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.ingredientToDelete) return;
    this.isDeleting = true;
    this.ingredientService.deleteIngredient(this.ingredientToDelete.id).subscribe({
      next: () => {
        this.ingredients = this.ingredients.filter(item => item.id !== this.ingredientToDelete!.id);
        this.searchInventory();
        this.isDeleting = false;
        this.closeModals();
      },
      error: (err) => {
        console.error('Failed to delete:', err);
        this.isDeleting = false;
        this.closeModals();
      }
    });
  }

  // ─── Shared helpers ────────────────────────────────────────────────────────
  closeModals(): void {
    this.showViewModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedIngredient = null;
    this.ingredientToDelete = null;
    this.editData = {};
    this.editError = null;
    this.isSaving = false;
    this.isDeleting = false;
    this.isEditUploadingImage = false;
    this.isEditScanning = false;
  }

  deleteIngredient(_ingredient: Ingredient): void {
    // Kept for compatibility; use openDeleteModal for UI
  }

  filterData(): void { }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OK': return 'status-ok';
      case 'Near expiry': return 'status-warning';
      case 'Expired': return 'status-danger';
      default: return '';
    }
  }

  // ─── Cloudinary & OCR helpers ───────────────────────────────────────────────

  /** Upload a File directly to Cloudinary (unsigned) and return the secure_url */
  private uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', CLOUDINARY_FOLDER);

    return fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    )
      .then(res => {
        if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!data.secure_url) throw new Error('No secure_url in Cloudinary response');
        return data.secure_url as string;
      });
  }

  /** Call the backend OCR scan endpoint with a Cloudinary URL */
  private callOcrScan(imageUrl: string): Promise<{ expiryDate: string | null; manufactureDate: string | null }> {
    return fetch(`${environment.apiUrl}/ingredients/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify({ imageUrl })
    })
      .then(res => {
        if (!res.ok) throw new Error(`OCR scan failed: ${res.status}`);
        return res.json();
      })
      .then(data => ({
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate).toISOString().split('T')[0]
          : null,
        manufactureDate: data.manufactureDate
          ? new Date(data.manufactureDate).toISOString().split('T')[0]
          : null
      }));
  }
}
