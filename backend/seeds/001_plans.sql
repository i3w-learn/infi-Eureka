-- The one plan on sale: MRP ₹6,000, selling at ₹3,499. Money is paise (DR-01).
-- Changing the price here changes the checkout amount with no deploy (FR-P-04).

INSERT INTO plans (id, name, mrp_paise, price_paise, currency, is_active)
VALUES ('00000000-0000-4000-8000-000000000001', 'NEET Complete Access', 600000, 349900, 'INR', TRUE)
ON CONFLICT (id) DO UPDATE
    SET name        = EXCLUDED.name,
        mrp_paise   = EXCLUDED.mrp_paise,
        price_paise = EXCLUDED.price_paise,
        currency    = EXCLUDED.currency,
        is_active   = EXCLUDED.is_active;
