import { useState } from 'react';
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateCategory,
} from '@/hooks/useProducts';
import { formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Tags } from 'lucide-react';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib').max(100),
  price: z.number().min(0, 'Harga tidak boleh negatif'),
  description: z.string().max(500).optional(),
  category_id: z.string().uuid().optional().nullable(),
  is_available: z.boolean(),
});

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory();
  const { toast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [catName, setCatName] = useState('');

  const resetForm = () => {
    setName('');
    setPrice('');
    setDescription('');
    setCategoryId('');
    setIsAvailable(true);
    setEditId(null);
    setShowForm(false);
  };

  const openEdit = (product: NonNullable<typeof products>[0]) => {
    setEditId(product.id);
    setName(product.name);
    setPrice(String(product.price));
    setDescription(product.description || '');
    setCategoryId(product.category_id || '');
    setIsAvailable(product.is_available);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = productSchema.parse({
        name,
        price: parseInt(price) || 0,
        description: description || undefined,
        category_id: categoryId || null,
        is_available: isAvailable,
      });

      const productData = {
        name: parsed.name,
        price: parsed.price,
        description: parsed.description || null,
        category_id: parsed.category_id || null,
        is_available: parsed.is_available,
      };

      if (editId) {
        await updateProduct.mutateAsync({ id: editId, ...productData });
        toast({ title: 'Produk diperbarui' });
      } else {
        await createProduct.mutateAsync(parsed);
        toast({ title: 'Produk ditambahkan' });
      }
      resetForm();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Produk dihapus' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await createCategory.mutateAsync({ name: catName.trim() });
      toast({ title: 'Kategori ditambahkan' });
      setCatName('');
      setShowCatForm(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold flex-1">Produk</h2>
        <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Tags className="mr-1.5 h-3.5 w-3.5" /> Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Tambah Kategori</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCategory} className="space-y-3">
              <Input
                placeholder="Nama kategori"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                maxLength={50}
              />
              <div className="flex flex-wrap gap-1.5">
                {categories?.map((c) => (
                  <Badge key={c.id} variant="secondary">{c.name}</Badge>
                ))}
              </div>
              <Button type="submit" className="w-full" disabled={createCategory.isPending}>
                Tambah
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Produk
        </Button>
      </div>

      {/* Product Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
            </div>
            <div className="space-y-1.5">
              <Label>Harga (Rp)</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} min={0} required />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
              <Label>Tersedia</Label>
            </div>
            <Button type="submit" className="w-full" disabled={createProduct.isPending || updateProduct.isPending}>
              {editId ? 'Simpan' : 'Tambah'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product List */}
      {isLoading ? (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : !products?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada produk. Tambahkan produk pertama!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className={!product.is_available ? 'opacity-50' : ''}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {product.categories && (
                      <Badge variant="secondary" className="text-[10px]">{product.categories.name}</Badge>
                    )}
                    {!product.is_available && (
                      <Badge variant="outline" className="text-[10px]">Habis</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-primary">{formatRupiah(product.price)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
