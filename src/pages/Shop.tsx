import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingBag, Package, CheckCircle } from 'lucide-react';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [isProcessing, setIsProcessing] = useState(false);

  // Show success message if returning from Stripe
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success(t('shop.order_success'));
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('payment') === 'cancelled') {
      toast.error(t('shop.payment_cancelled'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsProcessing(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_price: selectedProduct.price,
          quantity: form.quantity,
          customer_name: form.customer_name,
          customer_email: form.customer_email,
          customer_phone: form.customer_phone,
          shipping_address: form.shipping_address,
          shipping_city: form.shipping_city,
          shipping_postal_code: form.shipping_postal_code,
          shipping_province: form.shipping_province,
          notes: form.notes,
          success_url: `${origin}/shop?payment=success`,
          cancel_url: `${origin}/shop?payment=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // Open Stripe Checkout outside iframe to avoid grey screen
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          // Popup blocked — try top-level navigation
          try {
            if (window.top && window.top !== window.self) {
              window.top.location.href = data.url;
            } else {
              window.location.href = data.url;
            }
          } catch {
            window.location.href = data.url;
          }
        }
        setIsProcessing(false);
        setSelectedProduct(null);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(t('admin.error'));
      setIsProcessing(false);
    }
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

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? '...' : t('shop.pay_now')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Shop;
