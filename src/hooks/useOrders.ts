import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes?: string;
}

export function useOrders(limit = 50) {
  return useQuery({
    queryKey: ['orders', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayOrders() {
  const today = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['orders', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      paymentMethod,
      cashReceived,
      discount,
      notes,
      cashierId,
    }: {
      items: CartItem[];
      paymentMethod: string;
      cashReceived?: number;
      discount?: number;
      notes?: string;
      cashierId: string;
    }) => {
      // Generate order number
      const { data: orderNum, error: numErr } = await supabase.rpc('generate_order_number');
      if (numErr) throw numErr;

      const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
      const tax = 0;
      const disc = discount || 0;
      const total = subtotal - disc + tax;
      const change = cashReceived ? cashReceived - total : 0;

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNum as string,
          cashier_id: cashierId,
          subtotal,
          tax,
          discount: disc,
          total,
          payment_method: paymentMethod,
          cash_received: cashReceived || null,
          change_amount: change > 0 ? change : null,
          notes: notes || null,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
      if (itemsErr) throw itemsErr;

      return { ...order, order_items: orderItems };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
