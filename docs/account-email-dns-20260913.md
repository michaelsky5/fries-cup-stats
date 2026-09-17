# 账号邮件发信域名 · 已验证

## 当前状态

- 2026-09-14 02:43 SGT 续作：通知 DNS 没有再次修改；测试邮件按钮已切至既有 https://hub-preview.fries-cup.com。配置运行 `34775122811` 与发信运行 `34775316045` 成功。两封新邮件均进入 Gmail INBOX、认证全部通过，Edge 实际打开邀请与找回密码表单；新密码仍由用户亲自提交。下文 9 月 13 日的 Vercel 链接问题保留为历史证据，不表示当前邮件仍指向旧入口。

- Resend 的 `notify.fries-cup.com` 已 Verified，区域 Tokyo / `ap-northeast-1`，域名 ID `4d2738e1-078c-40d9-b5a5-99534fe1adba`。域名事件显示 2026-09-13 16:01 SGT 验证完成。
- 当前测试发件地址为 `薯条杯 <account@notify.fries-cup.com>`，收件白名单只有本轮用户授权邮箱。
- 权威 DNS 为 `potato.dnspod.net`、`hot.dnspod.net`。写入前的公共 DNS 检查显示四条名称不存在，随后也核对了 DNSPod 实际记录列表；写入后的完整值已经复核。
- 用户已完成 Edge 登录。浏览器连接曾中断，随后恢复；已核对 DNSPod 的全部 21 条现有记录，第二页仅有 `hub-preview` CNAME，没有与通知子域冲突的记录。
- 用户已明确批准保存四条记录并继续测试。批量表单没有提交反馈，经重新加载确认总数仍为 21 条后，改用单条添加；15:58–16:00 SGT 四条分别成功，记录总数变为 25。均为默认线路、TTL 600 秒，原网站记录未修改。
- 权威 DNS 的四条完整值核对通过；同一部署 DNS 预检在写入前失败、写入后通过。证据在 `.codex-tmp/account-joint-20260913/real-mail/notification-dns-authoritative.json`。
- Resend 仅发送启用、接收关闭。Configuration 页面显示追踪尚需新建 tracking subdomain；未新建该域名或启用追踪。两封新邮件的按钮链接已核对，均未被追踪改写。
- System 实际测试版为 `d7dc349`，部署 `34746818258` 成功，DNS 预检、备份、应用/数据库/HTTPS 健康检查和正式 API/Admin 容器不变检查均通过。
- 真实复测 `34746919401` 成功，16:08 SGT 发送两封新邮件。Gmail 确认两封均为 INBOX、无 SPAM 标签；SPF、DKIM、DMARC 均通过，链接未被追踪改写，UTC+8 有效期显示正确。
- 同一推送出现第二条运行 `34746919416`，被已有单次标记拒绝，未额外发送；没有删除标记或盲目重试。首次成功运行与重复运行拒绝分开记录。

## 已添加记录

在 DNSPod 的 `fries-cup.com` 域名下使用以下主机记录，线路为默认，TTL 可用默认 600 秒。前三条来自本次 Resend 实际配置页面，不能用旧版文档里的 MX/SPF 示例替代。第四条是仅针对通知子域的初始 DMARC 监测策略。

| 类型 | 主机记录 | 记录值 | 用途 |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.notify` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDzNgVQPlngqG9FFQtPRSMTFkA91YyMgybQ92kraYAyb/eZ/XQGwGVrpvJ5hR6ac/TETkOaDx3LvaLvVWGFNc2Cc9YST2Iel8trVIs6CKIB09sMKQcABJILhaZRzYCFuN4i9j3hn0izRTnb5WI2k5+q/hA2isbQWJ1VWlOMHTGcbQIDAQAB` | DKIM 公钥 |
| CNAME | `rsend.notify` | `rsend-apne1.forge.rmta.net` | Resend 东京发送配置 |
| CNAME | `send.notify` | `send.forge.rmta.net` | Resend 退信路径配置 |
| TXT | `_dmarc.notify` | `v=DMARC1; p=none;` | 仅通知子域的初始 DMARC 策略 |

DKIM 公钥是公开的 DNS 记录，不是 Resend API 密钥。API 密钥已保存为私有 System 仓库的 `STAGING_RESEND_API_KEY` 加密配置，文档不保存其值。

Resend 页面把可选 DMARC 主机显示为 `_dmarc`；本次方案使用完整名称 `_dmarc.notify.fries-cup.com`，只覆盖专用通知子域。应在正式发信验证通过后审阅并收紧 DMARC 策略。没有为根域名创建或覆盖 DMARC，也没有改变现有官网解析或收件路由。

## 执行与验收边界

1. 已核对全部原有记录，并在用户明确授权后新增四条通知子域记录。
2. 权威 DNS 与 Resend 验证均已通过。仅启用发送，追踪子域未配置；真实新邮件均确认没有链接改写。
3. 仅在测试服务器更换发件地址，保留单收件人限制，再次验证邀请和密码找回。当前代码里的即时邮件不盲目重发。
4. 使用邮件头确认新发件域名 SPF、DKIM、DMARC 通过，再核对 Gmail 自然投递位置；通过认证不保证进入收件箱。
5. 9 月 13 日第一批自有域名邮件使用 Vercel 预览；9 月 14 日复测邮件已使用 `hub-preview.fries-cup.com`，与发件人同属薯条杯域名。正式网站与正式发信环境仍需单独发布验收。

