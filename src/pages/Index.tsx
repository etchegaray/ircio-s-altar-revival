import Layout from '@/components/layout/Layout';
import Hero from '@/components/home/Hero';
import History from '@/components/home/History';
import CurrentState from '@/components/home/CurrentState';
import Importance from '@/components/home/Importance';

const Index = () => {
  return (
    <Layout>
      <Hero />
      <History />
      <CurrentState />
      <Importance />
    </Layout>
  );
};

export default Index;
