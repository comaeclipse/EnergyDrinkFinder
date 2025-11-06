export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  created_at?: Date;
}

export interface EnergyDrink {
  id: number;
  brand: string;
  flavor: string;
  size_ml: number;
  caffeine_mg?: number;
}

export interface StoreInventory {
  store_id: number;
  drink_id: number;
  price: number;
  in_stock: boolean;
  last_updated?: Date;
}

export interface SearchParams {
  latitude: number;
  longitude: number;
  radius_km?: number;
  brand?: string;
  flavor?: string;
}

export interface SearchResult extends Store {
  distance_km: number;
  available_drinks: Array<EnergyDrink & { price: number; in_stock: boolean }>;
}
