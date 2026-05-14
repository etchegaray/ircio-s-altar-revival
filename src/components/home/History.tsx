import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";

const History = () => {
  const { t } = useTranslation();

  return (
    <section className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-8 w-8 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold">{t("home.history_title")}</h2>
        </div>

        <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
          <p>{t("home.history_text")}</p>
          <p>{t("home.history_text_2")}</p>
          <p>{t("home.history_text_3")}</p>
        </div>

        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6">{t("home.authors_title")}</h3>
          <div className="bg-card border rounded-lg p-6">
            <p className="text-foreground leading-relaxed">{t("home.author_gamiz")}</p>
            <p className="text-foreground leading-relaxed">{t("home.author_murillas")}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default History;
