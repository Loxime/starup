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
  FormEvent,
  useEffect,
  useState
} from "react";

type Range = "24h" | "7d" | "30d";

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
  range: Range;
  currentValue: number | null;
  previousValue: number | null;
  delta: number | null;
  measurements: Measurement[];
};

type CreateMonitorForm = {
  name: string;
  url: string;
  sourceType: "html" | "json";
  selector: string;
  jsonPath: string;
  intervalSeconds: number;
};

const initialForm: CreateMonitorForm = {
  name: "",
  url: "",
  sourceType: "html",
  selector: "",
  jsonPath: "",
  intervalSeconds: 300
};

export function App() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [range, setRange] = useState<Range>("24h");

  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<CreateMonitorForm>(initialForm);
  const [creating, setCreating] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedMonitor =
    monitors.find((monitor) => monitor.id === selectedId) ?? null;

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setPageError(null);

    window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  }

  async function readApiError(
    response: Response,
    fallback: string
  ): Promise<string> {
    try {
      const body = await response.json() as {
        error?: string;
        message?: string;
      };

      return body.error ?? body.message ?? fallback;
    } catch {
      return fallback;
    }
  }

  async function loadMonitors(
    preferredId?: string | null
  ): Promise<Monitor[]> {
    const response = await fetch("/api/monitors");

    if (!response.ok) {
      throw new Error(
        await readApiError(
          response,
          "Impossible de charger les monitors."
        )
      );
    }

    const data = await response.json() as Monitor[];

    setMonitors(data);

    const wantedId = preferredId ?? selectedId;

    if (
      wantedId &&
      data.some((monitor) => monitor.id === wantedId)
    ) {
      setSelectedId(wantedId);
    } else if (data.length > 0) {
      setSelectedId(data[0].id);
    } else {
      setSelectedId(null);
      setHistory(null);
    }

    return data;
  }

  async function loadHistory(
    monitorId: string,
    selectedRange: Range
  ) {
    setLoadingHistory(true);

    try {
      const response = await fetch(
        `/api/monitors/${monitorId}/history?range=${selectedRange}`
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Impossible de charger l'historique."
          )
        );
      }

      const data = await response.json() as HistoryResponse;

      setHistory(data);
      setPageError(null);
    } catch (error) {
      setHistory(null);

      setPageError(
        error instanceof Error
          ? error.message
          : "Impossible de charger l'historique."
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      setLoadingMonitors(true);

      try {
        await loadMonitors();
      } catch (error) {
        setPageError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les monitors."
        );
      } finally {
        setLoadingMonitors(false);
      }
    }

    void initialize();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setHistory(null);
      return;
    }

    void loadHistory(selectedId, range);
  }, [selectedId, range]);

  async function handleCreateMonitor(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setCreating(true);
    setFormError(null);

    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim(),
        sourceType: form.sourceType,
        selector:
          form.sourceType === "html"
            ? form.selector.trim()
            : undefined,
        jsonPath:
          form.sourceType === "json"
            ? form.jsonPath.trim()
            : undefined,
        intervalSeconds: form.intervalSeconds
      };

      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Impossible de créer le monitor."
          )
        );
      }

      const created = await response.json() as Monitor;

      await loadMonitors(created.id);

      setForm(initialForm);
      setShowCreateForm(false);

      showSuccess(`Monitor "${created.name}" créé.`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Impossible de créer le monitor."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleMonitor(
    monitor: Monitor
  ) {
    setProcessingId(monitor.id);
    setPageError(null);

    try {
      const response = await fetch(
        `/api/monitors/${monitor.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            enabled: !monitor.enabled
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Impossible de modifier le monitor."
          )
        );
      }

      await loadMonitors(monitor.id);

      showSuccess(
        monitor.enabled
          ? `Monitor "${monitor.name}" mis en pause.`
          : `Monitor "${monitor.name}" repris.`
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Impossible de modifier le monitor."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDeleteMonitor(
    monitor: Monitor
  ) {
    const confirmed = window.confirm(
      `Supprimer définitivement le monitor "${monitor.name}" et toutes ses mesures ?`
    );

    if (!confirmed) {
      return;
    }

    setProcessingId(monitor.id);
    setPageError(null);

    try {
      const response = await fetch(
        `/api/monitors/${monitor.id}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            "Impossible de supprimer le monitor."
          )
        );
      }

      const remaining = monitors.filter(
        (item) => item.id !== monitor.id
      );

      const nextId =
        selectedId === monitor.id
          ? remaining[0]?.id ?? null
          : selectedId;

      await loadMonitors(nextId);

      showSuccess(`Monitor "${monitor.name}" supprimé.`);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer le monitor."
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>StarUp</h1>
          <p>HTTP metric monitor</p>
        </div>

        <div className="header-actions">
          <div className="status">
            {
              monitors.filter(
                (monitor) => monitor.enabled
              ).length
            } actifs
          </div>

          <button
            className="primary-button"
            onClick={() => {
              setFormError(null);
              setShowCreateForm(true);
            }}
          >
            + Ajouter un monitor
          </button>
        </div>
      </header>

      {pageError && (
        <div className="notification error">
          <span>{pageError}</span>

          <button
            onClick={() => setPageError(null)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="notification success">
          <span>{successMessage}</span>

          <button
            onClick={() => setSuccessMessage(null)}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      )}

      <main className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Monitors</h2>
            <span>{monitors.length}</span>
          </div>

          {loadingMonitors && (
            <p className="muted">
              Chargement des monitors...
            </p>
          )}

          {!loadingMonitors && monitors.length === 0 && (
            <p className="muted">
              Aucun monitor configuré.
            </p>
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

              <span
                className={
                  monitor.enabled
                    ? "monitor-meta enabled"
                    : "monitor-meta disabled"
                }
              >
                {monitor.enabled
                  ? "● actif"
                  : "○ en pause"}
              </span>
            </button>
          ))}
        </aside>

        <section className="content">
          {!loadingMonitors &&
            monitors.length === 0 && (
              <div className="empty-state">
                <h2>Aucun monitor</h2>

                <p>
                  Ajoute ton premier monitor pour commencer
                  à suivre une métrique.
                </p>

                <button
                  className="primary-button"
                  onClick={() => setShowCreateForm(true)}
                >
                  Ajouter un monitor
                </button>
              </div>
            )}

          {selectedMonitor && (
            <>
              <div className="monitor-toolbar">
                <div>
                  <h2>{selectedMonitor.name}</h2>

                  <a
                    href={selectedMonitor.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selectedMonitor.url}
                  </a>
                </div>

                <div className="monitor-actions">
                  <button
                    className="secondary-button"
                    disabled={
                      processingId === selectedMonitor.id
                    }
                    onClick={() =>
                      void handleToggleMonitor(
                        selectedMonitor
                      )
                    }
                  >
                    {selectedMonitor.enabled
                      ? "Mettre en pause"
                      : "Reprendre"}
                  </button>

                  <button
                    className="danger-button"
                    disabled={
                      processingId === selectedMonitor.id
                    }
                    onClick={() =>
                      void handleDeleteMonitor(
                        selectedMonitor
                      )
                    }
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="range-selector">
                {(["24h", "7d", "30d"] as Range[]).map(
                  (item) => (
                    <button
                      key={item}
                      className={
                        range === item
                          ? "range-button active"
                          : "range-button"
                      }
                      onClick={() => setRange(item)}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              {loadingHistory && (
                <div className="panel loading-panel">
                  Chargement des mesures...
                </div>
              )}

              {!loadingHistory && history && (
                <>
                  <div className="cards">
                    <div className="card">
                      <span>Valeur actuelle</span>
                      <strong>
                        {history.currentValue ?? "—"}
                      </strong>
                    </div>

                    <div className="card">
                      <span>Delta dernier check</span>

                      <strong>
                        {history.delta === null
                          ? "—"
                          : history.delta >= 0
                            ? `+${history.delta}`
                            : history.delta}
                      </strong>
                    </div>

                    <div className="card">
                      <span>Mesures {range}</span>

                      <strong>
                        {history.measurements.length}
                      </strong>
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <div>
                        <h2>Évolution</h2>

                        <p>
                          Historique des valeurs sur {range}.
                        </p>
                      </div>
                    </div>

                    {history.measurements.length === 0 ? (
                      <div className="no-data">
                        Aucune mesure disponible sur cette période.
                      </div>
                    ) : (
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
                              tickFormatter={(
                                value: string
                              ) =>
                                new Date(
                                  value
                                ).toLocaleString(
                                  "fr-FR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
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
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>

      {showCreateForm && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Ajouter un monitor</h2>

                <p>
                  StarUp commencera le suivi à partir de
                  maintenant.
                </p>
              </div>

              <button
                className="icon-button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormError(null);
                }}
              >
                ×
              </button>
            </div>

            <form
              className="monitor-form"
              onSubmit={handleCreateMonitor}
            >
              <label>
                Nom

                <input
                  type="text"
                  required
                  placeholder="Article Docker"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value
                    })
                  }
                />
              </label>

              <label>
                URL

                <input
                  type="url"
                  required
                  placeholder="https://example.com/article"
                  value={form.url}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      url: event.target.value
                    })
                  }
                />
              </label>

              <label>
                Type de source

                <select
                  value={form.sourceType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sourceType:
                        event.target.value as
                          | "html"
                          | "json"
                    })
                  }
                >
                  <option value="html">
                    HTML
                  </option>

                  <option value="json">
                    JSON
                  </option>
                </select>
              </label>

              {form.sourceType === "html" && (
                <label>
                  Sélecteur CSS

                  <input
                    type="text"
                    required
                    placeholder=".like-count"
                    value={form.selector}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        selector: event.target.value
                      })
                    }
                  />
                </label>
              )}

              {form.sourceType === "json" && (
                <label>
                  JSON path

                  <input
                    type="text"
                    required
                    placeholder="data.likes"
                    value={form.jsonPath}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        jsonPath: event.target.value
                      })
                    }
                  />
                </label>
              )}

              <label>
                Intervalle en secondes

                <input
                  type="number"
                  min="10"
                  step="1"
                  required
                  value={form.intervalSeconds}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      intervalSeconds:
                        Number(event.target.value)
                    })
                  }
                />
              </label>

              {formError && (
                <div className="form-error">
                  {formError}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormError(null);
                  }}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating
                    ? "Création..."
                    : "Créer le monitor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
