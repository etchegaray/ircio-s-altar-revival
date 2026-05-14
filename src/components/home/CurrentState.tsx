import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CurrentState = () => {
  const { t } = useTranslation();

  return (
    <section className="bg-muted py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-8 w-8 text-primary" />
            <h2 className="text-3xl md:text-4xl font-bold">{t('home.state_title')}</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {t('home.state_text')}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to="/donations">{t('hero.cta_donate')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CurrentState;
