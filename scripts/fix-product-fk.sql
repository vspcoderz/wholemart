-- Drizzle push doesn't alter existing FK clauses; run this after db:push
-- (local dev AND Supabase) so deleting a product keeps historical order items.
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_id_products_id_fk;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_id_products_id_fk
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
