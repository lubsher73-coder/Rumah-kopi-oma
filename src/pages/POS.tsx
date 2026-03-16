import { useState, useMemo } from 'react';
import { useAvailableProducts, useCategories } from '@/hooks/useProducts';
import { useCreateOrder, type CartItem } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { formatRupiah, formatDate } from '@/lib/format';
import { printReceipt, type ReceiptData } from '@/lib/thermal-printer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Search,
  Edit3,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function POS() {
  const { user } = useAuth();
  const { data: products, isLoading } = useAvailableProducts();
  const { data: categories } = useCategories();
  const createOrder = useCreateOrder();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [discount, setDiscount] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchCat = !selectedCategory || p.category_id === selectedCategory;
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, search]);

  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discountAmount = parseInt(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const cashReceivedAmount = parseInt(cashReceived) || 0;
  const change = cashReceivedAmount - total;

  const addToCart = (product: NonNullable<typeof products>[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: product.id, product_name: product.name, unit_price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const openNotesDialog = (productId: string) => {
    const item = cart.find((i) => i.product_id === productId);
    setEditingNotes(productId);
    setNotesText(item?.notes || '');
  };

  const saveNotes = () => {
    if (editingNotes) {
      setCart((prev) =>
        prev.map((i) =>
          i.product_id === editingNotes ? { ...i, notes: notesText.trim() || undefined } : i
        )
      );
      setEditingNotes(null);
      setNotesText('');
    }
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    if (paymentMethod === 'cash' && cashReceivedAmount < total) {
      toast({ title: 'Uang kurang', description: 'Jumlah tunai kurang dari total.', variant: 'destructive' });
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        items: cart,
        paymentMethod,
        cashReceived: paymentMethod === 'cash' ? cashReceivedAmount : undefined,
        discount: discountAmount,
        cashierId: user.id,
      });

      toast({ title: 'Pesanan berhasil!', description: `No: ${order.order_number}` });

      try {
        const receiptData: ReceiptData = {
          storeName: 'OMAH COFFEE',
          orderNumber: order.order_number,
          date: formatDate(order.created_at),
          cashier: user.email || 'Kasir',
          items: cart.map((i) => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
          subtotal,
          discount: discountAmount,
          tax: 0,
          total,
          paymentMethod,
          cashReceived: paymentMethod === 'cash' ? cashReceivedAmount : undefined,
          change: paymentMethod === 'cash' && change > 0 ? change : undefined,
        };
        await printReceipt(receiptData);
      } catch {
        // Printing is optional
      }

      setCart([]);
      setCashReceived('');
      setDiscount('');
    } catch (err: any) {
      toast({ title: 'Gagal', description: err.message, variant: 'destructive' });
    }
  };

  const CartPanel = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3 bg-muted/30">
        <ShoppingCart className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Keranjang</span>
        <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
        {showCart && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:hidden ml-2"
            onClick={() => setShowCart(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Keranjang kosong</p>
        ) : (
          cart.map((item) => (
            <div key={item.product_id} className="rounded-md border bg-card shadow-sm">
              <div className="flex items-center gap-2 p-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">{formatRupiah(item.unit_price)}</p>
                  {item.notes && (
                    <p className="text-xs text-primary mt-0.5 line-clamp-1 italic">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product_id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1 px-2 pb-2">
                <Dialog open={editingNotes === item.product_id} onOpenChange={(open) => !open && setEditingNotes(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs flex-1"
                      onClick={() => openNotesDialog(item.product_id)}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {item.notes ? 'Edit Catatan' : 'Tambah Catatan'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-base">Catatan untuk Barista</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{item.product_name}</p>
                      <Textarea
                        placeholder="Contoh: Tanpa gula, extra hot..."
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        className="min-h-20"
                        maxLength={200}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingNotes(null)}>
                          Batal
                        </Button>
                        <Button size="sm" className="flex-1" onClick={saveNotes}>
                          Simpan
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive hover:text-destructive"
                  onClick={() => removeFromCart(item.product_id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Hapus
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t p-3 space-y-3 bg-muted/20">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs flex-shrink-0">Diskon</span>
              <Input
                type="number"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="flex justify-between font-bold text-base pt-1.5 border-t">
              <span>Total</span>
              <span className="text-primary">{formatRupiah(total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setPaymentMethod('cash')}
            >
              <Banknote className="mr-1.5 h-3.5 w-3.5" /> Tunai
            </Button>
            <Button
              variant={paymentMethod === 'qris' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setPaymentMethod('qris')}
            >
              <CreditCard className="mr-1.5 h-3.5 w-3.5" /> QRIS
            </Button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-1.5">
              <Input
                type="number"
                placeholder="Uang diterima"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="h-9"
              />
              {cashReceivedAmount >= total && total > 0 && (
                <p className="text-xs text-success font-medium">
                  Kembalian: {formatRupiah(change)}
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full h-10 font-semibold"
            onClick={handleCheckout}
            disabled={createOrder.isPending || cart.length === 0}
          >
            {createOrder.isPending ? 'Memproses...' : 'Bayar Sekarang'}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] gap-0 -m-4 md:-m-6">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b p-3 bg-background sticky top-0 z-10">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden relative shrink-0"
            onClick={() => setShowCart(!showCart)}
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cart.length}
              </span>
            )}
          </Button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto border-b p-2 bg-muted/30 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="shrink-0 h-7 text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            Semua
          </Button>
          {categories?.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 h-7 text-xs"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada produk ditemukan
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {product.categories?.name}
                    </p>
                    <p className="mt-2 text-sm font-bold text-primary">
                      {formatRupiah(product.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex w-80 lg:w-96 flex-col border-l bg-card shadow-lg">
        <CartPanel />
      </div>

      {showCart && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-[min(400px,85vw)] bg-card shadow-2xl animate-slide-in">
            <CartPanel />
          </div>
        </div>
      )}
    </div>
  );
}
