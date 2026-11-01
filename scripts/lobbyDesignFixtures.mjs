// Synthetic public cards for local visual review; no accounts or private contacts.
const now = Date.now()
const iso = hours => new Date(now + hours * 3600000).toISOString()
const base = { state: 'ACTIVE', qqMode: 'REQUEST', revision: 1, expiresAt: iso(14 * 24) }
const teams = [
  ['晚风俱乐部', ['TANK', 'SUP'], '钻石 — 大师', '周三、周五 20:00–23:00', '固定训练 · 参加周赛', '四人固定队，想找愿意一起打磨配合的你。能开麦，有复盘习惯，比赛之外也可以一起快乐上分。', [{ role: 'TANK', count: 1 }, { role: 'SUP', count: 1 }]],
  ['AFTER HOURS', ['DPS'], '大师及以上', '工作日 21:00 后，周末可约', '认真备赛，长期磨合', '下班后见。我们更看重沟通、稳定出勤和团队配合，希望找到一位愿意长期一起打比赛的输出。', [{ role: 'DPS', count: 1 }]],
  ['橘子汽水', ['SUP'], '白金 — 钻石', '周六、周日 下午 / 晚上', '从第一次组队开始', '新队伍组建中，欢迎第一次参加比赛的朋友。氛围轻松，遇到问题一起沟通，周末有空就来。', [{ role: 'SUP', count: 2 }]],
  ['长夜未央', ['TANK', 'DPS', 'SUP'], '', '周二、周四晚间', '每周训练两次，稳定参赛', '不急着赢每一场，但想认真打好每一场。寻找能开麦、相互尊重、愿意练阵容的伙伴。', [{ role: 'TANK', count: 1 }, { role: 'DPS', count: 1 }, { role: 'SUP', count: 1 }]],
  ['第三颗行星', ['TANK'], '钻石以上', '周末 19:30–23:00', '默契配合 · 享受比赛', '四名老朋友，还差一个能一起开团的主坦。正常沟通，不甩锅，训练时间可以商量。', [{ role: 'TANK', count: 1 }]],
  ['日落以后也想认真打好每一场比赛', ['DPS', 'SUP'], '段位不限，愿意进步就好', '周一到周五 20:30 后；周末提前约时间，可协调', '找到一群合得来的队友，一起参加周赛', '这是长文案的示例。希望彼此能够提前沟通出勤安排，有问题当面讨论。可以从一起排位开始，熟悉以后再安排训练和比赛。', [{ role: 'DPS', count: 1 }, { role: 'SUP', count: 1 }]],
  ['青柠放映室', ['DPS'], '钻石及以上', '周五、周六晚', '固定训练与复盘', '找一位英雄池互补的输出，欢迎来聊。', [{ role: 'DPS', count: 1 }]],
  ['晴空航线', ['TANK', 'DPS'], '白金及以上', '周末晚间', '一起参加周赛', '新朋友也欢迎，先一起玩两局。', [{ role: 'TANK', count: 1 }, { role: 'DPS', count: 1 }]],
]
const people = [
  ['抹茶冰沙', ['SUP', 'TANK'], '支援 宗师 5', '周一、五、六、日 下午 / 晚上', '服从队伍安排，长期训练', '9 年比赛经验，硬实力下滑但经验决策尚可，寻求机会保持状态。平时主玩支援，也可以补重装。', '安娜、布里吉塔、卢西奥、朱诺、雾子'],
  ['月见', ['DPS'], '输出 大师 3', '工作日 21:00 后', '想加入有固定训练的队伍', '长枪选手，能开麦，愿意练习和复盘。希望找到氛围好、出勤稳定的队友。', '艾什、卡西迪、黑百合'],
  ['North', ['TANK'], '重装 钻石 1', '周三、周六晚上', '先一起练习，再参加比赛', '有半年比赛经验，愿意听指挥，也可以承担指挥。希望找一支相处舒服的队伍。', '温斯顿、D.Va、查莉娅'],
  ['盐汽水', ['SUP'], '', '周末时间较灵活', '找队友一起享受比赛', '刚开始接触比赛，希望和大家一起进步。', '天使、雾子'],
  ['可以一起看日落吗', ['DPS', 'SUP'], '输出 钻石 2 / 支援 大师 5', '周二、周四 20:00–23:30，周末可提前协调', '长期磨合，找到节奏相近的队友', '这是另一张长内容示例。能够开麦，配合训练时间。希望团队有明确的分工，也希望能和队友一起慢慢进步。', '猎空、回声、雾子、巴蒂斯特'],
  ['小满', ['TANK', 'DPS', 'SUP'], '各岗位 白金 — 钻石', '周六、周日晚上', '认真打，也开心玩', '补位选手，愿意配合队伍安排。', '温斯顿、士兵：76、安娜'],
  ['River', ['SUP'], '支援 大师 4', '周一、周三晚上', '固定出勤，参加周赛', '有比赛经验，欢迎长期队伍联系。', '安娜、朱诺'],
]
export const lobbyDesignCards = [
  ...teams.map(([title, roles, level, availability, goal, bio, needs], index) => ({ ...base, publicId: `preview-team-${index + 1}`, kind: 'TEAM', title, roles, level, availability, goal, bio, needs, forming: index === 2 || index === 3, qqMode: index % 3 === 1 ? 'VERIFIED' : 'REQUEST', confirmedAt: iso(-[0, 4, 16, 50, 100, 180, 200, 230][index]), expiresAt: iso(12 + index * 16), heroes: index === 0 ? '温斯顿、D.Va、安娜、雾子' : '' })),
  ...people.map(([title, roles, level, availability, goal, bio, heroes], index) => ({ ...base, publicId: `preview-person-${index + 1}`, kind: 'PERSON', title, roles, level, availability, goal, bio, heroes, qqMode: index % 3 === 1 ? 'VERIFIED' : 'REQUEST', confirmedAt: iso(-[0, 4, 16, 50, 100, 180, 200][index]), expiresAt: iso(18 + index * 18) })),
]
