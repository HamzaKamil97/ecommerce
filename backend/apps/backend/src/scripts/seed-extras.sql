-- Sample promo codes
INSERT INTO promo_code (id, code, description, discount_type, percent_off, min_subtotal_cents, max_redemptions, is_active, created_at, updated_at)
SELECT 'promo_' || substr(md5(random()::text), 1, 12),
       'WELCOME10',
       'Welcome bonus — 10% off your first order',
       'percent', 10, 0, 1000, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM promo_code WHERE code = 'WELCOME10');

INSERT INTO promo_code (id, code, description, discount_type, amount_off_cents, currency_code, min_subtotal_cents, max_redemptions, is_active, created_at, updated_at)
SELECT 'promo_' || substr(md5(random()::text), 1, 12),
       'SAVE5',
       'Flat $5 off orders over $25',
       'fixed_amount', 500, 'USD', 2500, 5000, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM promo_code WHERE code = 'SAVE5');

INSERT INTO promo_code (id, code, description, discount_type, is_active, created_at, updated_at)
SELECT 'promo_' || substr(md5(random()::text), 1, 12),
       'FREESHIP',
       'Free shipping, all orders',
       'free_shipping', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM promo_code WHERE code = 'FREESHIP');

SELECT code, discount_type, percent_off, amount_off_cents FROM promo_code;
