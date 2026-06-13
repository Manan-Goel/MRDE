import { motion } from 'framer-motion';
import Header from '../components/Header';
import SatelliteSelector from '../components/SatelliteSelector';
import GlobeView from '../globe/GlobeView';
import RiskBars from '../components/RiskBars';
import RecommendationCards from '../components/RecommendationCards';
import ForecastChart from '../components/ForecastChart';
import LiveEvents from '../components/LiveEvents';
import Controls from '../components/Controls';
import { useDashboard } from '../state/DashboardContext';

export default function Dashboard() {
  const { offline, selected } = useDashboard();

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />
      {offline && (
        <div className="border-b border-risk-high/30 bg-risk-high/10 px-4 py-1.5 text-center font-mono text-[11px] text-risk-high">
          Backend unreachable — set VITE_API_BASE_URL and ensure the FastAPI server is running.
        </div>
      )}
      <SatelliteSelector />
      <main className="mx-auto max-w-[1440px] space-y-4 p-4">
        <GlobeView />
        <motion.div
          key={selected}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <RiskBars />
            <RecommendationCards />
          </div>
          <ForecastChart />
          <div className="grid items-start gap-4 lg:grid-cols-[1fr_auto]">
            <LiveEvents />
            <Controls />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
