import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-primary text-primary-foreground mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-['Playfair_Display'] text-lg font-bold mb-3">
              Retablo de Ircio
            </h3>
            <p className="text-sm opacity-80 leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{t('footer.links')}</h4>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/" className="hover:opacity-100 transition-opacity">{t('nav.home')}</Link></li>
              <li><Link to="/finances" className="hover:opacity-100 transition-opacity">{t('nav.finances')}</Link></li>
              <li><Link to="/shop" className="hover:opacity-100 transition-opacity">{t('nav.shop')}</Link></li>
              <li><Link to="/events" className="hover:opacity-100 transition-opacity">{t('nav.events')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">{t('footer.contact')}</h4>
            <p className="text-sm opacity-80">
              Ircio, Miranda de Ebro<br />
              Burgos, España
            </p>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm opacity-60">
          © {new Date().getFullYear()} Retablo de Ircio. {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
