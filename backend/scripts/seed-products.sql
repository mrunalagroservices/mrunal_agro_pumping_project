-- Seed the real product catalog. Run this in Neon Console -> SQL Editor
-- (and/or locally) so the Market screen has real data to show, now that
-- it reads from the products table instead of a hardcoded list.
-- Safe to re-run: skips products that already exist by name.

INSERT INTO products (name, description, category, price, original_price, unit, is_best_seller, stock_quantity, rating, review_count)
SELECT * FROM (VALUES
  ('Hybrid Tomato Seeds', 'High-yield hybrid tomato seeds. Disease resistant, suitable for all seasons.', 'Seeds', 149.00, 299.00, '10g packet', true, 200, 4.4, 2341),
  ('Onion Seeds (Nasik Red)', 'Premium Nasik red onion seeds. High germination rate, 90-day variety.', 'Seeds', 249.00, 399.00, '500g', false, 150, 4.2, 1892),
  ('Wheat Seeds (HD-2967)', 'Certified HD-2967 wheat seeds, high protein content, rust resistant.', 'Seeds', 599.00, 799.00, '5 kg bag', true, 100, 4.6, 4120),
  ('NPK Fertilizer 19-19-19', 'Balanced NPK water-soluble fertilizer for all crops. Promotes root and leaf growth.', 'Fertilizers', 650.00, 950.00, '5 kg bag', true, 180, 4.5, 3210),
  ('Organic Vermicompost', '100% organic vermicompost. Improves soil structure and water retention.', 'Fertilizers', 450.00, 650.00, '10 kg bag', false, 220, 4.3, 1567),
  ('DAP Fertilizer', 'Di-ammonium phosphate for strong root development. Ideal for sowing time.', 'Fertilizers', 1350.00, 1800.00, '50 kg bag', true, 90, 4.7, 5432),
  ('Drip Irrigation Kit', 'Complete drip irrigation kit for 1 acre. Includes main pipe, drippers, connectors.', 'Irrigation', 2499.00, 3999.00, '1 acre kit', true, 60, 4.4, 890),
  ('Sprinkler Set (8 heads)', 'Rotating sprinkler set with 8 heads and 25m pipe. Covers up to 500 sq.m.', 'Irrigation', 899.00, 1299.00, 'Set of 8', false, 140, 4.1, 654),
  ('Garden Pressure Sprayer', '16-litre manual pressure sprayer with adjustable nozzle. Ideal for pesticide application.', 'Tools', 1299.00, 1999.00, '16 litre', true, 110, 4.3, 2100),
  ('Steel Garden Hoe', 'Heavy duty steel garden hoe with wooden handle. Perfect for weeding and soil turning.', 'Tools', 349.00, 549.00, 'Single piece', false, 300, 4.0, 987),
  ('Sickle (Stainless Steel)', 'Stainless steel sickle with ergonomic grip. Rust-proof, long-lasting.', 'Tools', 249.00, 399.00, 'Single piece', false, 260, 4.2, 1234),
  ('Imidacloprid Insecticide', 'Systemic insecticide effective against sucking pests. Suitable for cotton, paddy, vegetables.', 'Pesticides', 399.00, 599.00, '250 ml', true, 170, 4.5, 3456),
  ('Mancozeb Fungicide', 'Broad spectrum fungicide for fruit, vegetable and field crops. Prevents blight and rust.', 'Pesticides', 299.00, 450.00, '500g', false, 190, 4.3, 2109),
  ('HDPE Mulch Film', '25-micron HDPE black mulch film. Controls weeds and conserves soil moisture.', 'Others', 1800.00, 2500.00, '400m x 1.2m roll', false, 40, 4.2, 432),
  ('pH Soil Testing Kit', 'Quick soil pH test kit with 100 test strips. Helps optimise fertilizer use.', 'Others', 299.00, 499.00, '100 strips', true, 130, 4.6, 1876)
) AS v(name, description, category, price, original_price, unit, is_best_seller, stock_quantity, rating, review_count)
WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.name = v.name);
