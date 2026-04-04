import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, Mail, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminShop = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Shop settings
  const { data: shopSettings } = useQuery({
    queryKey: ['shop_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shop_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [notificationEmail, setNotificationEmail] = useState('');
  const emailLoaded = shopSettings && notificationEmail === '';
  if (emailLoaded) {
    setNotificationEmail(shopSettings.notification_email || '');
  }

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (shopSettings?.id) {
        const { error } = await supabase.from('shop_settings').update({ notification_email: notificationEmail }).eq('id', shopSettings.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop_settings'] });
      toast({ title: t('admin.saved') });
    },
    onError: () => toast({ title: t('admin.error'), variant: 'destructive' }),
  });

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ['admin_products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '', image_url: '' });
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const addProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('products').insert({
        name: newProduct.name,
        description: newProduct.description || null,
        price: parseFloat(newProduct.price),
        image_url: newProduct.image_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_products'] });
      setNewProduct({ name: '', description: '', price: '', image_url: '' });
      setAddDialogOpen(false);
      toast({ title: t('admin.saved') });
    },
    onError: () => toast({ title: t('admin.error'), variant: 'destructive' }),
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('products').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_products'] }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_products'] });
      toast({ title: t('admin.deleted') });
    },
    onError: () => toast({ title: t('admin.error'), variant: 'destructive' }),
  });

  // Orders
  const { data: orders = [] } = useQuery({
    queryKey: ['admin_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Link to="/admin" className="text-primary hover:underline mb-6 inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> {t('admin.dashboard')}
        </Link>

        <h1 className="text-3xl font-bold mb-8">{t('admin.shop_title')}</h1>

        {/* Notification Email Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> {t('admin.notification_email')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor="notification_email">{t('admin.notification_email_desc')}</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="pedidos@ejemplo.com"
                />
              </div>
              <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                {t('admin.save')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">{t('admin.products')}</TabsTrigger>
            <TabsTrigger value="orders">{t('admin.orders')}</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('admin.products')}</CardTitle>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t('admin.add_product')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.add_product')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t('shop.product_name')}</Label>
                        <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t('finances.description')}</Label>
                        <Textarea value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t('shop.price')}</Label>
                        <Input type="number" step="0.01" min="0" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t('shop.image_url')}</Label>
                        <Input value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} placeholder="https://..." />
                      </div>
                      <Button onClick={() => addProduct.mutate()} disabled={!newProduct.name || !newProduct.price} className="w-full">
                        {t('admin.add')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('shop.product_name')}</TableHead>
                      <TableHead>{t('shop.price')}</TableHead>
                      <TableHead>{t('admin.active')}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <Switch checked={product.active} onCheckedChange={(checked) => toggleProduct.mutate({ id: product.id, active: checked })} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" /> {t('admin.orders')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('finances.no_data')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('finances.date')}</TableHead>
                          <TableHead>{t('shop.product_name')}</TableHead>
                          <TableHead>{t('shop.quantity')}</TableHead>
                          <TableHead>{t('shop.total')}</TableHead>
                          <TableHead>{t('shop.customer_name')}</TableHead>
                          <TableHead>{t('shop.customer_email')}</TableHead>
                          <TableHead>{t('shop.shipping_city')}</TableHead>
                          <TableHead>{t('admin.status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="whitespace-nowrap">{formatDate(order.created_at)}</TableCell>
                            <TableCell>{order.product_name}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                            <TableCell>{order.customer_name}</TableCell>
                            <TableCell>{order.customer_email}</TableCell>
                            <TableCell>{order.shipping_city}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {order.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminShop;
