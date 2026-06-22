// One-off seed: brings every product category up to 10-12 listings with
// real third-party brand names (Netafim, Bayer, UPL, etc.), matching the
// existing catalog's naming convention. image_url is left NULL — upload
// real product photos via the admin dashboard afterwards.
// Run with: DATABASE_URL=... node scripts/seed-products-catalog-expansion.js
require('dotenv').config();
const db = require('../src/config/database');

const products = [
  // ── Seeds ──────────────────────────────────────────────────────────────
  { name: 'Mahyco Bt Cotton Seeds', category: 'Seeds', price: 899, original_price: 1199, unit: '450g packet', description: 'High-yield Bt cotton hybrid seeds with built-in bollworm resistance.' },
  { name: 'Nuziveedu Hybrid Maize Seeds', category: 'Seeds', price: 399, original_price: 549, unit: '4 kg bag', description: 'Fast-maturing hybrid maize seeds suited for kharif sowing.' },
  { name: 'Namdhari Seeds Capsicum F1', category: 'Seeds', price: 249, original_price: 349, unit: '10g packet', description: 'F1 hybrid capsicum seeds with uniform fruit size and strong disease tolerance.' },
  { name: 'Syngenta NK Sunflower Hybrid Seeds', category: 'Seeds', price: 549, original_price: 749, unit: '1 kg pack', description: 'High oil-content sunflower hybrid suited for most soil types.' },
  { name: 'Rasi Seeds Hybrid Bajra', category: 'Seeds', price: 299, original_price: 399, unit: '2 kg bag', description: 'Drought-tolerant hybrid pearl millet seeds for rainfed cultivation.' },
  { name: 'VNR Seeds Hybrid Brinjal', category: 'Seeds', price: 199, original_price: 279, unit: '10g packet', description: 'High-yielding hybrid brinjal seeds with glossy purple fruit.' },
  { name: 'Bayer Vegetable Seeds Hybrid Cucumber', category: 'Seeds', price: 179, original_price: 249, unit: '10g packet', description: 'Disease-resistant hybrid cucumber seeds for open-field and polyhouse growing.' },
  { name: 'Mahindra Krish Soybean Seeds (JS-335)', category: 'Seeds', price: 899, original_price: 1099, unit: '30 kg bag', description: 'Certified JS-335 soybean seeds with good pod-setting and oil content.' },
  { name: 'Kaveri Seeds Hybrid Paddy (Jaya)', category: 'Seeds', price: 449, original_price: 599, unit: '5 kg bag', description: 'High-yield Jaya variety paddy seeds suited for irrigated conditions.' },

  // ── Fertilizers ────────────────────────────────────────────────────────
  { name: 'IFFCO Urea Fertilizer', category: 'Fertilizers', price: 299, original_price: 399, unit: '45 kg bag', description: 'Granular urea (46% N) for quick nitrogen top-dressing.' },
  { name: 'Coromandel Gromor NPK 20-20-0-13', category: 'Fertilizers', price: 720, original_price: 999, unit: '50 kg bag', description: 'Balanced NPK complex fertilizer with added sulphur for healthy crop growth.' },
  { name: 'Tata Rallis Tata Bahaar Bio-Fertilizer', category: 'Fertilizers', price: 349, original_price: 499, unit: '5 kg bag', description: 'Microbial bio-fertilizer that improves nutrient uptake and root development.' },
  { name: 'Zuari Single Super Phosphate (SSP)', category: 'Fertilizers', price: 399, original_price: 549, unit: '50 kg bag', description: 'Phosphate fertilizer with sulphur, ideal for oilseed and pulse crops.' },
  { name: 'Godrej Agrovet Potash (MOP)', category: 'Fertilizers', price: 850, original_price: 1100, unit: '50 kg bag', description: 'Muriate of potash for improved fruit quality and stress tolerance.' },
  { name: 'IFFCO Nano Urea Liquid', category: 'Fertilizers', price: 240, original_price: 320, unit: '500 ml bottle', description: 'Foliar-spray nano nitrogen fertilizer with better uptake efficiency.' },
  { name: 'KRIBHCO DAP Fertilizer', category: 'Fertilizers', price: 1350, original_price: 1750, unit: '50 kg bag', description: 'Di-ammonium phosphate for strong root and early plant growth.' },
  { name: 'Deepak Fertilisers Sulphur 90% WDG', category: 'Fertilizers', price: 599, original_price: 799, unit: '10 kg bag', description: 'Water-dispersible sulphur granules for oilseed and fruit crops.' },
  { name: 'Sandhya Organics Neem Cake Fertilizer', category: 'Fertilizers', price: 399, original_price: 549, unit: '25 kg bag', description: 'Organic neem cake manure that also helps deter soil-borne pests.' },

  // ── Irrigation ─────────────────────────────────────────────────────────
  { name: 'Netafim Drip Irrigation Kit (1 Acre)', category: 'Irrigation', price: 3499, original_price: 4999, unit: '1 acre kit', description: 'Complete drip irrigation kit with emitters, mainline, and fittings for 1 acre.' },
  { name: 'Jain Irrigation Inline Drip Pipe (16mm)', category: 'Irrigation', price: 1599, original_price: 2199, unit: '100m roll', description: 'Inline drip lateral pipe with pre-fitted emitters at 30cm spacing.' },
  { name: 'Finolex PVC Pipe (2 inch, 10 ft)', category: 'Irrigation', price: 399, original_price: 549, unit: '10 ft length', description: 'Heavy-duty PVC pipe for farm water-supply lines.' },
  { name: 'Kirloskar Submersible Pump Motor (1 HP)', category: 'Irrigation', price: 6499, original_price: 8499, unit: 'Single piece', description: 'Energy-efficient 1 HP submersible motor for borewell irrigation.' },
  { name: 'Crompton Greaves Mini Sprinkler Set', category: 'Irrigation', price: 749, original_price: 999, unit: 'Set of 6', description: 'Adjustable mini sprinklers for vegetable and nursery beds.' },
  { name: 'Texmo Industries Centrifugal Pump (0.5 HP)', category: 'Irrigation', price: 3299, original_price: 4299, unit: 'Single piece', description: 'Self-priming centrifugal pump for surface water irrigation.' },
  { name: 'Polyplast Irrigation Hose Pipe (50m)', category: 'Irrigation', price: 899, original_price: 1199, unit: '50m roll', description: 'Flexible reinforced hose pipe for farm-wide water distribution.' },
  { name: 'Rain Bird Pop-up Sprinkler Head', category: 'Irrigation', price: 249, original_price: 349, unit: 'Set of 4', description: 'Pop-up sprinkler heads for even lawn and field coverage.' },
  { name: 'Hunter Industries Solenoid Valve', category: 'Irrigation', price: 1199, original_price: 1599, unit: 'Single piece', description: 'Electric solenoid valve for automated zone-wise irrigation control.' },
  { name: 'EPC Industries Hose Pipe Connector Kit', category: 'Irrigation', price: 349, original_price: 499, unit: 'Set of 10', description: 'Quick-fit connectors, elbows, and tees for hose pipe lines.' },

  // ── Tools ──────────────────────────────────────────────────────────────
  { name: 'Falcon Garden Spade', category: 'Tools', price: 399, original_price: 549, unit: 'Single piece', description: 'Forged steel spade with a comfortable wooden handle.' },
  { name: 'Kisan Kraft Brush Cutter', category: 'Tools', price: 4999, original_price: 6499, unit: 'Single piece', description: 'Petrol-powered brush cutter for clearing field borders and weeds.' },
  { name: 'Bosch Cordless Hedge Trimmer', category: 'Tools', price: 3499, original_price: 4499, unit: 'Single piece', description: 'Battery-powered hedge trimmer for orchard and boundary upkeep.' },
  { name: 'Stanley Pruning Shears', category: 'Tools', price: 449, original_price: 599, unit: 'Single piece', description: 'Sharp bypass pruning shears for clean cuts on branches and stems.' },
  { name: 'Khaitan Hand Cultivator (5 Prong)', category: 'Tools', price: 199, original_price: 299, unit: 'Single piece', description: 'Hand cultivator for loosening soil and weeding between rows.' },
  { name: 'Captain Tools Garden Fork', category: 'Tools', price: 349, original_price: 449, unit: 'Single piece', description: 'Durable steel garden fork for turning and aerating soil.' },
  { name: 'Honda Power Weeder', category: 'Tools', price: 24999, original_price: 29999, unit: 'Single piece', description: 'Petrol-powered weeder for fast inter-row weeding on larger plots.' },
  { name: 'Mahindra Garden Wheelbarrow', category: 'Tools', price: 2199, original_price: 2799, unit: 'Single piece', description: 'Heavy-duty wheelbarrow for moving produce, soil, and farm supplies.' },
  { name: 'Falcon Pruning Saw', category: 'Tools', price: 299, original_price: 399, unit: 'Single piece', description: 'Folding pruning saw with a curved blade for thick branches.' },

  // ── Pesticides ─────────────────────────────────────────────────────────
  { name: 'UPL Saaf Fungicide', category: 'Pesticides', price: 349, original_price: 449, unit: '500g', description: 'Combination fungicide for control of fungal leaf and fruit diseases.' },
  { name: 'Bayer Confidor Insecticide', category: 'Pesticides', price: 449, original_price: 599, unit: '100 ml', description: 'Systemic insecticide effective against sucking pests like aphids and jassids.' },
  { name: 'Syngenta Actara Insecticide', category: 'Pesticides', price: 299, original_price: 399, unit: '100g', description: 'Fast-acting insecticide for whitefly, aphid, and thrips control.' },
  { name: 'Dhanuka EM-1 Insecticide', category: 'Pesticides', price: 349, original_price: 449, unit: '250 ml', description: 'Broad-spectrum insecticide for caterpillar and borer pests.' },
  { name: 'Rallis Takumi Insecticide', category: 'Pesticides', price: 399, original_price: 549, unit: '100g', description: 'Effective against stem borer and leaf folder in paddy and other crops.' },
  { name: 'PI Industries Nominee Gold Herbicide', category: 'Pesticides', price: 899, original_price: 1199, unit: '80 ml', description: 'Selective herbicide for weed control in transplanted paddy.' },
  { name: 'Coromandel Hexaconazole Fungicide', category: 'Pesticides', price: 249, original_price: 349, unit: '250 ml', description: 'Systemic fungicide for control of powdery mildew and rust diseases.' },
  { name: 'Bayer Roundup Herbicide', category: 'Pesticides', price: 399, original_price: 549, unit: '1 litre', description: 'Non-selective glyphosate herbicide for clearing weeds before sowing.' },
  { name: 'Indofil M-45 Fungicide', category: 'Pesticides', price: 289, original_price: 399, unit: '500g', description: 'Mancozeb-based fungicide for early and late blight protection.' },
  { name: 'Sumitomo Tata Mida Insecticide', category: 'Pesticides', price: 329, original_price: 449, unit: '100 ml', description: 'Imidacloprid-based insecticide for sucking pest management.' },

  // ── Others ─────────────────────────────────────────────────────────────
  { name: 'Garware Technical Fibres Shade Net (50%)', category: 'Others', price: 2499, original_price: 3299, unit: '50m x 4m roll', description: 'UV-stabilised 50% shade net for nurseries and polyhouses.' },
  { name: 'Trustbasket Grow Bags (Set of 10)', category: 'Others', price: 599, original_price: 799, unit: 'Set of 10', description: 'Durable fabric grow bags for terrace and kitchen-garden planting.' },
  { name: 'Jain Irrigation Mulching Film (25 micron)', category: 'Others', price: 1599, original_price: 2199, unit: '400m roll', description: 'Black plastic mulch film for weed suppression and moisture retention.' },
  { name: 'Kisan Kraft Solar Insect Trap', category: 'Others', price: 1999, original_price: 2599, unit: 'Single piece', description: 'Solar-powered light trap for eco-friendly pest monitoring and control.' },
  { name: 'Khaitan Battery-Operated Knapsack Sprayer', category: 'Others', price: 3499, original_price: 4499, unit: '16 litre', description: 'Rechargeable battery sprayer for pesticide and fertilizer application.' },
  { name: 'Netafim Fertigation Venturi Kit', category: 'Others', price: 1299, original_price: 1699, unit: 'Single piece', description: 'Venturi injector kit for dosing fertilizer through drip irrigation.' },
  { name: 'Garware Agri Shade Net (75%)', category: 'Others', price: 2899, original_price: 3799, unit: '50m x 4m roll', description: 'Higher-density 75% shade net for heat-sensitive nursery crops.' },
  { name: 'Trustbasket Coco Peat Block', category: 'Others', price: 349, original_price: 499, unit: '5 kg block', description: 'Compressed coco peat block, expands into a lightweight growing medium.' },
  { name: 'Falcon Soil Moisture Meter', category: 'Others', price: 699, original_price: 949, unit: 'Single piece', description: 'Handheld probe for quick soil moisture readings before irrigation.' },
  { name: 'Kisan Kraft Digital Weighing Scale (50kg)', category: 'Others', price: 899, original_price: 1199, unit: 'Single piece', description: 'Digital platform scale for weighing harvested produce and inputs.' },
];

function randomBetween(min, max, decimals = 1) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

async function main() {
  for (const p of products) {
    const rating = randomBetween(3.8, 4.7, 1);
    const reviewCount = Math.floor(Math.random() * 110) + 5;
    const stock = Math.floor(Math.random() * 250) + 50;
    const result = await db.query(
      `INSERT INTO products (name, description, category, price, original_price, unit, image_url, stock_quantity, rating, review_count)
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, $9) RETURNING id`,
      [p.name, p.description, p.category, p.price, p.original_price, p.unit, stock, rating, reviewCount]
    );
    console.log(`Inserted [${p.category}] ${p.name} -> id ${result.rows[0].id}`);
  }
  console.log(`Done. Inserted ${products.length} products.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
