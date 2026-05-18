-- Sample vertical_product_fields rows for the seeded multi-category products.
-- Idempotent: skips rows that already exist (unique constraint on product_id).

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'food',
  '{"prep_minutes":18,"spice_level":"none","allergens":["gluten","dairy"],"ingredients":["dough","mozzarella","san marzano tomato","basil"],"calories":850}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'margherita-pizza'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'food',
  '{"prep_minutes":10,"allergens":["gluten","dairy","egg"],"ingredients":["butter","dark chocolate","flour"],"calories":340}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'chocolate-croissant'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'flowers',
  '{"stem_count":12,"vase_required":false,"occasion_tags":["anniversary","birthday","wedding"],"delivery_date_required":true,"message_card_allowed":true,"freshness_days":7}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'red-roses-bouquet'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'flowers',
  '{"stem_count":20,"vase_required":true,"occasion_tags":["congratulations","thankyou"],"delivery_date_required":true,"message_card_allowed":true,"freshness_days":5}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'tulip-mix'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'vegetables',
  '{"unit":"kg","organic":true,"origin":"local","harvest_date":"2026-05-15"}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'organic-carrots'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'vegetables',
  '{"unit":"g","organic":false,"origin":"Italy","harvest_date":"2026-05-14"}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'cherry-tomatoes'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'electronics',
  '{"brand":"AudioMax","model":"AM-500","specs":{"driver":"40mm dynamic","bluetooth":"5.3","battery":"40h"},"warranty_months":24,"in_box_items":["headphones","cable","case","manual"]}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'wireless-headphones'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'electronics',
  '{"brand":"PowerCore","model":"PC-20K","specs":{"capacity":"20000 mAh","output":"65W USB-C PD","passthrough":"yes"},"warranty_months":18,"in_box_items":["powerbank","USB-C cable","pouch"]}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'usbc-power-bank'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'fashion',
  '{"sizes":["S","M","L"],"colors":["mid wash"],"material":"100% cotton","gender":"unisex"}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'classic-denim-jacket'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

INSERT INTO vertical_product_fields (id, product_id, vertical, fields, created_at, updated_at)
SELECT 'vpf_' || substr(md5(random()::text), 1, 16), p.id, 'fashion',
  '{"sizes":["S","M","L"],"colors":["white","black"],"material":"100% cotton","gender":"unisex"}'::jsonb,
  NOW(), NOW()
FROM product p
WHERE p.handle = 'cotton-t-shirt'
  AND NOT EXISTS (SELECT 1 FROM vertical_product_fields WHERE product_id = p.id);

SELECT vertical, COUNT(*) FROM vertical_product_fields GROUP BY vertical ORDER BY vertical;
