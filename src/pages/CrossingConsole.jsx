import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
} from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Clock3,
  History,
  Info,
  X,
  ExternalLink,
  LocateFixed,
  Minus,
  Plus,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { dataService } from "@/components/utils/dataService";
import { subscribeToBorderData } from "@/lib/liveDataSubscription";
import { normalizeLane, withLane } from "@/lib/laneContext";
import { fetchLabel, FRESHNESS } from "@/lib/trustState";
import { usePersistentLanguage } from "@/lib/useLanguage";
import { updatePageMeta, resetPageMeta } from "@/lib/seo";
import {
  CONSOLE_CANONICAL,
  CONSOLE_PORTS,
  CONSOLE_TIMEZONE,
  currentConsoleRows,
  currentConsoleTrust,
  parseExtraDrive,
  detourMath,
  selectConsoleHistory,
  replayConsoleRows,
  separationKm,
  projectConsolePoint,
} from "@/lib/crossingConsole";
import { COPY } from "@/components/corridor/copy";
import Geography from "@/components/corridor/Geography";
import geography from "@/components/corridor/geography.json";
import "@/components/corridor/CrossingConsole.css";

// The installed motion hook snapshots its initial preference. Subscribe here
// so switching the OS setting also removes spatial/width motion while open.
const motionPreference = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true;
function subscribeMotionPreference(listener) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const compactMapQuery = "(max-width: 700px)";
const compactMapPreference = () =>
  globalThis.matchMedia?.(compactMapQuery).matches ?? false;
