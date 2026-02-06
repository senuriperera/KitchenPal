import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from '../../shared/components/header/header';
import { IngredientService, IngredientResponse } from '../../core/services/ingredient.service';

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
}

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HttpClientModule],
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  ingredients: Ingredient[] = [];
  filteredIngredients: Ingredient[] = [];
  searchQuery: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  // Hardcoded Branch ID for now
  private readonly BRANCH_ID = 1;

  constructor(private ingredientService: IngredientService) { }

  ngOnInit(): void {
    this.loadIngredients();
  }

  loadIngredients(): void {
    this.isLoading = true;
    this.error = null;

    this.ingredientService.getIngredientsByBranch(this.BRANCH_ID).subscribe({
      next: (response: any) => { // Using any because backend wraps in { ingredients: [] }
        const data = response.ingredients || response; // Handle both wrapped and unwrapped cases

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

        // Fallback or empty state is handled by the template
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

    // Determine Emoji based on name (Simple logic for demo)
    const emoji = this.getEmojiForIngredient(item.name);

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
      image: item.image_url || emoji
    };
  }

  private getEmojiForIngredient(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('apple')) return '🍎';
    if (n.includes('milk')) return '🥛';
    if (n.includes('chicken')) return '🍗';
    if (n.includes('tomato')) return '🍅';
    if (n.includes('bread')) return '🍞';
    if (n.includes('egg')) return '🥚';
    if (n.includes('cheese')) return '🧀';
    if (n.includes('carrot')) return '🥕';
    return '📦';
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

  // Modal State
  selectedIngredient: Ingredient | null = null;
  showViewModal: boolean = false;
  showEditModal: boolean = false;
  editData: Partial<Ingredient> = {};

  viewDetails(ingredient: Ingredient): void {
    this.selectedIngredient = ingredient;
    this.showViewModal = true;
  }

  editIngredient(ingredient: Ingredient): void {
    this.selectedIngredient = ingredient;
    // Create a copy for editing
    this.editData = { ...ingredient };
    this.showEditModal = true;
  }

  closeModals(): void {
    this.showViewModal = false;
    this.showEditModal = false;
    this.selectedIngredient = null;
    this.editData = {};
  }

  saveEdit(): void {
    if (!this.selectedIngredient || !this.editData.id) return;

    // Convert UI model back to partial backend model if needed, 
    // or just pass what we changed if the service handles it.
    // The service expects Partial<IngredientResponse>.
    // We need to map our UI 'Ingredient' back to 'IngredientResponse' format roughly,
    // or at least the fields that changed.

    const updatePayload: Partial<IngredientResponse> = {
      name: this.editData.name,
      quantity: this.editData.quantity,
      price: this.editData.cost, // mapped from cost
      // storageType ... needs ID, skipping for simple demo or handling if needed
    };

    this.ingredientService.updateIngredient(this.editData.id, updatePayload).subscribe({
      next: (updated) => {
        // Update local list
        const index = this.ingredients.findIndex(i => i.id === this.editData.id);
        if (index !== -1) {
          // We can either re-fetch or update locally. 
          // Simplest is generic update locally:
          this.ingredients[index] = { ...this.ingredients[index], ...this.editData } as Ingredient;
          this.filterData(); // re-apply filter if any
        }
        this.closeModals();
      },
      error: (err) => console.error('Failed to update:', err)
    });
  }

  deleteIngredient(ingredient: Ingredient): void {
    if (confirm(`Are you sure you want to delete ${ingredient.name}?`)) {
      this.ingredientService.deleteIngredient(ingredient.id).subscribe({
        next: () => {
          this.ingredients = this.ingredients.filter(item => item.id !== ingredient.id);
          this.searchInventory();
        },
        error: (err) => console.error('Failed to delete:', err)
      });
    }
  }

  filterData(): void {
    console.log('Open filter dialog');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OK':
        return 'status-ok';
      case 'Near expiry':
        return 'status-warning';
      case 'Expired':
        return 'status-danger';
      default:
        return '';
    }
  }
}
