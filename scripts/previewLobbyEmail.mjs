// Separate synthetic account preview. The existing anonymous preview stays on 3039.
process.env.LOBBY_DESIGN_PORT ||= '3040'
process.env.LOBBY_DESIGN_EMAIL_DEMO = 'true'
await import('./previewLobbyDesign.mjs')
