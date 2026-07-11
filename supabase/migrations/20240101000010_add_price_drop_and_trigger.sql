-- Add price_drop to alert_type enum
ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'price_drop';

-- Function to check price alerts after a purchase insert
CREATE OR REPLACE FUNCTION public.check_price_alerts()
RETURNS trigger AS $$
DECLARE
  avg_price numeric;
  latest_prev_price numeric;
  price_change_pct numeric;
  prod_name text;
BEGIN
  -- Get average of previous purchases for this product by this user
  SELECT avg(unit_price) INTO avg_price
  FROM public.purchases
  WHERE user_id = NEW.user_id
    AND product_id = NEW.product_id
    AND id != NEW.id;

  -- Get the most recent previous purchase price
  SELECT unit_price INTO latest_prev_price
  FROM public.purchases
  WHERE user_id = NEW.user_id
    AND product_id = NEW.product_id
    AND id != NEW.id
  ORDER BY purchase_date DESC, created_at DESC
  LIMIT 1;

  -- Get product name
  SELECT canonical_name INTO prod_name
  FROM public.products
  WHERE id = NEW.product_id;

  -- If no previous data, no alert to generate
  IF avg_price IS NULL OR latest_prev_price IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate percentage change from average
  price_change_pct := ((NEW.unit_price - avg_price) / avg_price) * 100;

  -- Price spike: current price is 15%+ above average
  IF price_change_pct > 15 THEN
    INSERT INTO public.alerts (user_id, product_id, message, alert_type)
    VALUES (
      NEW.user_id,
      NEW.product_id,
      prod_name || ' price is ' || round(price_change_pct) || '% above your average (₹' || round(NEW.unit_price, 0) || ' vs avg ₹' || round(avg_price, 0) || ')',
      'price_spike'
    );
  END IF;

  -- Price drop: current price is 15%+ below average
  IF price_change_pct < -15 THEN
    INSERT INTO public.alerts (user_id, product_id, message, alert_type)
    VALUES (
      NEW.user_id,
      NEW.product_id,
      prod_name || ' is ' || round(abs(price_change_pct)) || '% cheaper than your average! (₹' || round(NEW.unit_price, 0) || ' vs avg ₹' || round(avg_price, 0) || ')',
      'price_drop'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on purchases
CREATE TRIGGER on_purchase_insert_check_alerts
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.check_price_alerts();
