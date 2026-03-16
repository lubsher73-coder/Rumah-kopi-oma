import { useOrders } from '@/hooks/useOrders';
import { formatRupiah, formatDate } from '@/lib/format';
import { printReceipt, type ReceiptData } from '@/lib/thermal-printer';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, Receipt } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function Orders() {
  const { data: orders, isLoading } = useOrders(100);
  const { user } = useAuth();
  const { toast } = useToast();

  const handlePrint = async (order: NonNullable<typeof orders>[0]) => {
    try {
      const receiptData: ReceiptData = {
        storeName: 'OMAH COFFEE',
        orderNumber: order.order_number,
        date: formatDate(order.created_at),
        cashier: user?.email || 'Kasir',
        items: order.order_items.map((i) => ({
          name: i.product_name,
          qty: i.quantity,
          price: i.unit_price,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        total: order.total,
        paymentMethod: order.payment_method,
        cashReceived: order.cash_received || undefined,
        change: order.change_amount || undefined,
      };
      await printReceipt(receiptData);
      toast({ title: 'Struk tercetak!' });
    } catch (err: any) {
      toast({ title: 'Gagal cetak', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold">Riwayat Pesanan</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !orders?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada pesanan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Dialog key={order.id}>
              <DialogTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-3 p-3">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium">{order.order_number}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {order.payment_method.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(order.created_at)} · {order.order_items.length} item
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary shrink-0">
                      {formatRupiah(order.total)}
                    </span>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-mono text-sm">{order.order_number}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  <div className="space-y-1.5">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span>{formatRupiah(item.total_price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatRupiah(order.subtotal)}</span>
                    </div>
                    {order.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diskon</span>
                        <span>-{formatRupiah(order.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total</span>
                      <span className="text-primary">{formatRupiah(order.total)}</span>
                    </div>
                    {order.cash_received && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tunai</span>
                        <span>{formatRupiah(order.cash_received)}</span>
                      </div>
                    )}
                    {order.change_amount && order.change_amount > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Kembalian</span>
                        <span>{formatRupiah(order.change_amount)}</span>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => handlePrint(order)}>
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Cetak Ulang Struk
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
