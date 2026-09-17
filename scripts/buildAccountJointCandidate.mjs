import { build } from 'vite';
import react from '@vitejs/plugin-react';
// Temporary preview candidate: private account traffic stays on this origin.
// The paired vercel.json rewrite targets the isolated System staging API.
process.env.VITE_PLATFORM_API_BASE_URL = '/api/platform';
await build({configFile:false,envDir:false,plugins:[react()],build:{outDir:'dist'}});
