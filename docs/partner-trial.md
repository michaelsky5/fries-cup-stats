# 合作赛事试用构建

使用与 System 隔离试用 API 配套的构建。默认关闭，不改变常规赛事目录。

```dotenv
VITE_PARTNER_TRIAL=1
VITE_PARTNER_TRIAL_SEASONS=TRIALA26,TRIALB26
VITE_ADMIN_PUBLIC_PROXY_TARGET=http://127.0.0.1:4447
VITE_PLATFORM_API_PROXY_TARGET=http://127.0.0.1:4447
```

编号必须以 TRIAL 开头；白名单填写共用入口编号。个人结果页先从测试 API 校验它属于该入口，只显示本人当前轮次。过期或重置前的链接明确报错，不回退到其他人的赛事。代理目标允许本机或 HTTPS `test-admin.fries-cup.com`。前端只接受编号一致的测试公开快照；不使用正式或本地历史数据作为回退。页面沿用 Stats 布局与视觉样式，显示“试用赛事”和发布状态说明。

当前 System 试用复制 FCR26 决赛 REG 对 AIP 的真实素材，在独立 TRIAL 赛事内练习四图录入、复核和发布。Stats 从试用 API 读取练习结果，仍不直接读取 FCR26 正式快照；横幅说明使用历史比赛素材，避免误称为虚构名单。

本机启动：`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5198 --strictPort`。构建：`npm run build`。构建后的静态站仍需在目标平台配置 `/api/admin-public` 与 `/api/platform` 到测试 API 的代理；Vite 的开发代理不会随静态文件部署。

验证：`node scripts/assertPartnerTrial.mjs`。部署和交付前需用目标域名读取 System 实际发布的数据，核对赛事、比赛和选手。部署配置中的试用域名是待配置目标，不代表已经上线。

目标部署：`https://trial-stats.fries-cup.com`，使用 `TRIALPARTNER26` 共用入口白名单；独立静态容器只连接 System 测试 API。正式 Stats 构建不设置 `VITE_PARTNER_TRIAL`。
