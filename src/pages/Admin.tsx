import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Calendar, Users } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { SECTION_ROLES, type AppRole } from '@/lib/permissions';

interface Section {
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
  path: string;
  requiredRoles: AppRole[];
}

const Admin = () => {
  const { t } = useTranslation();
  const { isAdmin, hasAnyRole } = useAuth();

  const sections: Section[] = [
    {
      icon: DollarSign,
      titleKey: 'nav.finances',
      descKey: 'admin.finances_desc',
      path: '/admin/finances',
      requiredRoles: SECTION_ROLES.finances,
    },
    {
      icon: ShoppingBag,
      titleKey: 'nav.shop',
      descKey: 'admin.shop_desc',
      path: '/admin/shop',
      requiredRoles: SECTION_ROLES.shop,
    },
    {
      icon: Calendar,
      titleKey: 'nav.events',
      descKey: 'admin.events_desc',
      path: '/admin/events',
      requiredRoles: SECTION_ROLES.events,
    },
  ];

  const visibleSections = sections.filter((s) => hasAnyRole(s.requiredRoles));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{t('admin.dashboard')}</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {visibleSections.map((section) => (
            <Link key={section.path} to={section.path}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <section.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl">{t(section.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t(section.descKey)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Users card — admin only */}
          {isAdmin && (
            <Link to="/admin/users">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <CardTitle className="text-xl">{t('admin.users_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('admin.users_desc')}</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
