import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  active: boolean;
}

interface OrderForm {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  quantity: number;
  notes: string;
}

const emptyForm: OrderForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  shipping_address: '',
  shipping_city: '',
  shipping_postal_code: '',
  shipping_province: '',
  quantity: 1,
  notes: '',
};

const Shop = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;
      const totalAmount = selectedProduct.price * form.quantity;

      const { error } = await supabase.from('orders').insert({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_price: selectedProduct.price,
        quantity: form.quantity,
        total_amount: totalAmount,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone || null,
        shipping_address: form.shipping_address,
        shipping_city: form.shipping_city,
        shipping_postal_code: form.shipping_postal_code,
        shipping_province: form.shipping_province || null,
        notes: form.notes || null,
      });
      if (error) throw error;

      // Send notification email
      try {
        await supabase.functions.invoke('send-order-notification', {
          body: {
            product_name: selectedProduct.name,
            product_price: selectedProduct.price,
            quantity: form.quantity,
            total_amount: totalAmount,
            customer_name: form.customer_name,
            customer_email: form.customer_email,
            customer_phone: form.customer_phone,
            shipping_address: form.shipping_address,
            shipping_city: form.shipping_city,
            shipping_postal_code: form.shipping_postal_code,
            shipping_province: form.shipping_province,
            notes: form.notes,
          },
        });
      } catch (emailErr) {
        console.error('Email notification failed:', emailErr);
      }
    },
    onSuccess: () => {
      toast({ title: t('shop.order_success') });
      setSelectedProduct(null);
      setForm(emptyForm);
    },
    onError: () => {
      toast({ title: t('admin.error'), variant: 'destructive' });
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    placeOrder.mutate();
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <ShoppingBag className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">{t('shop.title')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('shop.subtitle')}</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">{t('shop.no_products')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                {product.image_url && (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  {product.description && (
                    <p className="text-muted-foreground text-sm">{product.description}</p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <span className="text-lg font-bold text-primary">{formatCurrency(product.price)}</span>
                  <Button onClick={() => { setSelectedProduct(product); setForm(emptyForm); }}>
                    {t('shop.order')}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Order Dialog */}
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('shop.order_title')}</DialogTitle>
              <DialogDescription>
                {selectedProduct?.name} — {selectedProduct && formatCurrency(selectedProduct.price)}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customer_name">{t('shop.customer_name')} *</Label>
                <Input id="customer_name" required value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="customer_email">{t('shop.customer_email')} *</Label>
                <Input id="customer_email" type="email" required value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="customer_phone">{t('shop.customer_phone')}</Label>
                <Input id="customer_phone" type="tel" value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="shipping_address">{t('shop.shipping_address')} *</Label>
                <Input id="shipping_address" required value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="shipping_city">{t('shop.shipping_city')} *</Label>
                  <Input id="shipping_city" required value={form.shipping_city}
                    onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="shipping_postal_code">{t('shop.shipping_postal_code')} *</Label>
                  <Input id="shipping_postal_code" required value={form.shipping_postal_code}
                    onChange={(e) => setForm({ ...form, shipping_postal_code: e.target.value })} />
                </div>
              </div>
              <div>
                <Label htmlFor="shipping_province">{t('shop.shipping_province')}</Label>
                <Input id="shipping_province" value={form.shipping_province}
                  onChange={(e) => setForm({ ...form, shipping_province: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="quantity">{t('shop.quantity')} *</Label>
                <Input id="quantity" type="number" min={1} required value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label htmlFor="notes">{t('shop.notes')}</Label>
                <Textarea id="notes" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {selectedProduct && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('shop.total')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedProduct.price * form.quantity)}
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={placeOrder.isPending}>
                {placeOrder.isPending ? '...' : t('shop.confirm_order')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Shop;
