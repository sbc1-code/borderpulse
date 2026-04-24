// Thresholds for Mode A anomaly detection. Tune these before tuning the prompt.
// Conservative defaults to avoid false positives while the pipeline is young.

export const ANOMALY_CONFIG = {
  // A (day, hour) cell counts as "meaningful" only if it has at least this many samples.
  // v1 default is 1 because the CBP fetch has only accumulated ~30 days of history so most
  // (day, hour) cells have 1 to 2 samples. Bump this to 3 once the archive is >= 90 days old.
  minSamplesPerCell: 1,

  // Only consider the top-N busiest POEs for automation. Small ports produce noisy anomalies.
  // Port numbers verified against public/data/crossings.json on 2026-04-23.
  topPortNumbers: [
    '250401', // San Ysidro
    '250601', // Otay Mesa
    '250501', // Tecate
    '250301', // Calexico East
    '250302', // Calexico West
    '260401', // Nogales DeConcini
    '260402', // Nogales Mariposa
    '240221', // El Paso
    '240201', // El Paso Bridge of the Americas (BOTA)
    '240202', // El Paso Paso Del Norte (PDN)
    '240203', // El Paso Ysleta
    '230404', // Laredo World Trade Bridge
    '230401', // Laredo Bridge I (Lincoln-Juárez)
    '230403', // Laredo Colombia Solidarity
    '230501', // Hidalgo/Pharr Hidalgo
    '230502', // Hidalgo/Pharr Pharr
    '535504', // Brownsville Gateway
    '230301', // Eagle Pass Bridge I
  ],

  // "Best hour in a month" detector: require today's measured value be at or below
  // this fraction of the 30d median for that port+hour+day-of-week cell.
  lowestTodayRatio: 0.5,

  // "Sunday spike" detector: today's Sunday evening peak must exceed the trailing
  // 4-Sunday median for the same hour by this ratio.
  sundaySpikeRatio: 1.5,

  // Require recent data. Anomaly run aborts if the crossings snapshot is older than this.
  maxStalenessHours: 2,

  // Cap how many drafts the run may produce. The drafter iterates the top-N by severity.
  // 3 is the sustainable review load for Sebastian.
  maxDraftsPerRun: 3,
};
