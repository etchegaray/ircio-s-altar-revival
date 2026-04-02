import { useTranslation } from 'react-i18next';
import Layout from '@/components/layout/Layout';

const Finances = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">{t('finances.title')}</h1>
        <p className="text-muted-foreground text-lg">{t('finances.subtitle')}</p>
        <p className="mt-8 text-muted-foreground italic">Próximamente — Requiere conexión a Supabase</p>
      </div>
    </Layout>
  );
};

export default Finances;
