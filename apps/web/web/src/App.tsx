import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  useEffect,
  useState
} from "react";

type Monitor = {
  id: string;
  name: string;
  url: string;
  sourceType: "json" | "html";
  selector: string | null;
  jsonPath: string | null;
  intervalSeconds: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Measurement = {
  id: string;
  monitorId: string;
  value: number;
  measuredAt: string;
};

type HistoryResponse = {
  monitor: {
    id: string;
    name: string;
  };
  range: string;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  measurements: Measurement[];
};

export function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMonitors() {
      const response = await fetch("/api/monitors");
      const data = await response.json() as Monitor[];

      setMonitors(data);

      if (data.length > 0) {
        setSelectedId(data[0].id);
      }

      setLoading(false);
    }

    void loadMonitors();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    async function loadHistory() {
      const response = await fetch(
        `/api/monitors/${selectedId}/history?range=24h`
      );

      const data = await response.json() as HistoryResponse;

      setHistory(data);
    }

    void loadHistory();
  }, [selectedId]);

  if (loading) {
    return (
      <div className="page">
        Chargement...
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>StarUp</h1>
          <p>HTTP metric monitor</p>
        </div>

        <div className="status">
          {monitors.filter((monitor) => monitor.enabled).length}
          {" "}
          actifs
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <h2>Monitors</h2>

          {monitors.length === 0 && (
            <p>Aucun monitor configuré.</p>
          )}

          {monitors.map((monitor) => (
            <button
              key={monitor.id}
              className={
                selectedId === monitor.id
                  ? "monitor active"
                  : "monitor"
              }
              onClick={() => setSelectedId(monitor.id)}
            >
              <span className="monitor-name">
                {monitor.name}
              </span>

              <span className="monitor-meta">
                {monitor.enabled ? "● actif" : "○ désactivé"}
              </span>
            </button>
          ))}
        </aside>

        <section className="content">
          {history && (
            <>
              <div className="cards">
                <div className="card">
                  <span>Valeur actuelle</span>
                  <strong>
                    {history.currentValue ?? "—"}
                  </strong>
                </div>

                <div className="card">
                  <span>Delta</span>
                  <strong>
                    {history.delta === null
                      ? "—"
                      : history.delta >= 0
                        ? `+${history.delta}`
                        : history.delta}
                  </strong>
                </div>

                <div className="card">
                  <span>Mesures 24h</span>
                  <strong>
                    {history.measurements.length}
                  </strong>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>{history.monitor.name}</h2>
                    <p>Évolution sur les dernières 24 heures</p>
                  </div>
                </div>

                <div className="chart">
                  <ResponsiveContainer
                    width="100%"
                    height={360}
                  >
                    <LineChart
                      data={history.measurements}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="measuredAt"
                        tickFormatter={(value: string) =>
                          new Date(value).toLocaleTimeString(
                            "fr-FR",
                            {
                              hour: "2-digit",
                              minute: "2-digit"
                            }
                          )
                        }
                      />

                      <YAxis
                        domain={[
                          "dataMin - 1",
                          "dataMax + 1"
                        ]}
                      />

                      <Tooltip
                        labelFormatter={(value) =>
                          new Date(
                            String(value)
                          ).toLocaleString("fr-FR")
                        }
                      />

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="currentColor"
                        strokeWidth={2}
                        dot
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
