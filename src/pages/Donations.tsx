import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';

const Donations = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    first_name: '',
    last_name: '',
    email: '',
    show_name: true,
  });

  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      toast.success(t('donations.payment_success'));
      setSearchParams({}, { replace: true });
    } else if (searchParams.get('payment') === 'cancelled') {
      toast.error(t('donations.payment_cancelled'));
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;

    setIsProcessing(true);
    try {
      const origin = window.location.origin;
      const { data, error } = await supabase.functions.invoke('create-donation-checkout', {
        body: {
          amount,
          donor_name: `${form.first_name} ${form.last_name}`.trim(),
          donor_email: form.email,
          show_name: form.show_name,
          success_url: `${origin}/donations?payment=success`,
          cancel_url: `${origin}/donations?payment=cancelled`,
        },
      });

      if (error) throw error;
      if (data?.url) {
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
        setIsProcessing(false);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Donation checkout error:', err);
      toast.error(t('admin.error'));
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <div className="text-center mb-10">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-4">{t('donations.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('donations.subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('donations.form_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="amount">{t('donations.amount')} (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">{t('donations.first_name')} *</Label>
                  <Input
                    id="first_name"
                    required
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">{t('donations.last_name')} *</Label>
                  <Input
                    id="last_name"
                    required
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">{t('donations.email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="show_name"
                  checked={form.show_name}
                  onCheckedChange={(checked) => setForm({ ...form, show_name: !!checked })}
                />
                <Label htmlFor="show_name" className="cursor-pointer leading-snug font-normal">
                  {t('donations.show_name_label')}
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? '...' : t('donations.pay_button')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Donations;
