export const SCORING_ENGINE_CONFIG = {
  activeEngine: 'rating_v1',
  keepLegacyDebugFields: true,
  allowLegacyFallback: true,
  exposeDebugFields: import.meta.env?.DEV === true
}
