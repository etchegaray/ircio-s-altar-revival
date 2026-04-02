import { useTranslation } from 'react-i18next';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingBag, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const Admin = () => {
  const { t } = useTranslation();

  const sections = [
    { icon: DollarSign, title: t('nav.finances'), path: '/admin/finances', description: t('admin.finances_desc') },
    { icon: ShoppingBag, title: t('nav.shop'), path: '/admin/shop', description: t('admin.shop_desc') },
    { icon: Calendar, title: t('nav.events'), path: '/admin/events', description: t('admin.events_desc') },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('admin.dashboard')}</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link key={section.path} to={section.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <section.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
