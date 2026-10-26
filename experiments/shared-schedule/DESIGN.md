# Stats 现有赛程的跨端复用试验

本节保留最初的 FCW26 试验设计；当前 R8 范围见 README、PARITY 和 specs/stats-parity/design.md。现已扩展为四赛事公开查询，并直接转换当前 Stats 的完整历史首页与比赛详情。原生语言监听、章节滚动、选手输入、表格和查询状态放在共享平台边界，生成 JSX/CSS 仍以 Stats 源码为准。

## DESIGN SPECIFICATION

1. Purpose: 用同一个 React 页面及样式源生成 H5 与微信小程序，验证后续设计修改能同时反映到两端。只做 FCW26 公开赛程试验，不迁移整个 Stats。
2. Direction: 沿用 `SignalWeeklySchedule` 的 Editorial / magazine 赛事索引。既有设计为基准，不另做视觉稿。
3. Palette: 纸色 #eeede6、墨色 #181a17、信号黄 #f4c320、弱文本 #66685f、进行中 #0f766e；从当前 Stats 样式文件读取。
4. Typography: FC Data Display / Barlow Condensed 与 Stats 字体规范；微信采用设备可用的 PingFang SC / Microsoft YaHei 回退。沿用已批准的字体规范，覆盖技能默认字体限制。
5. Layout: 保留现有标题、周期/周次、搜索、状态条、按日期分组、对阵与五局地图记录的手机阅读顺序。平台选择器和返回动作由适配层处理。

构建会从现有样式自动提取 <=600px 布局，并将 HTML、状态及 `:is()` 选择器转换为稳定的共用类名。适配生成文件不手工维护。此试验聚焦手机，网页的桌面布局不在本次迁移范围内。

代码与构建依赖位于本试验目录，Taro 4.3.0 使用其声明支持的 React 18.3.1。当前 Stats React 19.2.4 / Vite 8 入口没有接入此试验，兼容性不能由两个独立输出反推。
