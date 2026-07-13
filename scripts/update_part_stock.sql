CREATE OR REPLACE FUNCTION update_part_stock(p_part_id UUID, p_delta INTEGER)
RETURNS void AS $$
  UPDATE aut_parts SET stock_actual = stock_actual + p_delta WHERE id = p_part_id;
$$ LANGUAGE sql;
