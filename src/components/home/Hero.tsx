import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import retabloImg from '@/assets/retablo.jpg';

const Hero = () => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={retabloImg}
          alt="Retablo de San Pedro Apóstol de Ircio"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
      </div>

      <div className="relative container mx-auto px-4 py-32 md:py-48">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            {t('hero.subtitle')}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild size="lg" className="text-base">
              <Link to="/donations">{t('hero.cta_donate')}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/shop">{t('hero.cta_shop')}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
