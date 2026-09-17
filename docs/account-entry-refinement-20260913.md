# 账号入口与恢复流程 · 2026-09-13

本轮完善邀请认领、找回密码和重置密码的页面、异常状态与返回路径。登录继续使用弹窗，账号设置继续使用独立页面；视觉沿用 FC Signal 的黑、黄、纸白色与现有公共导航。

## 页面与交互

- 邀请认领使用「核对邀请 → 绑定身份 → 进入周赛」进度。桌面左侧展示受邀身份，右侧展示当前操作；窄屏保持相同阅读顺序。
- 新账号设置密码，已有账号确认现有密码。已有账号可在认领页打开找回密码弹窗，关闭后继续查看邀请。
- 缺少链接、过期、撤销、已认领与服务暂不可用分别提供相应下一步。已认领引导登录，失效邀请引导申请新链接，临时服务失败允许重试。
- 确认认领成功后单独处理进入空间所需的会话刷新。刷新失败不会把已成功的认领显示为失败。
- 找回密码区分申请、已受理、设置密码、链接失效、修改完成。申请回执不暴露邮箱是否注册，也不把请求受理写成邮件已送达。
- 重置链接进入页面后从地址栏及路由上下文移除凭据，避免导航再次携带；凭据和新密码不写入浏览器持久化存储。
- 只有 API 明确返回 `reset: true` 和 `loginRequired: true` 才展示修改成功。后续会话刷新失败保留成功状态；不会退出当前可能属于其他账号的会话。
- 表单统一控件尺寸，支持密码显隐、明确标签、键盘焦点循环和中英文文案。提交期间防止重复操作。

## 页面审阅

本机入口：<http://127.0.0.3:3047/dev/account-review?page=activation&device=desktop>

总览包含 47 个入口、8 个分组，支持桌面、980px、390px。新增邀请状态和密码恢复状态；「密码更新完成」「重置链接已过期」明确标记为结果组件样例，不代表当前预览实际执行过密码修改。可通过「独立打开」查看完整页面。

预览启动脚本：`scripts/previewAccountReview.mjs`。预览使用本机合成数据，不发送邮件、不修改正式赛事。

## 验证证据

| 层次 | 已检查 | 证据与边界 |
| --- | --- | --- |
| 自动检查 | `npm run test:account-ui`，新增账号入口断言，修改文件 ESLint，隔离 Vite 构建 | `.codex-tmp/account-entry-20260913/account-tests.log`、`build.log`；构建直接调用 Vite，未执行会改写赛事资产的 prebuild |
| 浏览器 | 邀请新旧账号、已使用、过期、暂不可用；申请回执、邮箱沿用、邮件服务关闭、无效重置链接、成功后登录、桌面与窄屏、英文重置表单、焦点循环 | 使用页面组件与隔离 fixture；未在浏览器输入或提交新密码 |
| 路由 | 实际 `/account` 重置链接自动打开弹窗，地址及页面导航链接不再携带重置凭据 | 浏览器检查，不只测试字符串处理函数 |
| 本机 API 与 PostgreSQL | 密码修改成功、旧密码失效、新密码可登录、原有两个会话被撤销、无关账号会话保留、哈希与版本落库、链接单次使用与过期拒绝 | `recovery-api-evidence.json`；API `127.0.0.1:4467`、PostgreSQL `127.0.0.1:55432`；仅使用本轮两个合成账号，验证后清理 |

本轮没有发送真实重置邮件，没有验证真实邮箱收信链路，没有部署或修改生产账号。API/数据库验证与浏览器组件验证分别记录，不作为真实邮件端到端上线验收。未修改弃权规则或比赛处罚。

## 主要实现

- `src/pages/auth/WeeklyAccountActivationPage.jsx` 与同名 CSS
- `src/features/auth/weeklyInvitationModel.js`
- `src/features/auth/AuthDialog.jsx` 与同名 CSS
- `src/features/auth/PasswordRecoveryPanel.jsx` 与同名 CSS
- `src/features/auth/usePasswordRecovery.js`
- `src/features/auth/passwordRecoveryModel.js`
- `src/pages/dev/AccountReviewPage.jsx`、`accountReviewCatalog.js`
- `scripts/lib/accountReviewFixtureServer.mjs`
- `scripts/assertAccountEntry.mjs`

改动前副本位于 `.codex-tmp/account-entry-20260913/before/`。本轮保持工作区其他未提交内容。