## 本地部署准备

- 修改仅在隔离 System 候选；已提交并推送 `d7dc349`，触发测试部署 `34746818258`。
- 前置检查四条公开 DNS 的完整值；缺失或不匹配即停止。Resend 控制台的 Verified 和关闭追踪仍需另行核对，DNS 预检不能替代它们。
- 部署前要求旧版本 `7c4c918`、旧发件地址和单收件白名单匹配；现已切换至 `d7dc349` 与 `薯条杯 <account@notify.fries-cup.com>`。这一迁移脚本有旧版本保护，不能直接重跑。
- 保留数据库、环境与旧镜像备份，额外将容器中的合成邮件验收凭证文件复制至受限备份目录，并在替换容器后恢复；该文件不打印、不上传到构建产物。
- YAML 解析、内嵌 Node 与复测脚本语法、改动脚本 lint、6/6 邮件发送器测试和 `git diff --check` 通过。DNS 预检已验证缺失时拒绝、齐全时通过；远程部署及真实邮件复测均完成。
- 新增受限复测脚本沿用已存在的合成账号；有效邀请使用原凭证重发，已认领邀请跳过，不重新建号、不改密码。密码找回仍调用实际 HTTP 接口，单次标记阻止不明结果下盲目重发。

## 真实邮件与网页结果

- 邀请 Resend ID：`0961f5c8-49bd-4e42-b5b7-01251c5432f6`；Gmail ID：`1a099cf2c6377120`。
- 找回密码 Resend ID：`e59d31c0-e0fd-4692-9f51-3a19b948c9f4`；Gmail ID：`1a099cf2df714bcd`。
- 两封邮件 Resend 均 Delivered，Gmail 均在收件箱；没有更改 Gmail 标签。认证及链接来源证据在 `real-mail/notify-gmail-authentication.json`，脚本原始结果在 `real-mail/notify-run-34746919401/account-notify-email-result.json`。
- 新邮件可打开设置新密码弹窗；未替用户输入或提交密码。
- 邀请链接的真实 HTTP/DB 预检通过，但从 Vercel 预览打开后，两次邀请资料读取均失败。日志 `d3f54943-b0aa-4f04-92ef-4a69dceb5542`、`fe77b691-8a50-4fd8-b1fa-ab695c6d1521` 均在 TCP 连接前超时，返回 502；目标解析正确为 `43.143.113.37`，诊断出口为 `13.212.218.90`。邮件投递通过不等于网页认领流程通过，连接问题继续单独处理。
- 只读诊断 `34747166764` 确认这个诊断 IP 不在 `YJ-GLOBAL-INBLOCK` 中；这仅排除了该名单的这一项，不能排除其他入口策略或证明目标连接使用同一出口。
- 16:23:45–16:24:30 SGT 的 45 秒被动连接观测 `34747559827` 正常到时结束，限定旧诊断 IP、443 端口及 SYN/RST，未记录请求内容。同期第三次邀请读取 `3e8077c3-69dd-461f-80c8-cfcd025c0915` 仍返回 502，耗时 7880ms；诊断出口已变为 `13.229.100.211`。旧 IP 的观测没有匹配到包，因此本次观测不能定位这次失败，不能据此断言数据包未到达服务器。没有修改防火墙或增加网络白名单。
- 下一步先核对实际目标连接的来源与服务器入口证据，修复连接稳定性后再进行用户密码设置、认领和找回后的登录验收。原邀请凭证与账号密码继续保留，未为了重试重新建号或撤销邀请。

## 新入口复测 · 2026-09-14

- 邀请 Resend ID `0f1137e5-4025-4a50-bdcc-318bdb784522`；Gmail ID `1a09c11b9e2e10d2`。
- 找回密码 Resend ID `5933b65b-0b49-448a-b402-669a0ef8c8bc`；Gmail ID `1a09c11bf92e3a00`。
- 两封均 Delivered、INBOX，无 SPAM，SPF/DKIM/DMARC 全部通过。自然投递位置与邮件认证分别核对，没有更改 Gmail 标签。
- 实际 EdgeOne 邀请预览 200、找回请求 202，新重置凭证已持久化；账号密码和原邀请凭证未变。两封真实 CTA 都能打开对应表单并清除地址栏凭证，没有代为输入或提交新密码。
- 证据：`.codex-tmp/account-joint-20260913/real-mail/edgeone-gmail-authentication.json`、`real-mail/edgeone-run-34775316045/account-edgeone-email-result.json`。旧 Vercel 连接故障未认定根因；不将新域名短时成功当作正式上线或持续投递保证。

参考：[Resend 域名说明](https://resend.com/docs/dashboard/domains/introduction)、[Resend 垃圾邮件排查](https://resend.com/docs/knowledge-base/why-are-my-emails-going-to-spam)。
