import { useEffect, useState } from "react";

import { fetchSolution } from "./api/client";
import { Dashboard } from "./components/Dashboard";
import { TruckViewer } from "./components/TruckViewer";
import type { PackingPlan } from "./types";

const DEFAULT_TRUCK = { W: 2400, L: 13600, H: 2440 };

function App() {
  const [plan, setPlan] = useState<PackingPlan | null>(null);

  useEffect(() => {
    fetchSolution({
      items: [],
      truck: { ...DEFAULT_TRUCK, payload_kg: 3000 },
      stops: [],
    })
      .then(setPlan)
      .catch((err) => {
        console.error("fetchSolution failed", err);
      });
  }, []);

  return (
    <div className="h-screen grid grid-cols-[340px_1fr] bg-gray-950 text-gray-100">
      <aside className="border-r border-gray-800 p-4 overflow-y-auto">
        <h1 className="text-lg font-semibold mb-2">FLOW-3D</h1>
        <p className="text-xs text-gray-400 mb-4">
          Manifest form — placeholder
        </p>
        <div className="p-3 rounded border border-dashed border-gray-700 text-xs text-gray-500">
          ManifestForm goes here.
        </div>
      </aside>

      <main className="grid grid-rows-[1fr_auto]">
        <section className="relative">
          {plan ? (
            <TruckViewer plan={plan} truck={DEFAULT_TRUCK} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading packing plan…
            </div>
          )}
        </section>
        {plan && <Dashboard plan={plan} />}
      </main>
    </div>
  );
}

export default App;
