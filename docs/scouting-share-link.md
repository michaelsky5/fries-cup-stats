# Scouting report share link

The report intentionally uses lightweight private sharing, not account authentication. It has no navigation entry, the URL contains a long random key, and Vercel marks every `/scouting/` response as `noindex` with a no-referrer policy.

Create one link for a club:

```powershell
npm run scouting:create-share-link -- --base-url https://your-domain.example --label "Club name" --lang zh
```

Copy the printed `viteEnvironmentValue` into the Vercel variable `VITE_SCOUTING_ACCESS_KEYS` for Production and Preview, then redeploy. Multiple active links can be comma-separated.

This is deliberate link privacy only: a recipient can forward the URL, and the client-side key is not a secret. To invalidate a link, remove or replace its value in `VITE_SCOUTING_ACCESS_KEYS` and redeploy.
