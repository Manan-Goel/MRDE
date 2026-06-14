import { motion } from 'framer-motion';
import Header from '../components/Header';
import SatelliteSelector from '../components/SatelliteSelector';
import Controls from '../components/Controls';
import PriorityRisks from '../components/PriorityRisks';
import RecommendationList from '../components/RecommendationList';
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

      {/* Controls bar */}
      <div className="border-b border-line bg-bg-secondary/50 px-4 py-2">
        <Controls />
      </div>

      <main className="mx-auto max-w-6xl p-6">
        <motion.div
          key={selected}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <PriorityRisks />
            <RecommendationList />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