function subscribeCompactMap(listener) {
  const query = window.matchMedia(compactMapQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

const LANES = [
  ["passenger_standard", "standard"],
  ["passenger_ready", "ready"],
  ["passenger_sentri", "sentri"],
  ["pedestrian_standard", "pedestrian"],
];
const validStamp = (value) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
function stamp(value, language, kind = "clock") {
  if (!validStamp(value)) return "—";
  return new Intl.DateTimeFormat(
    language === "es" ? "es-MX" : "en-US",
    kind === "date"
      ? {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: CONSOLE_TIMEZONE,
        }
      : {
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
          timeZone: CONSOLE_TIMEZONE,
        },
  ).format(new Date(value));
}

export default function CrossingConsole() {
  const language = usePersistentLanguage(),
    copy = COPY[language] || COPY.en;
  const [searchParams, setSearchParams] = useSearchParams();
  const lane = normalizeLane(searchParams.get("lane"));
  const [data, setData] = useState({
    crossings: [],
    timestamp: null,
    success: false,
    fromFallback: false,
  });
  const [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(false),
    [now, setNow] = useState(Date.now());
  const [history, setHistory] = useState({ status: "idle", snapshots: [] });
  const [replay, setReplay] = useState(false),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false);
  const [extra, setExtra] = useState("20"),
    [selected, setSelected] = useState(null),
    [sources, setSources] = useState(false);
  const closeRef = useRef(),
    portRefs = useRef({}),
    sourcesRef = useRef(),
    sourcesButton = useRef();
  const historyRequest = useRef(null),
    alive = useRef(true),
    reduced = useSyncExternalStore(
      subscribeMotionPreference,
      motionPreference,
      () => true,
    );
  const compactMap = useSyncExternalStore(
    subscribeCompactMap,
    compactMapPreference,
    () => false,
  );
  const portPosition = (port) => {
    const { x, y } = projectConsolePoint(port.lng, port.lat, compactMap);
    return { "--port-x": `${x}%`, "--port-y": `${y}%` };
  };
  useEffect(() => {
    alive.current = true;
    const unsubscribe = subscribeToBorderData((value) => {
      setData(value);
      setLoading(false);
      setRefreshing(false);
      setNow(Date.now());
    });
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      alive.current = false;
      unsubscribe();
      clearInterval(interval);
      historyRequest.current?.abort();
    };
  }, []);
  useEffect(() => {
    const title =
      language === "es"
        ? "San Ysidro y Otay Mesa: corredor de cruces | Border Pulse"
        : "San Ysidro & Otay Mesa crossing console | Border Pulse";
    updatePageMeta({
      title,
      description: copy.intro,
      canonical: CONSOLE_CANONICAL,
      ogUrl: CONSOLE_CANONICAL,
      lang: language,
    });
    return () => resetPageMeta();
  }, [language, copy.intro]);
  function closeDetail() {
    const previous = selected;
    setSelected(null);
    requestAnimationFrame(() => {
      if (alive.current) portRefs.current[previous]?.focus();
    });
  }
  useEffect(() => {
    if (selected) closeRef.current?.focus();
  }, [selected]);
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && selected && !sourcesRef.current?.open) {
        event.preventDefault();
        closeDetail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);
  useEffect(() => {
    if (sources) sourcesRef.current?.showModal();
    else if (sourcesRef.current?.open) sourcesRef.current.close();
  }, [sources]);
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(
      () =>
        setIndex((value) => Math.min(value + 1, history.snapshots.length - 1)),
      1600,
    );
    return () => clearInterval(timer);
  }, [playing, history.snapshots.length]);
  useEffect(() => {
    if (playing && index >= history.snapshots.length - 1) setPlaying(false);
  }, [index, playing, history.snapshots.length]);
  async function loadHistory() {
    if (historyRequest.current) return;
    const controller = new AbortController();
    historyRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 12_000);
    setHistory({ status: "loading", snapshots: [] });
    setPlaying(false);
    try {
      const response = await fetch("/data/snapshot-history.json", {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("History unavailable");
      const snapshots = selectConsoleHistory(await response.json(), Date.now());
      if (!alive.current) return;
      setHistory({ status: snapshots.length ? "ready" : "empty", snapshots });
      setIndex(
        Math.max(
          0,
          snapshots.findIndex((snapshot) =>
            snapshot.crossings.every((row) => row.current_wait_time !== null),
          ),
        ),
      );
    } catch {
      if (alive.current) setHistory({ status: "error", snapshots: [] });
    } finally {
      clearTimeout(timeout);
      if (historyRequest.current === controller) historyRequest.current = null;
    }
  }
  function changeLane(key) {
    setPlaying(false);
    const next = new URLSearchParams(searchParams);
    if (key === "passenger_standard") next.delete("lane");
    else next.set("lane", key);
    setSearchParams(next);
  }
  function enterReplay() {
    setReplay(true);
    if (["idle", "error", "empty"].includes(history.status)) loadHistory();
  }
  const historyReady = history.status === "ready",
    snapshots = history.snapshots;
  const timestamp = replay ? snapshots[index]?.fetched_at : data.timestamp;
  const rows = replay
    ? replayConsoleRows(snapshots, index, lane)
    : currentConsoleRows(data.crossings, lane, data.timestamp, now);
  const trust = currentConsoleTrust(data, now),
    drive = parseExtraDrive(extra),
    pedestrian = lane === "pedestrian_standard";
  const math =
    !pedestrian &&
    (replay ? historyReady && lane === "passenger_standard" : trust.usable)
      ? detourMath(rows[0].wait, rows[1].wait, drive)
      : null;
  const active = rows.find((port) => port.id === selected),
    laneName = copy[LANES.find(([key]) => key === lane)[1]];
  const currentProblem = loading
    ? copy.pending
    : !data.success
      ? copy.failed
      : data.fromFallback
        ? copy.fallback
        : trust.state === FRESHNESS.UNKNOWN
          ? copy.unknown
          : trust.state === FRESHNESS.STALE
            ? copy.stale
            : null;
  const unavailableReason =
    drive === null
      ? copy.invalidDrive
      : pedestrian
        ? copy.walkMath
        : replay
          ? !historyReady
            ? copy[
                history.status === "error"
                  ? "historyError"
                  : history.status === "empty"
                    ? "historyEmpty"
                    : "archiveLoading"
              ]
            : copy.needBoth
          : !trust.usable
            ? !data.success || data.fromFallback
              ? copy.fallbackMath
              : copy.trustMath
            : copy.needBoth;
  const historySource = snapshots[index]?.source?.match(
    /^commit:([a-f0-9]{40})$/,
  )?.[1];
  const guide =
    language === "es"
      ? "san-ysidro-vs-otay-cual-es-mas-rapida"
      : "san-ysidro-vs-otay-mesa";

  return (
    <MotionConfig
      reducedMotion={reduced ? "always" : "never"}
      transition={{ type: "spring", stiffness: 330, damping: 34, mass: 0.85 }}
    >
      <LayoutGroup id="crossing-console">
        <div className="corridorConsole">
          <div className="app">
            <nav className="nav" aria-label={copy.label}>
              <Link
                to={withLane("/?area=san-diego-tijuana", lane)}
                className="console-back"
              >
                <ArrowLeft size={17} />
                {copy.back}
              </Link>
              <span className="nav-context">SAN DIEGO / TIJUANA</span>
              <button
                className="text-button sources-button"
                ref={sourcesButton}
                onClick={() => setSources(true)}
              >
                {copy.sources}
                <ArrowUpRight size={15} />
              </button>
            </nav>
            <div className="prototype-notice">
              <strong>{copy.label}</strong>
              <span>{copy.notice}</span>
            </div>
            <section className="intro">
              <div>
                <p className="eyebrow">
                  <span className="short-rule" />
                  {copy.eyebrow}
                </p>
                <h1>
                  {copy.title}
                  <br />
                  <span>{copy.titleAccent}</span>
                </h1>
              </div>
              <div className="intro-right">
                <p>{copy.intro}</p>
                <a href="#corridor-map" className="intro-link">
                  {copy.explore}
                  <ArrowUpRight size={18} />
                </a>
              </div>
            </section>
            <section
              id="corridor-map"
              tabIndex={-1}
              aria-label="San Diego–Tijuana"
            >
              <div className="console-toolbar">
                <div className="corridor-title">
                  <ArrowUp size={16} />
                  <div>
                    <h2>San Diego–Tijuana</h2>
                    <span>{copy.northbound}</span>
                  </div>
                </div>
                <div
                  className="lane-group"
                  role="group"
                  aria-label={copy.laneGroup}
                >
                  {LANES.map(([key, label]) => (
                    <button
                      key={key}
                      aria-pressed={lane === key}
                      onClick={() => changeLane(key)}
                      className={lane === key ? "selected" : ""}
                    >
                      {lane === key && (
                        <motion.span
                          layoutId="console-lane-indicator"
                          className="lane-indicator"
                        />
                      )}
                      <span>{copy[label]}</span>
                    </button>
                  ))}
                </div>
              </div>
              {!replay && (
                <div className="retrieval-status">
                  <p role={currentProblem ? "status" : undefined}>
                    {loading
                      ? copy.loading
                      : fetchLabel(trust.state, trust.age, language)}
                    {currentProblem && <span>{currentProblem}</span>}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setRefreshing(true);
                      dataService.getBorderData();
                    }}
                    disabled={refreshing || loading}
                  >
                    <RefreshCw size={14} />
                    {refreshing ? copy.refreshing : copy.refresh}
                  </button>
                </div>
              )}
              <div
                className={`map-stage ${selected ? "detail-open" : ""} ${replay ? "replaying" : ""}`}
              >
                <Geography
                  geo={geography}
                  label={copy.mapLabel}
                  compact={compactMap}
                />
                <div className="map-tint" />
                <div className="map-heading">
                  <p className="eyebrow">
                    {replay ? copy.historical : copy.current}
                  </p>
                  <p>
                    {validStamp(timestamp) ? (
                      <>
                        {stamp(timestamp, language, "date")} <span>/</span>{" "}
                        {stamp(timestamp, language)}
                      </>
                    ) : replay && history.status === "loading" ? (
                      copy.archiveLoading
                    ) : (
                      copy.missingTime
                    )}
                  </p>
                </div>
                <div className="map-compass">
                  <ArrowUp size={22} />
                  <span>N</span>
                </div>
                <div className="map-country usa">
                  {language === "es" ? "ESTADOS UNIDOS" : "UNITED STATES"}
                  <span>San Diego</span>
                </div>
                <div className="map-country mexico">
                  MÉXICO<span>Tijuana</span>
                </div>
                <div className="ocean">
                  {copy.ocean[0]}
                  <br />
                  {copy.ocean[1]}
                </div>
                <div className="border-label">{copy.border}</div>
                {CONSOLE_PORTS.map((port, i) => (
                  <div
                    key={port.id}
                    className={`port-position ${i ? "otay" : "sy"}`}
                    style={portPosition(port)}
                  >
                    <PortDot />
                    <span className="port-coordinate">
                      {port.lat.toFixed(4)}° N
                    </span>
                  </div>
                ))}
                {rows.map((port, i) => (
                  <div
                    key={port.id}
                    className={`wait-position ${i ? "otay" : "sy"}`}
                    style={portPosition(port)}
                  >
                    <AnimatePresence initial={false}>
                      {selected !== port.id && (
                        <motion.button
                          layoutId={`console-port-${port.id}`}
                          ref={(element) => {
                            portRefs.current[port.id] = element;
                          }}
                          key={`node-${port.id}`}
                          onClick={() => setSelected(port.id)}
                          className="port-node"
                          aria-label={`${port.name}, ${port.wait === null ? copy[port.reason] : `${port.wait} min`}, ${copy.openDetails}`}
                          style={{ "--port-color": port.color }}
                          transition={reduced ? { duration: 0 } : undefined}
                        >
                          <motion.div layout="position" className="node-title">
                            <span>{port.name}</span>
                            <ArrowUpRight size={19} />
                          </motion.div>
                          <motion.div layout="position" className="wait-number">
                            <span>{port.wait ?? "—"}</span>
                            {port.wait !== null && <small>MIN</small>}
                          </motion.div>
                          <motion.div layout="position" className="node-report">
                            {port.wait === null ? (
                              <span className="missing">
                                {copy[port.reason]}
                              </span>
                            ) : (
                              <>
                                <Clock3 size={12} />
                                {replay
                                  ? copy.savedHistory
                                  : port.report || copy.notSupplied}
                              </>
                            )}
                          </motion.div>
                          <span className="node-hint">
                            {copy.inspect}
                            <ChevronRight size={12} />
                          </span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.aside
                      role="region"
                      aria-label={`${active.name} ${copy.reportDetails}`}
                      layoutId={`console-port-${active.id}`}
                      key={`detail-${active.id}`}
                      className={`port-detail ${active.id === "250401" ? "west-detail" : ""}`}
                      style={{ "--port-color": active.color }}
                      transition={reduced ? { duration: 0 } : undefined}
                    >
                      <div className="detail-top">
                        <span className="eyebrow">
                          {copy.snapshot} / {active.id}
                        </span>
                        <button
                          className="icon-button"
                          ref={closeRef}
                          onClick={closeDetail}
                          aria-label={copy.closeDetails}
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <motion.div layout="position" className="node-title">
                        <span>{active.name}</span>
                      </motion.div>
                      <p className="detail-lane">{laneName}</p>
                      <motion.div layout="position" className="wait-number">
                        <span>{active.wait ?? "—"}</span>
                        {active.wait !== null && <small>MIN</small>}
                      </motion.div>
                      <p className="detail-status">
                        {active.reason
                          ? copy[active.reason]
                          : replay
                            ? copy.fixedArchive
                            : copy.reportedWait}
                      </p>
                      <div className="detail-facts">
                        <div>
                          <span>{copy.reportClock}</span>
                          <strong>
                            {replay
                              ? copy.notRetained
                              : active.report || copy.notSupplied}
                          </strong>
                        </div>
                        <div>
                          <span>{copy.retrieved}</span>
                          <strong>
                            {stamp(timestamp, language)}
                            <small>{stamp(timestamp, language, "date")}</small>
                          </strong>
                        </div>
                        <div>
                          <span>{copy.laneCount}</span>
                          <strong>{active.open ?? copy.notRetained}</strong>
                        </div>
                      </div>
                      <p className="detail-disclaimer">
                        {replay ? copy.detailHistory : copy.detailCurrent}
                      </p>
                      <Link
                        className="detail-source"
                        to={withLane(`/crossing/${active.slug}/`, lane)}
                      >
                        {copy.crossingPage}
                        <ArrowUpRight size={15} />
                      </Link>
                    </motion.aside>
                  )}
                </AnimatePresence>
                <div className="map-bottom">
                  <span>
                    <LocateFixed size={13} />
                    {separationKm().toFixed(1)} {copy.straight}
                  </span>
                  <span>{copy.geographic}</span>
                </div>
              </div>
              <div className="replay-console">
                <div className="replay-top">
                  <div className="replay-title">
                    <History size={18} />
                    <div>
                      <h3>
                        {copy.dayReplay}
                        {historyReady &&
                          ` · ${stamp(snapshots[0].fetched_at, language, "date")}`}
                      </h3>
                      <p>{replay ? copy.historical : copy.archive}</p>
                    </div>
                  </div>
                  <div
                    className="mode-switch"
                    role="group"
                    aria-label={copy.archive}
                  >
                    <button
                      aria-pressed={!replay}
                      className={!replay ? "selected" : ""}
                      onClick={() => {
                        setReplay(false);
                        setPlaying(false);
                      }}
                    >
                      {copy.currentMode}
                    </button>
                    <button
                      aria-pressed={replay}
                      className={replay ? "selected" : ""}
                      onClick={enterReplay}
                    >
                      {copy.replayMode}
                    </button>
                  </div>
                </div>
                {replay && !historyReady ? (
                  <div className="history-status" role="status">
                    <p>
                      {history.status === "error"
                        ? copy.historyError
                        : history.status === "empty"
                          ? copy.historyEmpty
                          : copy.archiveLoading}
                    </p>
                    {["error", "empty"].includes(history.status) && (
                      <button className="text-button" onClick={loadHistory}>
                        {copy.retry}
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </div>
                ) : !historyReady ? (
                  <p className="history-hint">{copy.historyHint}</p>
                ) : (
                  <>
                    <div className="timeline-area">
                      <button
                        className="play-button"
                        disabled={!replay || lane !== "passenger_standard"}
                        onClick={() => {
                          if (!playing && index === snapshots.length - 1)
                            setIndex(0);
                          setPlaying(!playing);
                        }}
                        aria-label={playing ? copy.pause : copy.play}
                      >
                        {playing ? <Pause size={17} /> : <Play size={17} />}
                      </button>
                      <div className="timeline">
                        <div className="timeline-chart" aria-hidden="true">
                          <HistoryDots
                            snapshots={snapshots}
                            index={replay ? index : -1}
                          />
                        </div>
                        <input
                          type="range"
                          disabled={!replay}
                          aria-label={copy.scrub}
                          aria-valuetext={`${stamp(timestamp, language, "date")}, ${stamp(timestamp, language)} · ${copy.historical}`}
                          min="0"
                          max={snapshots.length - 1}
                          value={replay ? index : snapshots.length - 1}
                          onChange={(event) => {
                            setPlaying(false);
                            setIndex(Number(event.target.value));
                          }}
                        />
                        <div className="timeline-labels">
                          <span>
                            {stamp(snapshots[0].fetched_at, language)}
                          </span>
                          <span className="timeline-middle">
                            {snapshots.length} {copy.observations}
                          </span>
                          <span>
                            {stamp(snapshots.at(-1).fetched_at, language)}
                          </span>
                        </div>
                      </div>
                      <div className="replay-readout">
                        <strong>{stamp(timestamp, language)}</strong>
                        <span>{copy.retrieved}</span>
                      </div>
                    </div>
                    <div className="replay-footnote">
                      <span>
                        <span className="legend-dot sand" />
                        San Ysidro
                        <span className="legend-dot mint" />
                        Otay Mesa
                      </span>
                      <p>
                        {replay && lane !== "passenger_standard"
                          ? copy.otherLaneReplay
                          : `${copy.standardOnly} ${copy.sampleOrder}`}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <section className="detour">
                <div className="detour-input">
                  <p className="eyebrow">{copy.extraEyebrow}</p>
                  <h2>
                    {copy.detourTitle}
                    <br />
                    {copy.detourTitle2}
                  </h2>
                  <label htmlFor="corridor-extra-drive">
                    {copy.extraLabel}
                  </label>
                  <div
                    className={`drive-field ${drive === null ? "invalid" : ""}`}
                  >
                    <button
                      aria-label={copy.decrease}
                      disabled={pedestrian || drive === null || drive === 0}
                      onClick={() => setExtra(String(Math.max(0, drive - 5)))}
                    >
                      <Minus size={17} />
                    </button>
                    <div>
                      <input
                        id="corridor-extra-drive"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        disabled={pedestrian}
                        value={extra}
                        onChange={(event) => setExtra(event.target.value)}
                        aria-invalid={drive === null}
                        aria-describedby="corridor-drive-help"
                      />
                      <span>min</span>
                    </div>
                    <button
                      aria-label={copy.increase}
                      disabled={pedestrian || drive === null || drive >= 180}
                      onClick={() => setExtra(String(Math.min(180, drive + 5)))}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  <p id="corridor-drive-help">
                    {pedestrian
                      ? copy.walkMath
                      : drive === null
                        ? copy.invalidDrive
                        : copy.driveHelp}
                  </p>
                </div>
                <div
                  className="detour-result"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {math ? (
                    <>
                      <div className="result-context">
                        <span className="eyebrow">
                          {replay
                            ? copy.historicScenario
                            : copy.snapshotScenario}
                        </span>
                        <span>
                          {laneName}
                          <span className="context-dot" />
                          {stamp(timestamp, language)}
                        </span>
                      </div>
                      <div className="result-head">
                        <span
                          className={`result-number ${math.net > 0 ? "saves" : ""}`}
                        >
                          {Math.abs(math.net)}
                        </span>
                        <div>
                          <strong>
                            {math.net > 0
                              ? copy.less
                              : math.net < 0
                                ? copy.more
                                : copy.tie}
                          </strong>
                          <p>{math.net ? copy.via : copy.equalOptions}</p>
                        </div>
                      </div>
                      <div className="comparison-bars">
                        <ComparisonRow
                          name="San Ysidro"
                          value={rows[0].wait}
                          wait={rows[0].wait}
                          max={Math.max(rows[0].wait, math.viaOtay, 1)}
                          color="sand"
                          copy={copy}
                          reduced={reduced}
                        />
                        <ComparisonRow
                          name="Otay Mesa"
                          value={math.viaOtay}
                          wait={rows[1].wait}
                          drive={drive}
                          max={Math.max(rows[0].wait, math.viaOtay, 1)}
                          color="mint"
                          copy={copy}
                          reduced={reduced}
                        />
                      </div>
                      <p className="break-even">
                        <Info size={16} />
                        {math.difference > 0 ? (
                          <span>
                            {copy.advantage}{" "}
                            <strong>{math.difference} min</strong>.{" "}
                            {copy.breakEven}{" "}
                            <strong>{math.breakEven} min</strong>.
                          </span>
                        ) : math.difference === 0 ? (
                          copy.equalWaits
                        ) : (
                          copy.alreadyLonger
                        )}
                      </p>
                      <p className="result-limits">{copy.limits}</p>
                    </>
                  ) : (
                    <div className="unavailable-result">
                      <Info size={28} />
                      <h3>
                        {drive === null ? copy.addDrive : copy.unavailable}
                      </h3>
                      <p>{unavailableReason}</p>
                    </div>
                  )}
                </div>
              </section>
              <section className="field-notes">
                <div>
                  <p className="eyebrow">{copy.before}</p>
                  <h2>{copy.clocksTitle}</h2>
                  <p>{copy.clocks}</p>
                </div>
                <Link to={`/blog/${guide}/`}>
                  <span>{copy.fieldNote}</span>
                  <h3>
                    {copy.guideTitle}
                    <br />
                    {copy.guideTitle2}
                  </h3>
                  <span className="note-link">
                    {copy.guideLink}
                    <ArrowUpRight size={18} />
                  </span>
                </Link>
                <a
                  href="https://bwt.cbp.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{copy.official}</span>
                  <h3>
                    {copy.cbpTitle}
                    <br />
                    {copy.cbpTitle2}
                  </h3>
                  <span className="note-link">
                    {copy.cbpLink}
                    <ArrowUpRight size={18} />
                  </span>
                </a>
              </section>
            </section>
            <dialog
              ref={sourcesRef}
              aria-labelledby="corridor-sources-title"
              onCancel={() => setSources(false)}
              onClose={() => {
                setSources(false);
                sourcesButton.current?.focus();
              }}
              className="sources-dialog"
            >
              <div className="sources-heading">
                <p className="eyebrow">{copy.sourceEyebrow}</p>
                <button
                  onClick={() => setSources(false)}
                  aria-label={copy.closeSources}
                  className="icon-button"
                >
                  <X size={22} />
                </button>
              </div>
              <h2 id="corridor-sources-title">{copy.sourceTitle}</h2>
              <p>{copy.sourceIntro}</p>
              <dl>
                <dt>{copy.retrieved}</dt>
                <dd>
                  {stamp(timestamp, language, "date")},{" "}
                  {stamp(timestamp, language)}
                  <code>
                    {validStamp(timestamp) ? timestamp : copy.missingTime}
                  </code>
                </dd>
                <dt>{copy.reportClock}</dt>
                <dd>{copy.sourceClock}</dd>
                <dt>{copy.archive}</dt>
                <dd>
                  {copy.historyEvidence} {copy.sourceVersion} {copy.zone}
                </dd>
              </dl>
              <div className="source-links">
                <a
                  href="/data/crossings.json"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.sourceData}
                  <ExternalLink size={14} />
                </a>
                <a
                  href="/data/snapshot-history.json"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.sourceHistory}
                  <ExternalLink size={14} />
                </a>
                {replay && historySource && (
                  <a
                    href={`https://github.com/sbc1-code/borderpulse/commit/${historySource}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.sourceCommit}
                    <ExternalLink size={14} />
                  </a>
                )}
                <Link
                  to={language === "es" ? "/metodologia/" : "/methodology/"}
                >
                  {copy.methodology}
                  <ArrowUpRight size={14} />
                </Link>
                <a
                  href="https://www.cbp.gov/travel/clearing-customs/ready-lanes"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.readyEligibility}
                  <ExternalLink size={14} />
                </a>
                <a
                  href="https://www.cbp.gov/travel/trusted-traveler-programs/sentri"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {copy.sentriEligibility}
                  <ExternalLink size={14} />
                </a>
              </div>
              <p className="source-credit">
                {copy.geographyCredit}{" "}
                <a
                  href="https://github.com/datasets/geo-countries"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  geo-countries
                </a>
                . {copy.portCoordinates}:{" "}
                <a
                  href="https://en.wikipedia.org/wiki/San_Ysidro_Port_of_Entry"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  San Ysidro
                </a>
                ,{" "}
                <a
                  href="https://en.wikipedia.org/wiki/Otay_Mesa_Port_of_Entry"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Otay Mesa
                </a>
                .
              </p>
              <button
                className="sources-done"
                onClick={() => setSources(false)}
              >
                {copy.done}
                <ArrowRight size={17} />
              </button>
            </dialog>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
function PortDot() {
  return (
    <span className="port-dot">
      <span />
    </span>
  );
}
function HistoryDots({ snapshots, index }) {
  const values = snapshots
    .flatMap((snapshot) =>
      snapshot.crossings.map((row) => row.current_wait_time),
    )
    .filter((value) => Number.isFinite(value));
  const max = Math.max(1, ...values);
  return (
    <svg viewBox="0 0 1000 48" preserveAspectRatio="none">
      {CONSOLE_PORTS.map((port, j) => (
        <g key={port.id}>
          {snapshots.map((snapshot, i) => {
            const value = snapshot.crossings.find(
              (row) => row.port_number === port.id,
            )?.current_wait_time;
            return Number.isFinite(value) ? (
              <circle
                key={i}
                cx={(i / Math.max(1, snapshots.length - 1)) * 1000}
                cy={46 - (value / max) * 40}
                r={index === i ? 3 : 1.7}
                fill={j ? "#b5d5c4" : "#e7bd8e"}
              />
            ) : null;
          })}
        </g>
      ))}
    </svg>
  );
}
function ComparisonRow({
  name,
  value,
  wait,
  drive = 0,
  max,
  color,
  copy,
  reduced,
}) {
  return (
    <div className={`comparison-row ${color}`}>
      <div>
        <span>{name}</span>
        <strong>{value} min</strong>
      </div>
      <div className="bar-track">
        <motion.div
          className="wait-bar"
          transition={reduced ? { duration: 0 } : undefined}
          animate={{ width: `${(wait / max) * 100}%` }}
        />
        <motion.div
          className="drive-bar"
          transition={reduced ? { duration: 0 } : undefined}
          animate={{ width: `${(drive / max) * 100}%` }}
        />
      </div>
      <small>
        {wait} {copy.wait}
        {drive > 0 ? ` + ${drive} ${copy.extraDrive}` : ""}
      </small>
    </div>
  );
}
