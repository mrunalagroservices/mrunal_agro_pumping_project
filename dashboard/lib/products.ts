export interface Product {
  id: number; name: string; description: string; category: string;
  price: number; originalPrice: number; rating: number; reviewCount: number;
  unit: string; isBestSeller?: boolean; image: string; emoji: string;
  bg: string; stock: number;
}

export type CartItem = { product: Product; qty: number };

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=400&h=300&q=80`;

export const CATEGORIES = ["Seeds", "Fertilizers", "Irrigation", "Tools", "Pesticides", "Others"];

export const PRODUCTS: Product[] = [
  { id: 1,  name: "Hybrid Tomato Seeds",       description: "High-yield hybrid tomato seeds. Disease resistant, suitable for all seasons.",          category: "Seeds",       price: 149,  originalPrice: 299,  rating: 4.4, reviewCount: 2341, unit: "10g packet",     isBestSeller: true,  image: img("1518977676884-f3d0423fd102"), emoji: "🍅", bg: "#DCFCE7", stock: 24 },
  { id: 2,  name: "Onion Seeds (Nasik Red)",    description: "Premium Nasik red onion seeds. High germination rate, 90-day variety.",                 category: "Seeds",       price: 249,  originalPrice: 399,  rating: 4.2, reviewCount: 1892, unit: "500g",            image: img("1587049352846-b37954f4a2c3"), emoji: "🧅", bg: "#F3E8FF", stock: 18 },
  { id: 3,  name: "Wheat Seeds (HD-2967)",      description: "Certified HD-2967 wheat seeds, high protein content, rust resistant.",                  category: "Seeds",       price: 599,  originalPrice: 799,  rating: 4.6, reviewCount: 4120, unit: "5 kg bag",        isBestSeller: true,  image: img("1574323347407-f5e1ad6d020b"), emoji: "🌾", bg: "#FEF3C7", stock: 45 },
  { id: 4,  name: "NPK Fertilizer 19-19-19",    description: "Balanced NPK water-soluble fertilizer for all crops.",                                   category: "Fertilizers", price: 650,  originalPrice: 950,  rating: 4.5, reviewCount: 3210, unit: "5 kg bag",        isBestSeller: true,  image: img("1416879595882-3373a0480b5b"), emoji: "🧪", bg: "#E0F2FE", stock: 62 },
  { id: 5,  name: "Organic Vermicompost",       description: "100% organic vermicompost. Improves soil structure and water retention.",                category: "Fertilizers", price: 450,  originalPrice: 650,  rating: 4.3, reviewCount: 1567, unit: "10 kg bag",       image: img("1592419044706-39796d40f98c"), emoji: "🌱", bg: "#ECFCCB", stock: 30 },
  { id: 6,  name: "DAP Fertilizer",            description: "Di-ammonium phosphate for strong root development. Ideal for sowing time.",             category: "Fertilizers", price: 1350, originalPrice: 1800, rating: 4.7, reviewCount: 5432, unit: "50 kg bag",       isBestSeller: true,  image: img("1464638681273-0962e9b53566"), emoji: "⚗️", bg: "#FEE2E2", stock: 15 },
  { id: 7,  name: "Drip Irrigation Kit",       description: "Complete drip irrigation kit for 1 acre. Includes main pipe, drippers, connectors.",   category: "Irrigation",  price: 2499, originalPrice: 3999, rating: 4.4, reviewCount: 890,  unit: "1 acre kit",     isBestSeller: true,  image: img("1563514227-cd1a5bc85878"), emoji: "💧", bg: "#E0F2FE", stock: 8  },
  { id: 8,  name: "Sprinkler Set (8 heads)",   description: "Rotating sprinkler set with 8 heads and 25m pipe.",                                     category: "Irrigation",  price: 899,  originalPrice: 1299, rating: 4.1, reviewCount: 654,  unit: "Set of 8",       image: img("1520412099551-62b6bafeb5bb"), emoji: "🚿", bg: "#CFFAFE", stock: 22 },
  { id: 9,  name: "Garden Pressure Sprayer",   description: "16-litre manual pressure sprayer with adjustable nozzle.",                              category: "Tools",       price: 1299, originalPrice: 1999, rating: 4.3, reviewCount: 2100, unit: "16 litre",       isBestSeller: true,  image: img("1584467735871-8e59c4e67252"), emoji: "🪣", bg: "#E0F2FE", stock: 35 },
  { id: 10, name: "Steel Garden Hoe",          description: "Heavy duty steel garden hoe with wooden handle.",                                       category: "Tools",       price: 349,  originalPrice: 549,  rating: 4.0, reviewCount: 987,  unit: "Single piece",   image: img("1416879595882-3373a0480b5b"), emoji: "⛏️", bg: "#F5F5F4", stock: 42 },
  { id: 11, name: "Sickle (Stainless Steel)",  description: "Stainless steel sickle with ergonomic grip. Rust-proof.",                              category: "Tools",       price: 249,  originalPrice: 399,  rating: 4.2, reviewCount: 1234, unit: "Single piece",   image: img("1535379453347-1ffd615e2e08"), emoji: "🔧", bg: "#F3F4F6", stock: 28 },
  { id: 12, name: "Imidacloprid Insecticide",  description: "Systemic insecticide effective against sucking pests.",                                 category: "Pesticides",  price: 399,  originalPrice: 599,  rating: 4.5, reviewCount: 3456, unit: "250 ml",         isBestSeller: true,  image: img("1584467735871-8e59c4e67252"), emoji: "🧫", bg: "#FFF7ED", stock: 56 },
  { id: 13, name: "Mancozeb Fungicide",        description: "Broad spectrum fungicide for fruit, vegetable and field crops.",                        category: "Pesticides",  price: 299,  originalPrice: 450,  rating: 4.3, reviewCount: 2109, unit: "500g",            image: img("1566073771259-6a8506099945"), emoji: "💊", bg: "#F5F3FF", stock: 40 },
  { id: 14, name: "HDPE Mulch Film",           description: "25-micron HDPE black mulch film. Controls weeds and conserves soil moisture.",         category: "Others",      price: 1800, originalPrice: 2500, rating: 4.2, reviewCount: 432,  unit: "400m × 1.2m roll", image: img("1500937386664-43d2b57a8a2b"), emoji: "📦", bg: "#F3F4F6", stock: 12 },
  { id: 15, name: "pH Soil Testing Kit",       description: "Quick soil pH test kit with 100 test strips.",                                          category: "Others",      price: 299,  originalPrice: 499,  rating: 4.6, reviewCount: 1876, unit: "100 strips",      isBestSeller: true,  image: img("1580974852861-c381510bc98a"), emoji: "🔬", bg: "#CFFAFE", stock: 67 },
];

export const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; min: number; desc: string }> = {
  FARM10:  { type: "percent", value: 10, min: 0,    desc: "10% off on your order" },
  SAVE50:  { type: "fixed",   value: 50, min: 500,  desc: "₹50 off on orders above ₹500" },
  MRUNAL:  { type: "percent", value: 15, min: 0,    desc: "15% off — Special offer" },
  AGRO20:  { type: "percent", value: 20, min: 1000, desc: "20% off on orders above ₹1000" },
};

export function cartFromStorage(): CartItem[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mrunal_cart") : null;
    if (!raw) return [];
    const parsed: { productId: number; qty: number }[] = JSON.parse(raw);
    return parsed.flatMap(({ productId, qty }) => {
      const p = PRODUCTS.find((x) => x.id === productId);
      return p ? [{ product: p, qty }] : [];
    });
  } catch { return []; }
}

export function cartToStorage(cart: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("mrunal_cart", JSON.stringify(cart.map((i) => ({ productId: i.product.id, qty: i.qty }))));
}
