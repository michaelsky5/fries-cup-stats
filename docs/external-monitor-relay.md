# External monitor transport candidate

The October 24 production host cannot reach the approved `workers.dev` address: native DNS returned unrelated addresses, and TLS connections to the HTTPS-DNS answers were reset. This candidate adds a fixed transport through the existing Stats EdgeOne endpoint. It has not been deployed or verified from the production host.

`GET /api/ops-monitor/health` and `POST /api/ops-monitor/receipt` are the only routes. The fixed destination is the existing FriesCup Worker. The relay preserves signed request bytes and the signature; only the Worker can validate and accept a receipt. Stats receives no signing secret, Resend key, R2 key or backup content. Cookies, authorization, origin and other caller headers are not forwarded. Both directions have a 2 KiB limit, an 8-second deadline, no redirect following, no caching and no automatic retry.

The existing application's availability now becomes an additional heartbeat transport dependency. Losing this relay must produce an external incident rather than a false fresh backup. Worker scheduling, monitoring state and email sending remain independent of the System host. The original local host watchdog continues checking whether the external monitor is healthy.

Before adopting: review this candidate and the exact System endpoint allowlist change; run one coordinated CI batch; verify the frozen preview from **the production host** can reach the Worker; then deploy exact accepted artifacts and verify invalid signatures, real signed receipts, original backup timestamps, actual Worker cron and host watchdog. Do not enable real external sending or open registration on local tests alone. Preserve the original endpoint and signed state for a configuration rollback; never reset notification budgets.
