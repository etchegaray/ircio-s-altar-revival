import Layout from '@/components/layout/Layout';
import Hero from '@/components/home/Hero';
import History from '@/components/home/History';
import CurrentState from '@/components/home/CurrentState';

const Index = () => {
  return (
    <Layout>
      <Hero />
      <History />
      <CurrentState />
    </Layout>
  );
};

export default Index;
