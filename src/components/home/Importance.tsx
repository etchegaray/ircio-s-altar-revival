import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Importance = () => {
  const { t } = useTranslation();

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Star className="h-8 w-8 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold">{t('home.importance_title')}</h2>
        </div>
        <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
          <p>{t('home.importance_text')}</p>
          <p>{t('home.importance_text_2')}</p>
        </div>
        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/donations">{t('hero.cta_donate')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Importance;
