-- Mock Test 01 is the free taste: any signed-in student can take it in full,
-- score included. Everything else needs payment.
--
-- The unique index allows only one free test, so clear the flag before setting
-- it — that also makes moving the offer to another test a two-line change.

UPDATE tests SET is_free_sample = FALSE WHERE is_free_sample;

UPDATE tests SET is_free_sample = TRUE WHERE title = 'NEET Mock Test 01';
