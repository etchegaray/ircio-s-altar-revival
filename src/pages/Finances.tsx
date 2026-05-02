import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

const Finances = () => {
  const { t } = useTranslation();

  const { data: campaign } = useQuery({
    queryKey: ['campaign_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('campaign_settings').select('*').limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: donations = [] } = useQuery({
    queryKey: ['donations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('donations').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalDonations = donations.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const goalAmount = campaign?.goal_amount ?? 0;
  const progressPercent = goalAmount > 0 ? Math.min((totalDonations / goalAmount) * 100, 100) : 0;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">{t('finances.title')}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t('finances.subtitle')}</p>
        </div>

        {/* Progress Section */}
        <Card className="mb-10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{t('finances.raised')}</span>
              <span className="text-sm font-medium text-muted-foreground">{t('finances.goal')}: {formatCurrency(goalAmount)}</span>
            </div>
            <Progress value={progressPercent} className="h-4 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('finances.raised')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalDonations)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <TrendingDown className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('finances.expenses')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <Target className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">{t('finances.remaining')}</p>
                  <p className="text-2xl font-bold">{formatCurrency(Math.max(goalAmount - totalDonations, 0))}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tables */}
        <Tabs defaultValue="donations" className="w-full">
          <div className="flex items-center justify-between mb-6 gap-4">
            <TabsList className="grid grid-cols-2 max-w-md w-full">
              <TabsTrigger value="donations">{t('finances.donations')} ({donations.length})</TabsTrigger>
              <TabsTrigger value="expenses">{t('finances.expenses')} ({expenses.length})</TabsTrigger>
            </TabsList>
            <Button asChild>
              <Link to="/donations">{t('hero.cta_donate')}</Link>
            </Button>
          </div>

          <TabsContent value="donations">
            <Card>
              <CardHeader>
                <CardTitle>{t('finances.donations')}</CardTitle>
              </CardHeader>
              <CardContent>
                {donations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('finances.no_data')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('finances.date')}</TableHead>
                        <TableHead>{t('finances.donor')}</TableHead>
                        <TableHead>{t('finances.description')}</TableHead>
                        <TableHead className="text-right">{t('finances.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {donations.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{formatDate(d.date)}</TableCell>
                          <TableCell>{d.donor_name || '—'}</TableCell>
                          <TableCell>{d.description || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(d.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>{t('finances.expenses')}</CardTitle>
              </CardHeader>
              <CardContent>
                {expenses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">{t('finances.no_data')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('finances.date')}</TableHead>
                        <TableHead>{t('finances.category')}</TableHead>
                        <TableHead>{t('finances.description')}</TableHead>
                        <TableHead className="text-right">{t('finances.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{formatDate(e.date)}</TableCell>
                          <TableCell>{e.category || '—'}</TableCell>
                          <TableCell>{e.description || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Finances;
