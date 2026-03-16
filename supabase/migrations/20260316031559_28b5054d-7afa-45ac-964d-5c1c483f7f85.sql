
-- Fix: restrict order_items insert to users who own the parent order
DROP POLICY "Authenticated can create order items" ON public.order_items;
CREATE POLICY "Authenticated can create order items" ON public.order_items 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.cashier_id = auth.uid()
    )
  );
