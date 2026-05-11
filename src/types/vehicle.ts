export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  type: "rental" | "sale" | "both";
  status: "available" | "rented" | "sold";
  daily_rate: number | null;
  sale_price: number | null;
  fuel_type: string;
  transmission: string;
  color: string;
  seats: number;
  mileage: number | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Rental {
  id: string;
  vehicle_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: "pending" | "active" | "completed" | "cancelled";
  created_at: string;
  vehicles?: Pick<Vehicle, "make" | "model" | "year" | "color" | "fuel_type" | "transmission">;
}

export interface Sale {
  id: string;
  vehicle_id: string;
  user_id: string;
  sale_price: number;
  created_at: string;
  vehicles?: Pick<Vehicle, "make" | "model" | "year" | "color" | "fuel_type" | "transmission" | "mileage">;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "admin" | "owner";
  created_at: string;
}