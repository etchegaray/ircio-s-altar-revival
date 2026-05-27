import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckoutForm {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_province: string;
  notes: string;
}

const emptyForm: CheckoutForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  shipping_address: '',
  shipping_city: '',
  shipping_postal_code: '',
  shipping_province: '',
  notes: '',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

const CartSheet = () => {
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(emptyForm);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: items.map(i => ({
            product_id: i.product.id,
            product_name: i.product.name,
            product_price: i.product.price,
            quantity: i.quantity,
          })),
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
        clearCart();
        setCheckoutOpen(false);
        const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
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
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(t('admin.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs leading-none">
                {itemCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {t('cart.title')}{itemCount > 0 && ` (${itemCount})`}
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">{t('cart.empty')}</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-start gap-3">
                    {item.product.image_url && (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.product.price)} / ud.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="font-semibold text-sm">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('cart.total')}</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                >
                  {t('cart.checkout')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={clearCart}
                >
                  {t('cart.clear')}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('shop.order_title')}</DialogTitle>
            <DialogDescription>
              {items.map(i => `${i.product.name} x${i.quantity}`).join(' · ')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <Label htmlFor="customer_name">{t('shop.customer_name')} *</Label>
              <Input
                id="customer_name"
                required
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer_email">{t('shop.customer_email')} *</Label>
              <Input
                id="customer_email"
                type="email"
                required
                value={form.customer_email}
                onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="customer_phone">{t('shop.customer_phone')}</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="shipping_address">{t('shop.shipping_address')} *</Label>
              <Input
                id="shipping_address"
                required
                value={form.shipping_address}
                onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="shipping_city">{t('shop.shipping_city')} *</Label>
                <Input
                  id="shipping_city"
                  required
                  value={form.shipping_city}
                  onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="shipping_postal_code">{t('shop.shipping_postal_code')} *</Label>
                <Input
                  id="shipping_postal_code"
                  required
                  value={form.shipping_postal_code}
                  onChange={(e) => setForm({ ...form, shipping_postal_code: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="shipping_province">{t('shop.shipping_province')}</Label>
              <Input
                id="shipping_province"
                value={form.shipping_province}
                onChange={(e) => setForm({ ...form, shipping_province: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">{t('shop.notes')}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              {items.map(i => (
                <div key={i.product.id} className="flex justify-between text-sm">
                  <span>{i.product.name} x{i.quantity}</span>
                  <span className="font-medium">{formatCurrency(i.product.price * i.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>{t('cart.total')}</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? '...' : t('shop.pay_now')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CartSheet;
