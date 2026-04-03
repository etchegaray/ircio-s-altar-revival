import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminFinances = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Campaign settings
  const { data: campaign } = useQuery({
    queryKey: ['campaign_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaign_settings').select('*').limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const [goalAmount, setGoalAmount] = useState('');
  const [campaignName, setCampaignName] = useState('');

  const updateCampaign = useMutation({
    mutationFn: async () => {
      const values = {
        goal_amount: parseFloat(goalAmount) || campaign?.goal_amount || 0,
        campaign_name: campaignName || campaign?.campaign_name || 'Restauración del Retablo de Ircio',
      };
      if (campaign?.id) {
        const { error } = await supabase.from('campaign_settings').update(values).eq('id', campaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('campaign_settings').insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign_settings'] });
      toast.success(t('admin.saved'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  // Donations
  const { data: donations = [] } = useQuery({
    queryKey: ['donations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('donations').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [donationForm, setDonationForm] = useState({ amount: '', donor_name: '', description: '', date: '' });
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);

  const addDonation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('donations').insert({
        amount: parseFloat(donationForm.amount),
        donor_name: donationForm.donor_name || null,
        description: donationForm.description || null,
        date: donationForm.date || new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      setDonationForm({ amount: '', donor_name: '', description: '', date: '' });
      setDonationDialogOpen(false);
      toast.success(t('admin.saved'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const deleteDonation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('donations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success(t('admin.deleted'));
    },
  });

  // Expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [expenseForm, setExpenseForm] = useState({ amount: '', description: '', category: '', date: '' });
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('expenses').insert({
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description || null,
        category: expenseForm.category || null,
        date: expenseForm.date || new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setExpenseForm({ amount: '', description: '', category: '', date: '' });
      setExpenseDialogOpen(false);
      toast.success(t('admin.saved'));
    },
    onError: () => toast.error(t('admin.error')),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(t('admin.deleted'));
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-3xl font-bold">{t('admin.finances_title')}</h1>
        </div>

        {/* Campaign Settings */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t('admin.campaign_settings')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>{t('admin.campaign_name')}</Label>
                <Input
                  value={campaignName || campaign?.campaign_name || ''}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={campaign?.campaign_name || ''}
                />
              </div>
              <div>
                <Label>{t('finances.goal')} (€)</Label>
                <Input
                  type="number"
                  value={goalAmount || campaign?.goal_amount?.toString() || ''}
                  onChange={(e) => setGoalAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <Button className="mt-4" onClick={() => updateCampaign.mutate()} disabled={updateCampaign.isPending}>
              {t('admin.save')}
            </Button>
          </CardContent>
        </Card>

        {/* Donations & Expenses Tabs */}
        <Tabs defaultValue="donations">
          <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="donations">{t('finances.donations')}</TabsTrigger>
            <TabsTrigger value="expenses">{t('finances.expenses')}</TabsTrigger>
          </TabsList>

          <TabsContent value="donations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('finances.donations')}</CardTitle>
                <Dialog open={donationDialogOpen} onOpenChange={setDonationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t('admin.add')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.add_donation')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>{t('finances.amount')} (€) *</Label>
                        <Input type="number" step="0.01" value={donationForm.amount} onChange={(e) => setDonationForm(f => ({ ...f, amount: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.donor')}</Label>
                        <Input value={donationForm.donor_name} onChange={(e) => setDonationForm(f => ({ ...f, donor_name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.description')}</Label>
                        <Input value={donationForm.description} onChange={(e) => setDonationForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.date')}</Label>
                        <Input type="date" value={donationForm.date} onChange={(e) => setDonationForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <Button onClick={() => addDonation.mutate()} disabled={!donationForm.amount || addDonation.isPending}>
                        {t('admin.save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finances.date')}</TableHead>
                      <TableHead>{t('finances.donor')}</TableHead>
                      <TableHead>{t('finances.description')}</TableHead>
                      <TableHead className="text-right">{t('finances.amount')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{formatDate(d.date)}</TableCell>
                        <TableCell>{d.donor_name || '—'}</TableCell>
                        <TableCell>{d.description || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(d.amount))}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteDonation.mutate(d.id)}>
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

          <TabsContent value="expenses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('finances.expenses')}</CardTitle>
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> {t('admin.add')}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('admin.add_expense')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label>{t('finances.amount')} (€) *</Label>
                        <Input type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.category')}</Label>
                        <Input value={expenseForm.category} onChange={(e) => setExpenseForm(f => ({ ...f, category: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.description')}</Label>
                        <Input value={expenseForm.description} onChange={(e) => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div>
                        <Label>{t('finances.date')}</Label>
                        <Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
                      </div>
                      <Button onClick={() => addExpense.mutate()} disabled={!expenseForm.amount || addExpense.isPending}>
                        {t('admin.save')}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('finances.date')}</TableHead>
                      <TableHead>{t('finances.category')}</TableHead>
                      <TableHead>{t('finances.description')}</TableHead>
                      <TableHead className="text-right">{t('finances.amount')}</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell>{e.category || '—'}</TableCell>
                        <TableCell>{e.description || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteExpense.mutate(e.id)}>
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminFinances;
