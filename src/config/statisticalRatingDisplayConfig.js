// Presentation only. The scorer and archived competitions keep their own scale.
export const STATISTICAL_RATING_DISPLAY_CONFIG = Object.freeze({
  version: 'v1.5-display-2026.10.14',
  modelVersion: 'v1.5.0',
  curve: Object.freeze([
    { percentile: 0, value: 5.5 },
    { percentile: 5, value: 5.5 },
    { percentile: 25, value: 6.4 },
    { percentile: 50, value: 7.0 },
    { percentile: 70, value: 7.9 },
    { percentile: 85, value: 8.6 },
    { percentile: 95, value: 9.2 },
    { percentile: 99, value: 9.6 },
    { percentile: 100, value: 9.8 }
  ].map(point => Object.freeze(point)))
})
