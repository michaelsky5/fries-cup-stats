import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import {
  getCachedScoutingIndex,
  getCachedScoutingPlayer,
  loadScoutingIndex,
  loadScoutingPlayer,
  preloadScoutingPlayer
} from '../../features/scouting/scoutingArtifactClient.js'
import { getScoutingAccessRecord } from '../../features/scouting/scoutingAccess.js'
import { getScoutingAnalystNote } from '../../features/scouting/scoutingAnalystNotes.js'
import { formatOwHeroName, formatOwNamesInText } from '../../lib/heroes.js'
import { getHeroAvatarSrc } from '../../lib/leaderboardSelectors.js'
import { normalizeReviewLocale, REVIEW_LOCALES } from '../../lib/reviewLocale.js'
import styles from './ScoutingReportPage.module.css'

const COPY = {
  'zh-CN': {
    access: '俱乐部专属访问',
    title: '薯条杯 2026 选手技术分析报告',
    titleLead: '薯条杯 2026',
    titleReport: '选手技术分析报告',
    subtitle: '以同职责数据、样本置信度和英雄池结构，呈现选手在本届赛事中的技术画像。',
    confidential: 'CONFIDENTIAL · TECHNICAL ANALYSIS',
    qualifiedPool: '高样本候选池',
    prototype: '完整技术分析池',
    sampleGate: '最低样本门槛',
    sampleGateValue: '20 地图 · 200 分钟 · 6 场',
    roleRank: '分路顺位',
    shortlistRank: '当前公开候选顺位',
    publicTier: '公开名单层级',
    publicListOrder: '固定公开名单顺位',
    publicListOrderShort: '名单',
    emphasisRankShort: '侧重',
    publishedCandidates: '公开候选',
    rankScopeGuide: '大号顺位＝当前侧重下的公开 5 人顺序 · 名单层级＝固定公开分层 · 完整池＝全部合格选手顺位',
    subrole: '细分位置',
    subroleFit: '该分路出场',
    selectionScore: '模型基础分',
    selectionScorePrimary: 'Selection v2.7 证据收缩后基础分',
    rawPerformance: '原始竞技表现',
    executiveTitle: '俱乐部决策摘要',
    executiveMeta: '按细分位置呈现 25 人技术名单：5 名技术首选、10 名核心候选、5 名延伸考察、5 名观察候选。',
    commandTitle: '五位置候选总览',
    commandMeta: '五个位置分别比较候选；先看技术首选、领先幅度、证据质量与压力测试，再进入位置评估或选手技术档案。',
    roleCockpit: '候选技术评估',
    roleCockpitMeta: '比较当前位置 5 名候选的即战能力、高压表现与英雄池适配；切换用人侧重，候选顺序同步更新。',
    backAllMarkets: '返回全部位置',
    marketVerdict: '本位置结论',
    candidateDecisionStack: '本侧重下的候选顺序',
    heroLineupAdjusted: '环境校正后表现',
    contextCoverage: '阵容信息覆盖',
    lineupAnchors: '前排环境',
    partnerContexts: '搭档环境',
    calibrationWeight: '校准权重',
    openFullDossier: '查看技术档案',
    roleFocusCaution: '英雄与同图阵容环境以收缩方式参与评分，权重限制为 10%；该排名只用于技术优先级，不判断签约意愿、沟通能力或未来阵容协同。',
    commandLineup: '本次用人侧重',
    commandPortfolio: '候选结构',
    commandEnvelope: '竞技上下限与强敌信号',
    commandEnvelopeMeta: '色带连接竞技下限与上限在同分路中的相对位置；白点为常态水平，菱形为强敌检验。',
    commandWatchRole: '首位领先',
    commandCaution: '五个位置独立分析；只呈现已记录比赛中的技术证据与模型敏感性，不推断阵容协同、沟通效果或签约意愿。',
    audienceMode: '决策视角',
    managerView: '经理视图',
    coachView: '教练视图',
    managerViewMeta: '候选结构、领先幅度与决策风险',
    coachViewMeta: '完整技术证据、模型审计与方法',
    marketFlowTitle: '不同用人侧重下的候选变化',
    marketFlowMeta: '横向查看同一选手在四种用人侧重下的顺位变化，纵向比较同一侧重下的候选优先级。',
    marketFlowLocked: '首选不变',
    marketFlowOpen: '侧重变化会改写首选',
    marketFlowCoverage: '完整候选池',
    marketFlowComplete: '当前 5 人覆盖四种侧重下全部前三候选',
    marketFlowPartial: '四种侧重下存在名单外边界候选',
    marketMatrixCandidate: '候选',
    marketMatrixSensitivity: '顺位变化',
    marketMatrixStable: '基本不变',
    marketMatrixMinor: '小幅变化',
    marketMatrixSensitive: '变化明显',
    marketMatrixLeader: '当前第 1',
    marketMatrixGap: '落后首位',
    marketMatrixCurrent: '当前侧重',
    marketMatrixHowToRead: 'FIT＝技术适配分 · #＝同位置完整池顺位 · 高亮＝当前侧重第 1',
    managerRankHowToRead: '上排＝四种侧重的技术首选 · 下排＝当前侧重前三候选及其顺位范围',
    poolRank: '同位置完整池顺位',
    decisionTrail: '模型判断依据',
    decisionTrailMeta: '环境校正、七因子合成、样本收缩与压力下限按各自量纲独立呈现。',
    rawSignal: '英雄与阵容环境校正',
    adjustedSignal: '七因子综合',
    evidenceShrinkage: '样本置信度收缩',
    stressFloor: '压力下限',
    topOneProbability: '权重扰动第一率',
    decisionTrailCaution: '该概率来自 5,000 次模型权重扰动，不是签约成功率；沟通、指挥、终极技能时机与阵容化学反应仍未被比赛统计直接测量。',
    commandFloor: '下限',
    commandTypical: '常态',
    commandCeiling: '上限',
    commandStrong: '强敌',
    marketStructure: '候选结构',
    marketClearLeader: '领先明确',
    marketFitLeadSupported: 'FIT 首位 · 证据稳健',
    marketFitLeadOverlap: 'FIT 首位 · 区间重叠',
    marketFitLeadReview: 'FIT 首位 · 顺位待复核',
    marketOpenRace: '前三接近',
    marketTierBreak: '前三形成梯队',
    marketCompetitive: '整体差距较小',
    marketLeader: '技术首选',
    marketRunnerUp: '次位候选',
    marketTopGap: '首位领先',
    marketTopThreeSpread: '前三差距',
    marketEvidence: '首位证据',
    marketCandidateCount: '候选数量',
    marketOpenRole: '查看该位置',
    marketActive: '正在查看',
    marketAllPositions: '5 个位置分别评估',
    rankingStressTest: '排名压力测试',
    stressStable: '抗扰稳定',
    stressSensitive: '轻度敏感',
    stressFragile: '高度敏感',
    removeWeakOpponent: '剔除最弱对手',
    leaveOneMatchOut: '逐场留一删除',
    rankNoDrop: '顺位不降',
    rankDrop: '最差下降',
    stressMethodMeta: '仅替换环境校正因子并按原模型重排，其余六项与证据收缩保持不变。',
    publicDossiers: '公开技术档案',
    stableSeats: '稳定席位',
    sensitiveSeats: '需留意席位',
    scoreLegend: 'Selection v2.7 按五个位置分别加权，并在地图、对手、己方强度基础上增加主要英雄与同图阵容环境的收缩校正；OVR 仅作为未拆分位置的赛季参考。',
    selectionStability: '名单稳定度',
    preferenceSensitivity: '权重敏感度',
    preferenceSensitivityMeta: '七项权重各自在 ±30% 范围内变化、重复 5,000 次时，优先层保留前三、延伸层保留前四、观察层进入前四的比例；不是统计置信区间。',
    evidenceConfidence: '证据可信度',
    stable: '稳定',
    watch: '需留意',
    boundary: '边界',
    decisionBrief: '决策摘要',
    whyShortlisted: '入选依据',
    decisionRisks: '主要观察项',
    summaryNav: '摘要',
    contextNav: '情境',
    profileNav: '画像',
    matchesNav: '比赛证据',
    methodNav: '方法',
    comparisonRead: '对比结论',
    similarBand: '模型判断接近',
    clearModelLead: '模型明显领先',
    comparisonProfile: '同位置多维对照',
    comparisonProfileMeta: '各行按同位置百分位（0–100，越高代表相对越靠前）比较，并同时标注选手姓名与精确数值。',
    comparisonModelAudit: '模型可信度审计',
    comparisonModelAuditMeta: '原始表现、环境校正、估计区间、证据量与权重敏感度分别列示，用于复核总分结构。',
    comparisonDecision: '当前决策读取',
    comparisonLeader: '模型首选',
    comparisonAlternate: '最近替代',
    comparisonLargestEdge: '最大区分项',
    comparisonEvidenceRisk: '最低证据项',
    comparisonReranked: '校正改写顺位',
    comparisonIntervalStatus: '头部区间关系',
    comparisonIntervalOverlap: '区间重叠',
    comparisonIntervalSeparated: '区间分离',
    comparisonAuditTable: '展开完整指标审计表',
    comparisonAuditTableMeta: '汇总全部精确指标、模型区间与证据质量，供教练复核候选差异。',
    comparisonNeedTwo: '请至少选择 2 名同位置选手以生成决策结论。',
    deploymentMatrix: '位置使用地图',
    deploymentMatrixMeta: '每个位置独立成图：横轴为日常稳定性，纵轴为强局保持；环境迁移性按英雄与地图适配范围单独排序。',
    deploymentCandidateCount: '候选',
    deploymentCoreCount: '核心首发区',
    deploymentBestBalance: '综合部署领先',
    deploymentPortabilityLeader: '迁移性领先',
    deploymentPortabilityRanking: '环境迁移性排行',
    deploymentThreshold: '参考门槛 65',
    quadrantCore: '核心首发区',
    quadrantPressure: '高压选项区',
    quadrantReliable: '稳定基线区',
    quadrantTargeted: '定向考察区',
    baselineReliability: '基线可靠度',
    pressureReadiness: '高压准备度',
    contextPortability: '环境迁移性',
    deploymentProfile: '部署画像',
    deploymentProfileMeta: '把竞技下限、强敌与季后赛验证、英雄宽度和地图类型表现压缩为三个可追溯的使用维度。',
    deploymentMode: '使用类型',
    modeCoreReady: '核心轮换型',
    modeReliableBase: '稳定基线型',
    modePressureOption: '高压选项型',
    modeBalanced: '均衡观察型',
    modeTargetedUse: '定向使用型',
    mapTypeReadiness: '地图类型适应',
    mapTypeReadinessMeta: '表现已中和地图类型、主要英雄、同图阵容、对手和己方队伍强度；P 值在同分路内计算。',
    opponentTierCurve: '对手分档曲线',
    opponentTierCurveMeta: '按每场赛前对手评级的 33% / 67% 分位划分低档、中档和强档，不使用赛后信息。',
    heroContextEvidence: '主英雄环境证据',
    heroContextEvidenceMeta: '按每图主要英雄拆分校正表现，仅描述本届赛事已记录的使用环境。',
    strongTier: '强档对手',
    peerTier: '中档对手',
    lowerTier: '低档对手',
    retentionVsBaseline: '相对个人基线',
    contextConfidence: '情境证据量',
    insufficientTier: '样本不足，不作方向性比较',
    deploymentFormula: '基线＝60% 竞技下限＋40% 输出稳定性；高压＝55% 强敌检验＋45% 大赛阶段；迁移＝45% 英雄宽度＋30% 地图覆盖＋25% 地图均衡。',
    deploymentCaution: '这是已记录比赛条件下的部署画像，不预测从未共同比赛过的选手化学反应。',
    deploymentPlaybook: '选手部署说明书',
    deploymentPlaybookMeta: '只展示通过地图数、比赛数、分钟数与证据量四重门槛的英雄和阵容情境。',
    recommendedUse: '优先部署',
    alternateUse: '可用替代',
    watchUse: '条件限制',
    heroMapMatrix: '英雄 × 地图类型',
    heroMapMatrixMeta: '单元格显示相对选手个人校正基线的保持率；100% 等于其赛事平均环境表现。',
    lineupContextFit: '阵容环境适配',
    lineupContextFitMeta: '以同图英雄共现观察阵容条件，仅描述相关环境，不推断因果协同。',
    lineupAnchor: '阵容核心',
    sameRolePartner: '同位置搭档环境',
    evidenceGate: '样本门槛',
    eligibleContexts: '有效情境',
    contextRetention: '基线保持',
    primaryDeployment: '推荐用法',
    alternateDeployment: '替代用法',
    deploymentRisk: '主要风险',
    noWatchContext: '没有达到样本门槛的明显低位情境。',
    insufficientDeploymentContext: '没有更多达到样本门槛的情境，不作方向性判断。',
    contextAssociationCaution: '同图共现不是化学反应或因果协同证据；录像和沟通评估由俱乐部完成。',
    contextPrimary: '优势情境',
    contextStable: '稳定情境',
    contextConditional: '条件情境',
    comparisonDeploymentRead: '部署差异速读',
    comparisonDeploymentReadMeta: '每位候选只显示其达到样本门槛的第一使用情境，便于判断技术路线是否重叠。',
    recruitmentScenarioBoard: '用人侧重适配',
    recruitmentScenarioMeta: '选择一个位置后，按四种用人侧重重排 5 名候选；不同位置保持独立，不拼接为假想阵容。',
    scenarioBalanced: '综合能力',
    scenarioBalancedMeta: '平衡即战能力、稳定性、高压表现与英雄池适配。',
    scenarioReliableCore: '即战稳定',
    scenarioReliableCoreMeta: '优先竞技下限和持续输出。',
    scenarioPressureMatch: '强敌与关键局',
    scenarioPressureMatchMeta: '优先强敌与季后赛表现。',
    scenarioFlexiblePool: '英雄池与轮换',
    scenarioFlexiblePoolMeta: '优先英雄宽度、地图覆盖和环境迁移。',
    scenarioPrimary: '技术首选',
    scenarioAlternate: '次位候选',
    scenarioFitScore: '技术适配分',
    scenarioRank: '同位置顺位',
    scenarioAverageFit: '首位适配',
    scenarioFloorFit: '首位领先',
    scenarioEvidence: '平均证据',
    scenarioRoleCoverage: '候选数量',
    scenarioWithinPool: '同位置公开候选',
    scenarioBoardCaution: '技术适配分只用于同一位置内的后续考察排序；不推断沟通、签约意愿或未记录的队内适配。',
    scenarioFormulaBalanced: '选拔 25% · 基线 25% · 高压 20% · 迁移 15% · 证据 10% · 名单稳定 5%',
    scenarioFormulaReliableCore: '选拔 20% · 基线 40% · 高压 15% · 迁移 10% · 证据 10% · 名单稳定 5%',
    scenarioFormulaPressureMatch: '选拔 20% · 基线 15% · 高压 40% · 迁移 10% · 证据 10% · 名单稳定 5%',
    scenarioFormulaFlexiblePool: '选拔 20% · 基线 15% · 高压 10% · 迁移 40% · 证据 10% · 名单稳定 5%',
    scenarioFitTitle: '不同用人侧重下的技术适配',
    scenarioFitMeta: '用同一组技术证据观察选手在四种用人侧重下的适配分，以及其在完整合格候选池中的同位置顺位。',
    slotPlan: '名单结构',
    slotPlanMeta: '固定公开名单层级按五个位置各 5 人设置：名单 #1 为技术首选，#2–3 为核心候选，#4 为延伸层，#5 为观察层；当前用人侧重顺位可以变化，但不会改写该层级。',
    selectionModel: '选拔模型',
    selectionModelMeta: '细分位置表现 25% · 环境校正 20% · 竞技下限 15% · 逐图稳定性 15% · 大赛阶段 10% · 分路证据 10% · 分路英雄池 5%；不足完整分路证据时向同位置中位（第 50 百分位）收缩。',
    slots: '席位',
    qualifiedCandidates: '高样本候选',
    priorityTier: '首选与核心候选',
    extendedTier: '延伸考察',
    watchTier: '观察名单',
    subroleEvidence: '细分位置证据',
    fullEvidence: '完整证据',
    partialEvidence: '收缩证据',
    maps: '地图',
    minutes: '分钟',
    matches: '场比赛',
    heroes: '名英雄',
    primaryHero: '主要英雄',
    sampleDepth: '样本深度',
    strengths: '数据优势',
    relativeWatch: '相对观察项',
    roleMedian: '同职责中位',
    loading: '正在载入技术分析数据…',
    loadingDetail: '正在准备五位置候选摘要与公开名单顺位。',
    loadingPlayer: '正在载入选手完整档案…',
    loadingPlayerDetail: '正在准备当前选手的完整判断依据。',
    error: '技术分析数据暂时无法载入。',
    invalidTitle: '此专属链接当前不可用',
    invalidBody: '链接可能已撤销、过期或输入不完整，请联系报告提供方获取新的访问地址。',
    prototypeNote: '25 / 25 人均提供技术档案；其中名单 #1–#5 均指固定公开名单顺位：#1 为技术首选，#2–3 为核心候选，#4 为延伸层，#5 为观察层，不等同于当前用人侧重下的动态顺位。',
    talentMap: '人才分布图',
    talentMapMeta: '综合甄选评分 × 样本深度；评分已纳入对手强度、己方队伍环境与地图类型校正。',
    performance: '综合甄选评分',
    sampleIndex: '样本深度指数',
    selectedDossiers: '25 人分层分析档案',
    allRoles: '全部位置',
    seasonView: '全赛季',
    playoffsView: '季后赛切片',
    viewScope: '数据范围',
    filterSubrole: '位置筛选',
    openDossier: '查看完整档案',
    backToPool: '返回 25 人名单',
    previousPlayer: '上一位选手',
    nextPlayer: '下一位选手',
    reportVersion: '报告版本',
    modelVersion: '评分模型',
    dataAsOf: '数据截至',
    invalidPlayer: '此选手不在当前 25 人公开分析名单中。',
    playoffMaps: '季后赛地图',
    stageDelta: '对比前期',
    insufficientPlayoff: '未达到季后赛阶段样本门槛',
    compareSelect: '选择 2–3 名同位置选手进行横向比较',
    compareLimit: '最多选择 3 人',
    selectedCountLabel: '已选择',
    analystVerdict: '分析师结论',
    archetype: '技术类型',
    analystWorkbench: '个体深度分析',
    analystWorkbenchMeta: '将同分路基准、情境校正、表现边界与强敌检验放在同一决策框架中。',
    consistency: '输出稳定性',
    consistencyMeta: '同细分位置候选池分位',
    middle50: '中间 50% 区间',
    recentForm: '近期状态',
    recentFormMeta: '最近 5 图对比此前 5 图',
    effectivePool: '有效英雄数',
    effectivePoolMeta: '按使用分布折算；不是简单计数',
    coverage80: '覆盖 80% 出场时间',
    pressureContext: '逆境产出变化',
    pressureContextMeta: '校正后败图表现相对胜图表现的保持比例',
    playoffContext: '季后赛对比前期',
    stageValidation: '大赛阶段验证',
    stageValidationMeta: '校正后季后赛水平与阶段保持度的样本收缩分位',
    stageConfidence: '阶段证据置信度',
    opponentStrength: '赛程对手强度',
    opponentStrengthMeta: '按出场分钟加权的赛前队伍评分',
    contextAdjusted: '环境校正表现',
    contextAdjustedMeta: '校正地图、英雄、同图阵容、对手与己方强度',
    decisionView: '俱乐部决策视图',
    decisionViewMeta: '校正后的竞技下限、常态、上限与强敌表现；分位均在同分路高样本池内计算。',
    competitiveFloor: '竞技下限',
    typicalLevel: '常态水平',
    competitiveCeiling: '竞技上限',
    strongOpponentTest: '强敌检验',
    strongOpponentMeta: '强档对手表现按证据量向同位置中位（第 50 百分位）收缩',
    strongRetention: '强敌保持度',
    modelRange: '90% 模型估计区间',
    evidenceQuality: '证据质量',
    effectiveMaps: '有效地图样本',
    effectiveOpponents: '有效对手数',
    opponentsCount: '个对手',
    mapTypes: '地图类型覆盖',
    mapBalance: '地图均衡',
    decisionRead: '综合研判',
    mapLossRetention: '败图保持度',
    expectedWin: '平均赛前预期胜率',
    matureCoverage: '成熟对手评级覆盖',
    strongestOpponents: '最高强度对手证据',
    strongestOpponentsMeta: '对手评分只使用比赛开始前已发生的正常赛果；弃权和行政判罚不更新评分。',
    rawContextScore: '原始表现',
    adjustedContextScore: '校正后',
    tacticalHypothesis: '战术适配假设',
    tacticalHypothesisMeta: '供教练结合自身阵容结构与职责需求判断。',
    strongestMapType: '最高校正表现地图类型',
    strongestMapTypeMeta: '已中和对手、己方队伍与全局地图类型环境；至少需要 2 图。',
    vodChecklist: '录像复核清单',
    vodChecklistMeta: '这些问题不能由当前比赛统计单独回答。',
    observation: '数据观察',
    interpretation: '分析判断',
    verification: '录像验证',
    insufficientContext: '样本不足，不作方向性判断',
    evidence: '数据依据',
    analystRead: '分析判断',
    risks: '风险与待验证项',
    noAbsoluteWeakness: '当前公开数据没有形成明确短板；以下为相对于其高水平综合画像的观察项。',
    roleProfile: '同职责技术画像',
    roleProfileMeta: '第 50 百分位为同职责中位；数值均按每 10 分钟标准化。',
    playerValue: '选手',
    heroPool: '英雄池结构',
    heroPoolMeta: '使用占比反映本届赛事记录，不等同于选手完整英雄池。',
    usage: '使用占比',
    recentTrend: '最近十张地图走势',
    recentTrendMeta: '细分位置逐图环境校正影响分，仅用于识别波动，不单独作为优缺点结论。',
    recentMatches: '近期比赛证据',
    opponent: '对手',
    result: '赛果',
    compare: '同位置决策对比室',
    compareMeta: '在同一细分位置内同时读取技术指纹、环境修正与模型不确定性；不同职责不直接比较原始数值。',
    player: '选手',
    nationality: '国籍',
    battleTag: '战网 ID',
    teamPlacement: '队伍最终成绩',
    role: '职责',
    topStrength: '最突出指标',
    watchpoint: '观察项',
    methodology: '方法说明',
    methodologyItems: [
      '只纳入至少 20 张地图、200 分钟和 6 场比赛的高样本选手。',
      '分析池固定为坦克、长枪、自由人、群辅、枪辅各 5 人；第 1 名为技术首选，第 2–3 名为核心候选，第 4 名为延伸层，第 5 名为观察层，并按英雄实际出场分钟的主要占比确定分路。',
      'Selection v2.7 只用该细分位置对应英雄的逐图表现，并为坦克、长枪、自由人、群辅和枪辅分别设置选拔权重；群辅提高竞技下限、稳定性与证据量，自由人提高英雄池迁移性，避免一套模板衡量所有位置。',
      '选手仍须先通过 20 图、200 分钟、6 场的职责总样本门槛；细分位置至少需要 10 图、100 分钟、4 场。未达到 20 图、200 分钟、6 场的完整细分位置证据时，模型分向中性值连续收缩，不使用硬断点拔高或淘汰。',
      '名单稳定度将七项权重各自在 ±30% 范围内变化并重复 5,000 次：前三候选统计保留前三，延伸层统计保留前四，观察层统计进入前四的比例。它衡量模型偏好敏感度，不是抽样置信区间。',
      '部署画像由基线可靠度、高压准备度和环境迁移性三项组合指标构成；三项按五个位置分别加权，具体权重见方法附录。',
      '四种用人侧重均在完整 34 人合格池内按细分位置计算；同时报告完整池顺位与公开 5 人名单顺位，以保留专项候选的相对位置。',
      '部署说明书的英雄 × 地图单元至少需 2 图、2 场比赛、12 分钟且证据量达到 45%；阵容核心与同位置搭档环境至少需 3 图、2 场、20 分钟且达到 45%。通过门槛后仍向个人基线收缩；同图共现只描述条件相关性，不证明因果协同。',
      '队伍强度从 1500 起步，按时间顺序用逐图正常赛果更新；每张地图只读取开赛前评分，弃权和行政判罚不参与更新，避免未来信息泄漏。',
      '环境校正按坦克、长枪、自由人、群辅和枪辅分别拟合，先以层级收缩中和主要英雄、同图前排与同职责搭档，再校正地图类型、对手强度和己方队伍强度；英雄与阵容项当前仅以 10% 校准权重进入选拔分，结果是比较工具，不直接证明个人因果或未来化学反应。',
      '竞技下限、常态和上限分别取校正后逐图表现的加权 25%、50% 和 75% 分位；90% 区间按比赛聚类计算，并取逐图与逐场标准误中更保守的一项，避免把同场地图误当成完全独立样本。',
      'OVR 使用英雄类型权重；公开指标采用同职责分位，避免跨职责比较原始数值。',
      '“风险”表示数据中的相对观察项，不等同于能力缺陷，仍需结合阵容与比赛语境。',
      '稳定性以该细分位置逐图环境校正影响分的变异系数计算并转为同分路分位；有效英雄数按该分路内 1 / Σ(使用占比²) 折算。',
      '大赛阶段验证综合校正后的季后赛表现与相对前期变化，并按季后赛地图和场次数量向中性值收缩；没有合格季后赛样本时记为中性，不奖励或惩罚。',
      '稳定性、近期变化、胜负与阶段拆分均为描述性证据；不从相关性直接推断个人原因。',
      '每名选手的独立结论由指标画像、情境校正、表现边界和角色适配联合生成，不以单项排名替代整体判断。'
    ],
    printPdf: '打印 / 导出 PDF',
    highConfidence: '高置信度',
    per10: '每 10 分钟',
    win: '胜',
    loss: '负',
    draw: '平',
    unknown: '胜负标记未录入'
  },
  'en-US': {
    access: 'Dedicated club access',
    title: 'Fries Cup 2026 Player Performance Report',
    titleLead: 'Fries Cup 2026',
    titleReport: 'Player Performance Report',
    subtitle: 'Technical profiles built from role-relative output, sample confidence and hero-pool structure.',
    confidential: 'CONFIDENTIAL · TECHNICAL ANALYSIS',
    qualifiedPool: 'High-sample pool',
    prototype: 'Complete technical pool',
    sampleGate: 'Minimum sample gate',
    sampleGateValue: '20 maps · 200 minutes · 6 matches',
    roleRank: 'Subrole rank',
    shortlistRank: 'Current published-list rank',
    publicTier: 'Published-list tier',
    publicListOrder: 'Fixed published-list order',
    publicListOrderShort: 'LIST',
    emphasisRankShort: 'EMPHASIS',
    publishedCandidates: 'published candidates',
    rankScopeGuide: 'Large rank = order among the published five for this emphasis · tier = fixed published-list tier · full pool = all qualified players',
    subrole: 'Subrole',
    subroleFit: 'Subrole usage',
    selectionScore: 'Base model score',
    selectionScorePrimary: 'Selection v2.7 evidence-shrunk base score',
    rawPerformance: 'Raw competitive output',
    executiveTitle: 'Club decision summary',
    executiveMeta: 'A 25-player technical pool by subrole: 5 technical primaries, 10 core candidates, 5 extended candidates and 5 watch candidates.',
    commandTitle: 'Five-position candidate overview',
    commandMeta: 'Evaluate each position independently. Start with the technical primary, separation, evidence quality and stress tests, then open the position assessment or player dossier.',
    roleCockpit: 'Candidate technical assessment',
    roleCockpitMeta: 'Compare five candidates on immediate readiness, pressure performance and hero-pool fit. Change the selection emphasis to update the technical order.',
    backAllMarkets: 'Back to all positions',
    marketVerdict: 'Position read',
    candidateDecisionStack: 'Candidate order for this emphasis',
    heroLineupAdjusted: 'Context-adjusted performance',
    contextCoverage: 'Lineup data coverage',
    lineupAnchors: 'frontline contexts',
    partnerContexts: 'partner contexts',
    calibrationWeight: 'calibration weight',
    openFullDossier: 'View technical dossier',
    roleFocusCaution: 'Hero and same-map lineup context enter the score through shrinkage adjustment at a capped 10% weight. The ranking covers technical priority only; it does not judge signing interest, communication or future lineup chemistry.',
    commandLineup: 'Selection emphasis',
    commandPortfolio: 'Candidate structure',
    commandEnvelope: 'Competitive range and pressure signal',
    commandEnvelopeMeta: 'The band connects the in-subrole positions of the competitive floor and ceiling; the white dot is typical level and the diamond is strong-opponent validation.',
    commandWatchRole: 'Primary lead',
    commandCaution: 'The five positions are analysed independently. This view reports recorded technical evidence and model sensitivity, not lineup chemistry, communication or signing interest.',
    audienceMode: 'Decision perspective',
    managerView: 'Manager view',
    coachView: 'Coach view',
    managerViewMeta: 'Candidate structure, separation and decision risk',
    coachViewMeta: 'Complete technical evidence, model audit and method',
    marketFlowTitle: 'Candidate movement by selection emphasis',
    marketFlowMeta: 'Read across to see how one candidate moves under four selection emphases, and down to compare priorities under the same emphasis.',
    marketFlowLocked: 'Primary unchanged',
    marketFlowOpen: 'Emphasis changes the primary',
    marketFlowCoverage: 'Full candidate pool',
    marketFlowComplete: 'The current five cover every top three across all four emphases',
    marketFlowPartial: 'A boundary candidate appears outside the five under at least one emphasis',
    marketMatrixCandidate: 'Candidate',
    marketMatrixSensitivity: 'Rank movement',
    marketMatrixStable: 'Essentially unchanged',
    marketMatrixMinor: 'Small movement',
    marketMatrixSensitive: 'Clear movement',
    marketMatrixLeader: 'Current #1',
    marketMatrixGap: 'Behind primary',
    marketMatrixCurrent: 'Current emphasis',
    marketMatrixHowToRead: 'FIT = technical fit · # = full-pool position rank · highlight = #1 under this emphasis',
    managerRankHowToRead: 'Top row = technical primary under each emphasis · lower row = current top three and their four-emphasis rank range',
    poolRank: 'Full-pool position rank',
    decisionTrail: 'Model decision evidence',
    decisionTrailMeta: 'Context correction, seven-factor aggregation, sample shrinkage and downside stress are reported independently on their own scales.',
    rawSignal: 'Hero and lineup context correction',
    adjustedSignal: 'Seven-factor composite',
    evidenceShrinkage: 'Sample-confidence shrinkage',
    stressFloor: 'Stress floor',
    topOneProbability: 'Weight-trial lead rate',
    decisionTrailCaution: 'This probability comes from 5,000 model-weight reruns, not signing odds. Communication, shot-calling, ultimate timing and lineup chemistry remain unmeasured by match statistics.',
    commandFloor: 'Floor',
    commandTypical: 'Typical',
    commandCeiling: 'Ceiling',
    commandStrong: 'Strong',
    marketStructure: 'Candidate structure',
    marketClearLeader: 'Clear separation',
    marketFitLeadSupported: 'FIT leader · evidence supported',
    marketFitLeadOverlap: 'FIT leader · intervals overlap',
    marketFitLeadReview: 'FIT leader · order needs review',
    marketOpenRace: 'Top three close',
    marketTierBreak: 'Top-three tier formed',
    marketCompetitive: 'Small overall separation',
    marketLeader: 'Technical primary',
    marketRunnerUp: 'Second candidate',
    marketTopGap: 'Primary lead',
    marketTopThreeSpread: 'Top-three gap',
    marketEvidence: 'Primary evidence',
    marketCandidateCount: 'Candidate count',
    marketOpenRole: 'View this position',
    marketActive: 'Viewing',
    marketAllPositions: '5 positions assessed independently',
    rankingStressTest: 'Ranking stress test',
    stressStable: 'Robust',
    stressSensitive: 'Mildly sensitive',
    stressFragile: 'Highly sensitive',
    removeWeakOpponent: 'Remove weakest opponent',
    leaveOneMatchOut: 'Leave one match out',
    rankNoDrop: 'No rank drop',
    rankDrop: 'Worst drop',
    stressMethodMeta: 'Only the opponent-adjusted factor is replaced before reranking; the other six factors and evidence shrinkage stay fixed.',
    publicDossiers: 'Public technical dossiers',
    stableSeats: 'Stable seats',
    sensitiveSeats: 'Seats to review',
    scoreLegend: 'Selection v2.7 uses position-specific weights and adds shrinkage-adjusted primary-hero and same-map lineup context on top of map, opponent and own-team correction. OVR remains an unsplit season reference.',
    selectionStability: 'Roster stability',
    preferenceSensitivity: 'Weight sensitivity',
    preferenceSensitivityMeta: 'Across 5,000 ±30% weight reruns: priority measures top-three retention, extended top-four retention and watch top-four entry. This is not a statistical confidence interval.',
    evidenceConfidence: 'Evidence confidence',
    stable: 'Stable',
    watch: 'Review',
    boundary: 'Boundary',
    decisionBrief: 'Decision brief',
    whyShortlisted: 'Why shortlisted',
    decisionRisks: 'Primary watchpoints',
    summaryNav: 'Summary',
    contextNav: 'Context',
    profileNav: 'Profile',
    matchesNav: 'Match evidence',
    methodNav: 'Method',
    comparisonRead: 'Comparison read',
    similarBand: 'Similar model band',
    clearModelLead: 'Clear model lead',
    comparisonProfile: 'Subrole metric comparison',
    comparisonProfileMeta: 'Each row compares one subrole-relative percentile metric (0–100; higher ranks further ahead), with player names and exact values shown on the same scale.',
    comparisonModelAudit: 'Model credibility audit',
    comparisonModelAuditMeta: 'Raw output, context adjustment, model range, evidence and weight sensitivity are reported separately for review of the total-score structure.',
    comparisonDecision: 'Current decision read',
    comparisonLeader: 'Model primary',
    comparisonAlternate: 'Nearest alternative',
    comparisonLargestEdge: 'Largest separator',
    comparisonEvidenceRisk: 'Lowest-evidence case',
    comparisonReranked: 'Ranks changed by adjustment',
    comparisonIntervalStatus: 'Top interval relationship',
    comparisonIntervalOverlap: 'Intervals overlap',
    comparisonIntervalSeparated: 'Intervals separate',
    comparisonAuditTable: 'Open full metric audit table',
    comparisonAuditTableMeta: 'Complete metrics, model intervals and evidence quality for coaching review.',
    comparisonNeedTwo: 'Select at least two players from the same subrole to generate a decision read.',
    deploymentMatrix: 'Position deployment maps',
    deploymentMatrixMeta: 'Each position is charted independently: everyday stability on the x-axis, pressure-game retention on the y-axis, and context portability ranked separately from hero and map coverage.',
    deploymentCandidateCount: 'candidates',
    deploymentCoreCount: 'core-starter zone',
    deploymentBestBalance: 'best deployment balance',
    deploymentPortabilityLeader: 'portability leader',
    deploymentPortabilityRanking: 'Context portability ranking',
    deploymentThreshold: 'Reference threshold 65',
    quadrantCore: 'Core starter zone',
    quadrantPressure: 'Pressure option zone',
    quadrantReliable: 'Reliable base zone',
    quadrantTargeted: 'Targeted review zone',
    baselineReliability: 'Baseline reliability',
    pressureReadiness: 'Pressure readiness',
    contextPortability: 'Context portability',
    deploymentProfile: 'Deployment profile',
    deploymentProfileMeta: 'Competitive floor, strong-opponent and playoff validation, hero breadth and map-type performance compressed into three traceable usage dimensions.',
    deploymentMode: 'Usage mode',
    modeCoreReady: 'Core rotation',
    modeReliableBase: 'Reliable baseline',
    modePressureOption: 'Pressure option',
    modeBalanced: 'Balanced review',
    modeTargetedUse: 'Targeted deployment',
    mapTypeReadiness: 'Map-type readiness',
    mapTypeReadinessMeta: 'Performance is neutralised for map type, primary hero, same-map lineup, opponent and own-team strength; percentiles are within subrole.',
    opponentTierCurve: 'Opponent-tier curve',
    opponentTierCurveMeta: 'Low, middle and strong tiers use the 33rd / 67th percentiles of pre-match opponent rating, with no post-match information.',
    heroContextEvidence: 'Primary-hero context evidence',
    heroContextEvidenceMeta: 'Adjusted output split by the primary hero on each map; this describes only recorded tournament usage.',
    strongTier: 'Strong tier',
    peerTier: 'Middle tier',
    lowerTier: 'Lower tier',
    retentionVsBaseline: 'Versus player baseline',
    contextConfidence: 'Context evidence',
    insufficientTier: 'Insufficient sample for a directional comparison',
    deploymentFormula: 'Baseline = 60% competitive floor + 40% consistency; pressure = 55% strong-opponent test + 45% stage validation; portability = 45% hero breadth + 30% map coverage + 25% map balance.',
    deploymentCaution: 'This is a deployment profile from recorded match conditions; it does not predict chemistry between players who have never competed together.',
    deploymentPlaybook: 'Player deployment playbook',
    deploymentPlaybookMeta: 'Only hero and lineup contexts clearing map, match, minute and evidence gates are shown.',
    recommendedUse: 'Primary deployment',
    alternateUse: 'Usable alternative',
    watchUse: 'Conditional use',
    heroMapMatrix: 'Hero × map type',
    heroMapMatrixMeta: 'Each cell is retention versus the player’s own adjusted baseline; 100% equals their tournament-average context.',
    lineupContextFit: 'Lineup-context fit',
    lineupContextFitMeta: 'Same-map hero co-occurrence describes recorded conditions only and does not establish causal synergy.',
    lineupAnchor: 'Lineup anchor',
    sameRolePartner: 'Same-role partner context',
    evidenceGate: 'Sample gate',
    eligibleContexts: 'eligible contexts',
    contextRetention: 'baseline retention',
    primaryDeployment: 'Recommended use',
    alternateDeployment: 'Alternative use',
    deploymentRisk: 'Primary risk',
    noWatchContext: 'No clearly low context passes the sample gate.',
    insufficientDeploymentContext: 'No further context clears the sample gate, so no directional read is made.',
    contextAssociationCaution: 'Same-map co-occurrence is not evidence of chemistry or causal synergy; film and communication assessment remain with the club.',
    contextPrimary: 'Advantage context',
    contextStable: 'Stable context',
    contextConditional: 'Conditional context',
    comparisonDeploymentRead: 'Deployment difference read',
    comparisonDeploymentReadMeta: 'Only each candidate’s highest eligible usage context is shown, making overlapping technical routes easy to spot.',
    recruitmentScenarioBoard: 'Selection-emphasis fit',
    recruitmentScenarioMeta: 'Select a position to rerank its five candidates under four evaluation emphases. Positions remain independent and are not combined into a hypothetical lineup.',
    scenarioBalanced: 'Balanced profile',
    scenarioBalancedMeta: 'Balances readiness, reliability, pressure performance and hero-pool fit.',
    scenarioReliableCore: 'Immediate readiness',
    scenarioReliableCoreMeta: 'Prioritises competitive floor and repeatable output.',
    scenarioPressureMatch: 'Pressure & key matches',
    scenarioPressureMatchMeta: 'Prioritises strong-opponent and playoff performance.',
    scenarioFlexiblePool: 'Hero pool & rotation',
    scenarioFlexiblePoolMeta: 'Prioritises hero breadth, map coverage and portability.',
    scenarioPrimary: 'Technical primary',
    scenarioAlternate: 'Second candidate',
    scenarioFitScore: 'Technical fit',
    scenarioRank: 'Position rank',
    scenarioAverageFit: 'Primary fit',
    scenarioFloorFit: 'Primary lead',
    scenarioEvidence: 'Average evidence',
    scenarioRoleCoverage: 'Candidate count',
    scenarioWithinPool: 'Published position pool',
    scenarioBoardCaution: 'Technical fit only orders follow-up within the active position. It does not infer communication, signing interest or unrecorded team fit.',
    scenarioFormulaBalanced: 'Selection 25% · baseline 25% · pressure 20% · portability 15% · evidence 10% · roster stability 5%',
    scenarioFormulaReliableCore: 'Selection 20% · baseline 40% · pressure 15% · portability 10% · evidence 10% · roster stability 5%',
    scenarioFormulaPressureMatch: 'Selection 20% · baseline 15% · pressure 40% · portability 10% · evidence 10% · roster stability 5%',
    scenarioFormulaFlexiblePool: 'Selection 20% · baseline 15% · pressure 10% · portability 40% · evidence 10% · roster stability 5%',
    scenarioFitTitle: 'Technical fit by selection emphasis',
    scenarioFitMeta: 'The same technical evidence is read under four selection emphases, alongside the player’s position rank in the full qualified pool.',
    slotPlan: 'Roster structure',
    slotPlanMeta: 'The fixed published-list tier contains five players per position: list #1 is the technical primary, #2–3 core, #4 extended and #5 watch. Selection-emphasis order may move without rewriting this tier.',
    selectionModel: 'Selection model',
    selectionModelMeta: 'Subrole performance 25% · context adjustment 20% · competitive floor 15% · map consistency 15% · stage validation 10% · subrole evidence 10% · in-subrole hero pool 5%; incomplete evidence shrinks toward the position median (50th percentile).',
    slots: 'slots',
    qualifiedCandidates: 'qualified candidates',
    priorityTier: 'Primary & core candidates',
    extendedTier: 'Extended review',
    watchTier: 'Watch pool',
    subroleEvidence: 'Subrole evidence',
    fullEvidence: 'Full evidence',
    partialEvidence: 'Shrunk evidence',
    maps: 'maps',
    minutes: 'minutes',
    matches: 'matches',
    heroes: 'heroes',
    primaryHero: 'Primary hero',
    sampleDepth: 'Sample depth',
    strengths: 'Data strengths',
    relativeWatch: 'Relative watchpoint',
    roleMedian: 'Role median',
    loading: 'Loading technical analysis…',
    loadingDetail: 'Preparing the five-position candidate summary and published-list order.',
    loadingPlayer: 'Loading full player dossier…',
    loadingPlayerDetail: 'Preparing the complete decision evidence for this player.',
    error: 'Technical analysis data is temporarily unavailable.',
    invalidTitle: 'This dedicated link is unavailable',
    invalidBody: 'The link may have been revoked, expired or entered incorrectly. Request a new access URL from the report provider.',
    prototypeNote: 'All 25 players receive technical dossiers. List #1–#5 here means fixed published-list order: #1 is the technical primary, #2–3 core, #4 extended and #5 watch—not the dynamic order under the current selection emphasis.',
    talentMap: 'Talent distribution',
    talentMapMeta: 'Selection score × sample depth. The score includes opponent strength, own-team environment and map-type adjustment.',
    performance: 'Selection score',
    sampleIndex: 'Sample depth index',
    selectedDossiers: '25-player tiered dossier pool',
    allRoles: 'All subroles',
    seasonView: 'Full season',
    playoffsView: 'Playoff slice',
    viewScope: 'Data scope',
    filterSubrole: 'Subrole filter',
    openDossier: 'Open full dossier',
    backToPool: 'Back to 25-player pool',
    previousPlayer: 'Previous player',
    nextPlayer: 'Next player',
    reportVersion: 'Report version',
    modelVersion: 'Scoring model',
    dataAsOf: 'Data as of',
    invalidPlayer: 'This player is not in the current public 25-player analysis pool.',
    playoffMaps: 'Playoff maps',
    stageDelta: 'Versus earlier stages',
    insufficientPlayoff: 'Below the playoff-stage sample gate',
    compareSelect: 'Select two or three players from the same subrole',
    compareLimit: 'Maximum three players',
    selectedCountLabel: 'Selected',
    analystVerdict: 'Analyst verdict',
    archetype: 'Technical archetype',
    analystWorkbench: 'Individual deep analysis',
    analystWorkbenchMeta: 'Role benchmarks, context adjustment, performance bounds and pressure tests are combined in one decision framework.',
    consistency: 'Output consistency',
    consistencyMeta: 'Percentile within the assigned subrole pool',
    middle50: 'Middle 50% range',
    recentForm: 'Recent form',
    recentFormMeta: 'Last 5 maps versus the previous 5',
    effectivePool: 'Effective hero count',
    effectivePoolMeta: 'Usage-distribution adjusted; not a raw count',
    coverage80: 'Covers 80% of recorded time',
    pressureContext: 'Adverse-result change',
    pressureContextMeta: 'Adjusted loss-map performance retained relative to win maps',
    playoffContext: 'Playoffs versus earlier stages',
    stageValidation: 'Stage validation',
    stageValidationMeta: 'Sample-shrunk percentile combining adjusted playoff level and stage retention',
    stageConfidence: 'Stage-evidence confidence',
    opponentStrength: 'Opponent schedule strength',
    opponentStrengthMeta: 'Minute-weighted pre-match team rating',
    contextAdjusted: 'Context-adjusted performance',
    contextAdjustedMeta: 'Neutralises map, hero, same-map lineup, opponent and own-team strength',
    decisionView: 'Club decision view',
    decisionViewMeta: 'Adjusted competitive floor, typical level, ceiling and strong-opponent performance, all ranked within the qualified subrole pool.',
    competitiveFloor: 'Competitive floor',
    typicalLevel: 'Typical level',
    competitiveCeiling: 'Competitive ceiling',
    strongOpponentTest: 'Strong-opponent test',
    strongOpponentMeta: 'Strong-opponent evidence is shrunk toward the position median (50th percentile) by sample confidence',
    strongRetention: 'Strong-opponent retention',
    modelRange: '90% model interval',
    evidenceQuality: 'Evidence quality',
    effectiveMaps: 'Effective map sample',
    effectiveOpponents: 'Effective opponents',
    opponentsCount: 'opponents',
    mapTypes: 'Map-type coverage',
    mapBalance: 'map balance',
    decisionRead: 'Decision read',
    mapLossRetention: 'Loss-map retention',
    expectedWin: 'Average pre-match win expectation',
    matureCoverage: 'Mature-rating coverage',
    strongestOpponents: 'Highest-strength opponent evidence',
    strongestOpponentsMeta: 'Opponent ratings use only normal results available before each match; forfeits and administrative rulings do not update ratings.',
    rawContextScore: 'Raw performance',
    adjustedContextScore: 'Adjusted',
    tacticalHypothesis: 'Tactical-fit hypothesis',
    tacticalHypothesisMeta: 'For coaches to assess against their own composition and role requirements.',
    strongestMapType: 'Best adjusted map type',
    strongestMapTypeMeta: 'Neutralised for opponent, own-team and global map-type environment; minimum two maps.',
    vodChecklist: 'VOD verification checklist',
    vodChecklistMeta: 'These questions cannot be answered by the current match statistics alone.',
    observation: 'Data observation',
    interpretation: 'Analyst interpretation',
    verification: 'VOD verification',
    insufficientContext: 'Insufficient sample for a directional read',
    evidence: 'Data evidence',
    analystRead: 'Analyst read',
    risks: 'Risks and verification points',
    noAbsoluteWeakness: 'The public data does not show a clear weakness. The items below are relative watchpoints within an otherwise high-level profile.',
    roleProfile: 'Role-relative technical profile',
    roleProfileMeta: 'The 50th percentile is the role median. All values are standardised per 10 minutes.',
    playerValue: 'Player',
    heroPool: 'Hero-pool structure',
    heroPoolMeta: 'Usage reflects recorded tournament play, not the player’s complete hero pool.',
    usage: 'Usage',
    recentTrend: 'Last ten maps',
    recentTrendMeta: 'Context-adjusted map impact for the assigned subrole; used to identify volatility, not as a standalone verdict.',
    recentMatches: 'Recent match evidence',
    opponent: 'Opponent',
    result: 'Result',
    compare: 'Same-subrole decision room',
    compareMeta: 'Read technical fingerprints, context adjustment and model uncertainty together within one subrole. Raw values are not compared across roles.',
    player: 'Player',
    nationality: 'Nationality',
    battleTag: 'Battle.net ID',
    teamPlacement: 'Team finish',
    role: 'Role',
    topStrength: 'Leading metric',
    watchpoint: 'Watchpoint',
    methodology: 'Methodology',
    methodologyItems: [
      'Only players with at least 20 maps, 200 minutes and 6 matches enter the high-sample pool.',
      'The pool reserves five slots each for Tank, Hitscan, Flex DPS, Main Support and Flex Support. Rank 1 is the technical primary, ranks 2–3 are core candidates, rank 4 extended and rank 5 watch; primary subrole follows actual hero-minute share.',
      'Selection v2.7 scores only maps on heroes from the assigned subrole and uses separate selection weights for Tank, Hitscan, Flex DPS, Main Support and Flex Support. Main Support places more weight on floor, consistency and evidence; Flex DPS places more on portability.',
      'Players must first clear the 20-map, 200-minute, 6-match overall-role gate; a subrole requires at least 10 maps, 100 minutes and 4 matches. Until it reaches 20 maps, 200 minutes and 6 matches, the model score is continuously shrunk toward neutral instead of using a hard cliff.',
      'Roster stability varies each of the seven weights by ±30% across 5,000 reruns. The leading three use top-three retention, extended candidates top-four retention and watch candidates top-four entry rate. It measures preference sensitivity, not sampling confidence.',
      'The deployment profile combines baseline reliability, pressure readiness and context portability. Each position uses its own internal weights, documented in this methodology.',
      'All four selection emphases are calculated by subrole inside the complete 34-player qualified pool. Both full-pool and published-five ranks are reported to preserve each specialist’s relative position.',
      'A hero × map cell requires at least 2 maps, 2 matches, 12 minutes and 45% evidence; lineup-anchor and same-role partner contexts require 3 maps, 2 matches, 20 minutes and 45%. Eligible contexts remain shrunk toward the player baseline, and same-map co-occurrence does not establish causal synergy.',
      'Team strength starts at 1500 and updates chronologically from normal map results. Every map reads only the pre-match rating; forfeits and administrative rulings are excluded to prevent future-information leakage.',
      'Context adjustment is fitted separately for Tank, Hitscan, Flex DPS, Main Support and Flex Support. Hierarchical shrinkage first neutralises primary hero, same-map frontline and same-role partner context, then adjusts map type, opponent and own-team strength. Hero/lineup context currently enters selection at a 10% calibration weight; this is a comparison tool, not proof of causality or future chemistry.',
      'Competitive floor, typical level and ceiling are the weighted 25th, 50th and 75th percentiles of adjusted map performance. The 90% interval is match-clustered and uses the more conservative of map- and match-level standard errors.',
      'OVR uses hero-profile weights; public metrics use role-relative percentiles rather than cross-role raw values.',
      'A risk is a relative data watchpoint, not a confirmed flaw, and still requires composition and match context.',
      'Consistency ranks the coefficient of variation of context-adjusted map impact within the assigned subrole; effective hero count is 1 / Σ(in-subrole usage share²).',
      'Stage validation combines context-adjusted playoff level and change from earlier stages, then shrinks toward neutral according to playoff map and match volume. Players without a qualified playoff sample remain neutral.',
      'Consistency, recent change, result and stage splits are descriptive evidence; correlation is not treated as an individual cause.',
      'Each individual read combines the metric profile, context adjustment, performance bounds and role fit instead of substituting a single rank for the full assessment.'
    ],
    printPdf: 'Print / Export PDF',
    highConfidence: 'High confidence',
    per10: 'per 10 minutes',
    win: 'Win',
    loss: 'Loss',
    draw: 'Draw',
    unknown: 'Win/loss flag not recorded'
  },
  'ko-KR': {
    access: '구단 전용 액세스',
    title: 'Fries Cup 2026 선수 경기력 분석 보고서',
    titleLead: 'Fries Cup 2026',
    titleReport: '선수 경기력 분석 보고서',
    subtitle: '동일 역할 대비 지표, 표본 신뢰도와 영웅 폭을 바탕으로 대회 내 기술 프로필을 제시합니다.',
    confidential: 'CONFIDENTIAL · TECHNICAL ANALYSIS',
    qualifiedPool: '고표본 후보군',
    prototype: '전체 기술 분석군',
    sampleGate: '최소 표본 기준',
    sampleGateValue: '20개 전장 · 200분 · 6경기',
    roleRank: '세부 역할 순위',
    shortlistRank: '현재 공개 후보 순위',
    publicTier: '공개 명단 단계',
    publicListOrder: '고정 공개 명단 순위',
    publicListOrderShort: '명단',
    emphasisRankShort: '초점',
    publishedCandidates: '공개 후보',
    rankScopeGuide: '큰 순위 = 현재 평가 초점의 공개 5인 순서 · 명단 단계 = 고정 공개 분류 · 전체 후보군 = 모든 적격 선수 순위',
    subrole: '세부 역할',
    subroleFit: '세부 역할 출전',
    selectionScore: '기초 모델 점수',
    selectionScorePrimary: 'Selection v2.7 근거 축소 기초 점수',
    rawPerformance: '원시 경기력',
    executiveTitle: '구단 의사결정 요약',
    executiveMeta: '세부 역할별 25인 기술 풀을 기술 1순위 5명, 핵심 후보 10명, 확장 후보 5명, 관찰 후보 5명으로 제시합니다.',
    commandTitle: '5개 포지션 후보 개요',
    commandMeta: '각 포지션의 후보를 독립적으로 비교합니다. 기술 1순위, 격차, 근거 품질과 순위 스트레스 테스트를 먼저 확인한 뒤 포지션 평가나 선수 기술 리포트로 이동합니다.',
    roleCockpit: '후보 기술 평가',
    roleCockpitMeta: '현재 포지션 후보 5명의 즉시 전력, 압박 경기력과 영웅 폭 적합도를 비교합니다. 평가 초점을 바꾸면 기술 우선순위도 함께 갱신됩니다.',
    backAllMarkets: '전체 포지션으로',
    marketVerdict: '포지션 결론',
    candidateDecisionStack: '현재 평가 초점의 후보 순서',
    heroLineupAdjusted: '환경 보정 경기력',
    contextCoverage: '라인업 정보 범위',
    lineupAnchors: '전방 환경',
    partnerContexts: '파트너 환경',
    calibrationWeight: '보정 가중치',
    openFullDossier: '기술 리포트 보기',
    roleFocusCaution: '영웅 및 동일 전장 라인업 환경은 축소 방식으로 점수에 반영되며 가중치는 10%로 제한됩니다. 이 순위는 기술 우선순위만 제시하며 계약 의향, 소통 능력, 향후 라인업 시너지는 판단하지 않습니다.',
    commandLineup: '평가 초점',
    commandPortfolio: '후보 구조',
    commandEnvelope: '경기 범위와 강팀 신호',
    commandEnvelopeMeta: '색상 구간은 같은 세부 역할 내 경기 하한과 상한의 상대 위치를 연결합니다. 흰 점은 일반 수준, 마름모는 강팀 검증입니다.',
    commandWatchRole: '1순위 우위',
    commandCaution: '5개 포지션은 독립적으로 분석합니다. 기록된 기술 근거와 모델 민감도만 제시하며 라인업 시너지, 소통이나 계약 의향을 추론하지 않습니다.',
    audienceMode: '의사결정 관점',
    managerView: '매니저 화면',
    coachView: '코치 화면',
    managerViewMeta: '후보 구조, 1순위 우위와 의사결정 위험',
    coachViewMeta: '전체 기술 근거, 모델 감사와 방법론',
    marketFlowTitle: '평가 초점별 후보 변화',
    marketFlowMeta: '가로로는 한 후보가 네 가지 평가 초점에서 어떻게 이동하는지, 세로로는 같은 초점에서 후보 우선순위를 비교합니다.',
    marketFlowLocked: '1순위 유지',
    marketFlowOpen: '평가 초점에 따라 1순위 변경',
    marketFlowCoverage: '전체 후보군',
    marketFlowComplete: '현재 5명이 네 가지 초점의 상위 3명을 모두 포함',
    marketFlowPartial: '평가 초점에 따라 공개 5인 밖의 경계 후보가 등장',
    marketMatrixCandidate: '후보',
    marketMatrixSensitivity: '순위 변화',
    marketMatrixStable: '변화 없음',
    marketMatrixMinor: '소폭 변화',
    marketMatrixSensitive: '뚜렷한 변화',
    marketMatrixLeader: '현재 1위',
    marketMatrixGap: '1위와 격차',
    marketMatrixCurrent: '현재 초점',
    marketMatrixHowToRead: 'FIT = 기술 적합도 · # = 전체 후보군 포지션 순위 · 강조 칸 = 현재 초점 1위',
    managerRankHowToRead: '위 = 평가 초점별 기술 1순위 · 아래 = 현재 상위 3명과 네 가지 초점의 순위 범위',
    poolRank: '전체 후보군 포지션 순위',
    decisionTrail: '모델 판단 근거',
    decisionTrailMeta: '환경 보정, 7개 요인 합성, 표본 축소와 하방 스트레스를 각 척도에 따라 독립적으로 제시합니다.',
    rawSignal: '영웅·라인업 환경 보정',
    adjustedSignal: '7개 요인 종합',
    evidenceShrinkage: '표본 신뢰도 축소',
    stressFloor: '스트레스 하한',
    topOneProbability: '가중치 반복 1위율',
    decisionTrailCaution: '이 확률은 5,000회 모델 가중치 반복 결과이며 영입 성공 확률이 아닙니다. 소통, 콜, 궁극기 타이밍과 라인업 시너지는 경기 통계로 직접 측정되지 않습니다.',
    commandFloor: '하한',
    commandTypical: '일반',
    commandCeiling: '상한',
    commandStrong: '강팀',
    marketStructure: '후보 구조',
    marketClearLeader: '1순위 우위 명확',
    marketFitLeadSupported: 'FIT 1위 · 근거 안정',
    marketFitLeadOverlap: 'FIT 1위 · 구간 중첩',
    marketFitLeadReview: 'FIT 1위 · 순위 재검토',
    marketOpenRace: '상위 3명 근접',
    marketTierBreak: '상위 3명 티어 형성',
    marketCompetitive: '전체 격차 작음',
    marketLeader: '기술 1순위',
    marketRunnerUp: '2순위 후보',
    marketTopGap: '1순위 우위',
    marketTopThreeSpread: '상위 3명 격차',
    marketEvidence: '1순위 근거',
    marketCandidateCount: '후보 수',
    marketOpenRole: '포지션 보기',
    marketActive: '현재 보기',
    marketAllPositions: '5개 포지션 개별 평가',
    rankingStressTest: '순위 스트레스 테스트',
    stressStable: '강건 안정',
    stressSensitive: '경미한 민감',
    stressFragile: '높은 민감',
    removeWeakOpponent: '최약 상대 제외',
    leaveOneMatchOut: '경기별 하나 제외',
    rankNoDrop: '순위 하락 없음',
    rankDrop: '최대 하락',
    stressMethodMeta: '상대 보정 요인만 교체해 재순위하며 나머지 6개 요인과 근거 축소는 고정합니다.',
    publicDossiers: '공개 기술 리포트',
    stableSeats: '안정 좌석',
    sensitiveSeats: '검토 필요 좌석',
    scoreLegend: 'Selection v2.7 선발 점수는 포지션별 가중치를 사용하고 전장·상대·소속 팀 보정 위에 주요 영웅과 같은 전장 라인업 환경의 축소 보정을 추가합니다. OVR은 역할 미분리 시즌 참고값입니다.',
    selectionStability: '명단 안정도',
    preferenceSensitivity: '가중치 민감도',
    preferenceSensitivityMeta: '7개 가중치를 각각 ±30%로 바꾼 5,000회 반복에서 우선층은 상위 3위 유지, 확장층은 상위 4위 유지, 관찰층은 상위 4위 진입률을 사용합니다. 통계적 신뢰구간이 아닙니다.',
    evidenceConfidence: '근거 신뢰도',
    stable: '안정',
    watch: '검토',
    boundary: '경계',
    decisionBrief: '의사결정 요약',
    whyShortlisted: '선발 근거',
    decisionRisks: '주요 확인 항목',
    summaryNav: '요약',
    contextNav: '환경',
    profileNav: '프로필',
    matchesNav: '경기 근거',
    methodNav: '방법',
    comparisonRead: '비교 결론',
    similarBand: '모델 판단 유사',
    clearModelLead: '모델상 명확한 우위',
    comparisonProfile: '동일 포지션 다면 비교',
    comparisonProfileMeta: '각 행은 동일 세부 역할 백분위 지표(0–100, 높을수록 상대 순위가 높음)를 비교하며 선수명과 정확한 값을 같은 척도에 표시합니다.',
    comparisonModelAudit: '모델 신뢰도 감사',
    comparisonModelAuditMeta: '원시 성과, 환경 보정, 추정 구간, 근거량과 가중치 민감도를 각각 제시해 총점 구조를 검토합니다.',
    comparisonDecision: '현재 의사결정 해석',
    comparisonLeader: '모델 1순위',
    comparisonAlternate: '가장 가까운 대안',
    comparisonLargestEdge: '최대 구분 지표',
    comparisonEvidenceRisk: '최저 근거 선수',
    comparisonReranked: '보정으로 바뀐 순위',
    comparisonIntervalStatus: '상위 구간 관계',
    comparisonIntervalOverlap: '구간 중첩',
    comparisonIntervalSeparated: '구간 분리',
    comparisonAuditTable: '전체 지표 감사표 열기',
    comparisonAuditTableMeta: '후보 차이를 검토할 수 있도록 전체 정밀 지표, 모델 구간과 근거 품질을 제공합니다.',
    comparisonNeedTwo: '의사결정 해석을 만들려면 같은 세부 역할 선수 2명 이상을 선택하세요.',
    deploymentMatrix: '포지션 기용 지도',
    deploymentMatrixMeta: '포지션별로 독립 표시합니다. 가로축은 일상 안정성, 세로축은 강한 경기 유지력이며 환경 전환성은 영웅·전장 적응 범위와 함께 별도 순위로 비교합니다.',
    deploymentCandidateCount: '후보',
    deploymentCoreCount: '핵심 선발 구역',
    deploymentBestBalance: '종합 기용 선두',
    deploymentPortabilityLeader: '전환성 선두',
    deploymentPortabilityRanking: '환경 전환성 순위',
    deploymentThreshold: '참고 기준 65',
    quadrantCore: '핵심 선발 구역',
    quadrantPressure: '압박 옵션 구역',
    quadrantReliable: '안정 기준선 구역',
    quadrantTargeted: '맞춤 검토 구역',
    baselineReliability: '기준선 신뢰도',
    pressureReadiness: '압박 준비도',
    contextPortability: '환경 전환성',
    deploymentProfile: '기용 프로필',
    deploymentProfileMeta: '경기 하한, 강팀·플레이오프 검증, 영웅 폭과 전장 유형 성과를 추적 가능한 세 가지 기용 차원으로 압축합니다.',
    deploymentMode: '기용 유형',
    modeCoreReady: '핵심 로테이션형',
    modeReliableBase: '안정 기준선형',
    modePressureOption: '압박 옵션형',
    modeBalanced: '균형 검토형',
    modeTargetedUse: '맞춤 기용형',
    mapTypeReadiness: '전장 유형 적응',
    mapTypeReadinessMeta: '전장 유형, 주요 영웅, 같은 전장 라인업, 상대와 소속 팀 강도를 중립화했으며 백분위는 같은 세부 역할에서 계산합니다.',
    opponentTierCurve: '상대 등급 곡선',
    opponentTierCurveMeta: '경기 전 상대 레이팅의 33% / 67% 백분위로 하위·중간·강팀 구간을 나누며 경기 후 정보는 사용하지 않습니다.',
    heroContextEvidence: '주요 영웅 환경 근거',
    heroContextEvidenceMeta: '각 전장의 주요 영웅별 보정 경기력이며 본 대회에 기록된 사용 환경만 설명합니다.',
    strongTier: '강팀 구간',
    peerTier: '중간 구간',
    lowerTier: '하위 구간',
    retentionVsBaseline: '개인 기준선 대비',
    contextConfidence: '환경 근거량',
    insufficientTier: '표본 부족으로 방향성 비교 보류',
    deploymentFormula: '기준선＝경기 하한 60%＋출력 안정성 40%; 압박＝강팀 검증 55%＋큰 무대 45%; 전환＝영웅 폭 45%＋전장 범위 30%＋전장 균형 25%.',
    deploymentCaution: '기록된 경기 조건의 기용 프로필이며 함께 경기한 적 없는 선수 간 시너지를 예측하지 않습니다.',
    deploymentPlaybook: '선수 기용 설명서',
    deploymentPlaybookMeta: '전장 수, 경기 수, 출전 시간과 근거량 기준을 모두 통과한 영웅·라인업 환경만 표시합니다.',
    recommendedUse: '우선 기용',
    alternateUse: '대안 기용',
    watchUse: '조건부 기용',
    heroMapMatrix: '영웅 × 전장 유형',
    heroMapMatrixMeta: '각 셀은 선수 개인의 보정 기준선 대비 유지율이며 100%는 대회 평균 환경 경기력입니다.',
    lineupContextFit: '라인업 환경 적합',
    lineupContextFitMeta: '같은 전장 영웅 공존은 기록된 환경만 설명하며 인과적 시너지를 의미하지 않습니다.',
    lineupAnchor: '라인업 축',
    sameRolePartner: '동일 역할 파트너 환경',
    evidenceGate: '표본 기준',
    eligibleContexts: '유효 환경',
    contextRetention: '기준선 유지율',
    primaryDeployment: '추천 기용법',
    alternateDeployment: '대안 기용법',
    deploymentRisk: '주요 위험',
    noWatchContext: '표본 기준을 통과한 뚜렷한 저점 환경이 없습니다.',
    insufficientDeploymentContext: '추가로 표본 기준을 통과한 환경이 없어 방향성 판단을 보류합니다.',
    contextAssociationCaution: '같은 전장 공존은 케미스트리나 인과적 시너지의 증거가 아니며 영상·소통 평가는 구단이 진행해야 합니다.',
    contextPrimary: '강점 환경',
    contextStable: '안정 환경',
    contextConditional: '조건부 환경',
    comparisonDeploymentRead: '기용 차이 빠른 해석',
    comparisonDeploymentReadMeta: '각 후보의 표본 기준을 통과한 최우선 기용 환경만 보여 기술 경로 중복 여부를 빠르게 확인합니다.',
    recruitmentScenarioBoard: '평가 초점별 적합도',
    recruitmentScenarioMeta: '포지션을 선택하면 네 가지 평가 초점으로 후보 5명을 다시 정렬합니다. 포지션은 서로 독립적으로 평가하며 가상 라인업은 구성하지 않습니다.',
    scenarioBalanced: '종합 능력',
    scenarioBalancedMeta: '즉시 전력, 안정성, 압박 경기력과 영웅 폭 적합도를 균형 있게 봅니다.',
    scenarioReliableCore: '즉시 전력',
    scenarioReliableCoreMeta: '경기 하한과 반복 가능한 출력을 우선합니다.',
    scenarioPressureMatch: '강팀·중요 경기',
    scenarioPressureMatchMeta: '강팀 상대와 플레이오프 경기력을 우선합니다.',
    scenarioFlexiblePool: '영웅 폭·로테이션',
    scenarioFlexiblePoolMeta: '영웅 폭, 전장 범위와 환경 전환을 우선합니다.',
    scenarioPrimary: '기술 1순위',
    scenarioAlternate: '2순위 후보',
    scenarioFitScore: '기술 적합도',
    scenarioRank: '포지션 순위',
    scenarioAverageFit: '1순위 적합도',
    scenarioFloorFit: '1순위 우위',
    scenarioEvidence: '평균 근거',
    scenarioRoleCoverage: '후보 수',
    scenarioWithinPool: '공개 포지션 후보',
    scenarioBoardCaution: '기술 적합도는 같은 포지션 안에서 후속 검토 순서만 정합니다. 소통, 계약 의향이나 기록되지 않은 팀 적합도를 추론하지 않습니다.',
    scenarioFormulaBalanced: '선발 25% · 기준선 25% · 압박 20% · 전환 15% · 근거 10% · 명단 안정 5%',
    scenarioFormulaReliableCore: '선발 20% · 기준선 40% · 압박 15% · 전환 10% · 근거 10% · 명단 안정 5%',
    scenarioFormulaPressureMatch: '선발 20% · 기준선 15% · 압박 40% · 전환 10% · 근거 10% · 명단 안정 5%',
    scenarioFormulaFlexiblePool: '선발 20% · 기준선 15% · 압박 10% · 전환 40% · 근거 10% · 명단 안정 5%',
    scenarioFitTitle: '평가 초점별 기술 적합도',
    scenarioFitMeta: '동일한 기술 근거를 네 가지 평가 초점으로 해석한 적합도와 전체 적격 후보군의 포지션 순위입니다.',
    slotPlan: '명단 구조',
    slotPlanMeta: '고정 공개 명단 단계는 포지션별 5명으로 구성됩니다. 명단 #1은 기술 1순위, #2–3은 핵심 후보, #4는 확장층, #5는 관찰층이며 평가 초점 순위가 바뀌어도 이 단계는 바뀌지 않습니다.',
    selectionModel: '선발 모델',
    selectionModelMeta: '세부 역할 경기력 25% · 환경 보정 20% · 경기 하한 15% · 전장 안정성 15% · 큰 무대 검증 10% · 세부 역할 근거 10% · 역할 내 영웅 폭 5%; 근거가 완전하지 않으면 동일 포지션 중앙값(50백분위)으로 축소합니다.',
    slots: '자리',
    qualifiedCandidates: '고표본 후보',
    priorityTier: '기술 1순위와 핵심 후보',
    extendedTier: '확장 검토',
    watchTier: '관찰 명단',
    subroleEvidence: '세부 역할 근거',
    fullEvidence: '완전 근거',
    partialEvidence: '축소 근거',
    maps: '전장',
    minutes: '분',
    matches: '경기',
    heroes: '개 영웅',
    primaryHero: '주요 영웅',
    sampleDepth: '표본 깊이',
    strengths: '데이터 강점',
    relativeWatch: '상대적 확인 항목',
    roleMedian: '동일 역할 중앙값',
    loading: '기술 분석 데이터를 불러오는 중…',
    loadingDetail: '5개 포지션 후보 요약과 공개 명단 순위를 준비하고 있습니다.',
    loadingPlayer: '선수 전체 프로필을 불러오는 중…',
    loadingPlayerDetail: '현재 선수의 전체 판단 근거를 준비하고 있습니다.',
    error: '기술 분석 데이터를 일시적으로 불러올 수 없습니다.',
    invalidTitle: '현재 사용할 수 없는 전용 링크입니다',
    invalidBody: '링크가 취소 또는 만료되었거나 주소가 올바르지 않을 수 있습니다. 보고서 제공자에게 새 링크를 요청해 주세요.',
    prototypeNote: '25명 모두 기술 프로필을 제공합니다. 여기서 명단 #1–#5는 고정 공개 명단 순위이며, #1은 기술 1순위, #2–3은 핵심 후보, #4는 확장층, #5는 관찰층으로 현재 평가 초점의 동적 순위와 다릅니다.',
    talentMap: '인재 분포도',
    talentMapMeta: '종합 선발 점수 × 표본 깊이. 상대 강도, 소속 팀 환경, 전장 유형 보정을 포함합니다.',
    performance: '종합 선발 점수',
    sampleIndex: '표본 깊이 지수',
    selectedDossiers: '25인 계층형 분석 프로필',
    allRoles: '전체 세부 역할',
    seasonView: '전체 시즌',
    playoffsView: '플레이오프 구간',
    viewScope: '데이터 범위',
    filterSubrole: '세부 역할 필터',
    openDossier: '전체 프로필 보기',
    backToPool: '25인 명단으로 돌아가기',
    previousPlayer: '이전 선수',
    nextPlayer: '다음 선수',
    reportVersion: '보고서 버전',
    modelVersion: '평가 모델',
    dataAsOf: '데이터 기준일',
    invalidPlayer: '현재 공개된 25인 분석 명단에 포함되지 않은 선수입니다.',
    playoffMaps: '플레이오프 전장',
    stageDelta: '이전 단계 대비',
    insufficientPlayoff: '플레이오프 단계 표본 기준 미달',
    compareSelect: '같은 세부 역할 선수 2–3명을 선택해 비교하세요',
    compareLimit: '최대 3명까지 선택',
    selectedCountLabel: '선택',
    analystVerdict: '분석가 결론',
    archetype: '기술 유형',
    analystWorkbench: '개인 심층 분석',
    analystWorkbenchMeta: '세부 역할 기준, 환경 보정, 경기력 범위와 강팀 상대 검증을 하나의 의사결정 프레임으로 결합합니다.',
    consistency: '산출 안정성',
    consistencyMeta: '배정된 세부 역할 후보군 백분위',
    middle50: '중간 50% 구간',
    recentForm: '최근 흐름',
    recentFormMeta: '최근 5개 전장과 이전 5개 전장 비교',
    effectivePool: '유효 영웅 수',
    effectivePoolMeta: '사용 분포 보정값이며 단순 개수가 아닙니다',
    coverage80: '기록 시간 80%를 차지한 영웅',
    pressureContext: '불리한 결과 구간 변화',
    pressureContextMeta: '승리 전장 대비 보정된 패배 전장 경기력 유지 비율',
    playoffContext: '플레이오프와 이전 단계 비교',
    stageValidation: '큰 무대 검증',
    stageValidationMeta: '보정된 플레이오프 수준과 단계 유지력을 표본 수에 따라 축소한 백분위',
    stageConfidence: '단계 근거 신뢰도',
    opponentStrength: '상대 일정 강도',
    opponentStrengthMeta: '출전 시간 가중 경기 전 팀 레이팅',
    contextAdjusted: '환경 보정 경기력',
    contextAdjustedMeta: '전장·영웅·라인업·상대·소속 팀 강도 중립화',
    decisionView: '구단 의사결정 뷰',
    decisionViewMeta: '보정된 경기 하한, 일반 수준, 상한과 강팀 상대 성과를 동일 세부 역할 고표본 선수군에서 비교합니다.',
    competitiveFloor: '경기 하한',
    typicalLevel: '일반 수준',
    competitiveCeiling: '경기 상한',
    strongOpponentTest: '강팀 상대 검증',
    strongOpponentMeta: '강팀 상대 표본은 증거량에 따라 동일 포지션 중앙값(50백분위) 방향으로 축소합니다',
    strongRetention: '강팀 상대 유지율',
    modelRange: '90% 모델 추정 구간',
    evidenceQuality: '증거 품질',
    effectiveMaps: '유효 전장 표본',
    effectiveOpponents: '유효 상대 수',
    opponentsCount: '상대',
    mapTypes: '전장 유형 범위',
    mapBalance: '전장 균형',
    decisionRead: '종합 판단',
    mapLossRetention: '패배 전장 유지율',
    expectedWin: '평균 경기 전 예상 승률',
    matureCoverage: '안정된 상대 레이팅 적용 비율',
    strongestOpponents: '최고 강도 상대 근거',
    strongestOpponentsMeta: '각 경기 전에 이미 나온 정상 결과만 사용하며 몰수패와 행정 판정은 레이팅을 갱신하지 않습니다.',
    rawContextScore: '원시 경기력',
    adjustedContextScore: '보정 후',
    tacticalHypothesis: '전술 적합 가설',
    tacticalHypothesisMeta: '코치가 자체 조합 구조와 역할 요구에 맞춰 판단하기 위한 자료입니다.',
    strongestMapType: '최고 보정 경기력 전장 유형',
    strongestMapTypeMeta: '상대, 소속 팀과 전체 전장 유형 환경을 중립화하며 최소 2개 전장이 필요합니다.',
    vodChecklist: '영상 검증 체크리스트',
    vodChecklistMeta: '현재 경기 통계만으로 답할 수 없는 질문입니다.',
    observation: '데이터 관찰',
    interpretation: '분석 판단',
    verification: '영상 검증',
    insufficientContext: '표본이 부족해 방향성 판단을 보류합니다',
    evidence: '데이터 근거',
    analystRead: '분석 판단',
    risks: '위험 및 확인 항목',
    noAbsoluteWeakness: '공개 데이터에서 뚜렷한 약점은 확인되지 않았습니다. 아래 항목은 높은 종합 수준 안에서의 상대적 확인 지점입니다.',
    roleProfile: '동일 역할 대비 기술 프로필',
    roleProfileMeta: '50백분위는 동일 역할 중앙값이며 모든 수치는 10분당 기준으로 표준화했습니다.',
    playerValue: '선수',
    heroPool: '영웅 폭 구조',
    heroPoolMeta: '사용 비율은 본 대회 기록이며 선수의 전체 영웅 폭을 의미하지 않습니다.',
    usage: '사용 비율',
    recentTrend: '최근 10개 전장 추이',
    recentTrendMeta: '배정된 세부 역할의 환경 보정 전장 영향력이며 변동성 확인용으로만 사용합니다.',
    recentMatches: '최근 경기 근거',
    opponent: '상대',
    result: '결과',
    compare: '동일 세부 역할 의사결정실',
    compareMeta: '한 세부 역할 안에서 기술 지문, 환경 보정과 모델 불확실성을 함께 읽습니다. 서로 다른 역할의 원시 수치는 직접 비교하지 않습니다.',
    player: '선수',
    nationality: '국적',
    battleTag: 'Battle.net ID',
    teamPlacement: '소속 팀 최종 성적',
    role: '역할',
    topStrength: '주요 강점 지표',
    watchpoint: '확인 항목',
    methodology: '분석 방법',
    methodologyItems: [
      '20개 전장, 200분, 6경기 이상을 기록한 선수만 고표본 후보군에 포함합니다.',
      '돌격, 히트스캔, 플렉스 DPS, 메인 서포트, 플렉스 서포트에 각 5자리를 배정합니다. 1위는 기술 1순위, 2–3위는 핵심 후보, 4위는 확장층, 5위는 관찰층이며 실제 영웅 출전 시간의 주 비중으로 세부 역할을 정합니다.',
      'Selection v2.7은 배정된 세부 역할 영웅의 전장만 사용하고 돌격, 히트스캔, 플렉스 DPS, 메인 서포트, 플렉스 서포트에 서로 다른 선발 가중치를 적용합니다. 메인 서포트는 하한·안정성·근거를, 플렉스 DPS는 전환성을 더 반영합니다.',
      '먼저 전체 역할 20개 전장, 200분, 6경기 기준을 통과해야 하며 세부 역할은 최소 10개 전장, 100분, 4경기가 필요합니다. 세부 역할 근거가 20개 전장, 200분, 6경기에 도달하기 전에는 점수를 중립값으로 연속 축소합니다.',
      '명단 안정도는 7개 가중치를 각각 ±30% 범위에서 바꾸며 5,000회 반복합니다. 상위 3명은 상위 3위 유지율, 확장층은 상위 4위 유지율, 관찰층은 상위 4위 진입률을 사용합니다. 표본 신뢰도가 아닌 모델 선호 민감도입니다.',
      '기용 프로필은 기준선 신뢰도, 압박 준비도와 환경 전환성의 세 조합 지표로 구성됩니다. 포지션별 내부 가중치는 본 방법론에 명시합니다.',
      '네 가지 평가 초점은 전체 34인 적격 후보군에서 세부 역할별로 계산합니다. 전체 후보군 순위와 공개 5인 명단 순위를 함께 보고해 전문 후보의 상대 위치를 유지합니다.',
      '영웅 × 전장 셀은 최소 2개 전장, 2경기, 12분과 근거량 45%가 필요합니다. 라인업 축과 동일 역할 파트너 환경은 최소 3개 전장, 2경기, 20분과 45%가 필요합니다. 통과한 환경도 선수 기준선으로 축소하며 같은 전장 공존은 인과적 시너지를 증명하지 않습니다.',
      '팀 강도는 1500에서 시작해 시간순 정상 전장 결과로 갱신합니다. 각 전장은 경기 전 레이팅만 사용하며 몰수패와 행정 판정은 제외해 미래 정보 유출을 막습니다.',
      '환경 보정은 돌격, 히트스캔, 플렉스 DPS, 메인 서포트, 플렉스 서포트를 각각 따로 적합합니다. 계층적 축소로 주요 영웅, 같은 전장 전방 영웅과 동일 역할 파트너를 먼저 중립화한 뒤 전장 유형, 상대와 소속 팀 강도를 보정합니다. 영웅·라인업 항목은 현재 선발 점수에 10% 보정 가중치로 반영하며 개인 원인이나 미래 시너지를 증명하지 않습니다.',
      '경기 하한, 일반 수준과 상한은 보정된 전장별 경기력의 가중 25%, 50%, 75% 백분위입니다. 90% 구간은 경기 단위로 군집화하고 전장·경기 표준오차 중 더 보수적인 값을 사용합니다.',
      'OVR은 영웅 유형별 가중치를 사용하며 공개 지표는 역할 간 원시 수치가 아닌 동일 역할 백분위를 사용합니다.',
      '위험 항목은 확정된 결함이 아닌 상대적 데이터 확인 지점이며 조합과 경기 맥락을 함께 봐야 합니다.',
      '안정성은 배정된 세부 역할의 환경 보정 전장 영향력 변동계수를 같은 세부 역할 백분위로 환산하며 유효 영웅 수는 해당 역할 내 1 / Σ(사용 비율²)로 계산합니다.',
      '큰 무대 검증은 환경 보정된 플레이오프 수준과 이전 단계 대비 변화를 결합한 뒤 플레이오프 전장·경기 수에 따라 중립값으로 축소합니다. 유효한 플레이오프 표본이 없으면 중립값을 부여합니다.',
      '안정성, 최근 변화, 승패 및 단계 구간은 설명적 근거이며 상관관계를 개인 원인으로 단정하지 않습니다.',
      '개별 판단은 지표 프로필, 환경 보정, 경기력 범위와 역할 적합도를 함께 사용하며 하나의 순위가 전체 평가를 대신하지 않습니다.'
    ],
    printPdf: '인쇄 / PDF 내보내기',
    highConfidence: '높은 신뢰도',
    per10: '10분당',
    win: '승',
    loss: '패',
    draw: '무',
    unknown: '승패 표기 미입력'
  }
}

const ROLE_COPY = {
  TANK: { 'zh-CN': '坦克', 'en-US': 'TANK', 'ko-KR': '돌격' },
  DPS: { 'zh-CN': '输出', 'en-US': 'DAMAGE', 'ko-KR': '공격' },
  SUPPORT: { 'zh-CN': '支援', 'en-US': 'SUPPORT', 'ko-KR': '지원' }
}

const SUBROLE_COPY = {
  TANK: { 'zh-CN': '坦克', 'en-US': 'TANK', 'ko-KR': '돌격' },
  HITSCAN: { 'zh-CN': '长枪', 'en-US': 'HITSCAN', 'ko-KR': '히트스캔' },
  FLEX_DPS: { 'zh-CN': '自由人', 'en-US': 'FLEX DPS', 'ko-KR': '플렉스 DPS' },
  MAIN_SUPPORT: { 'zh-CN': '群辅', 'en-US': 'MAIN SUPPORT', 'ko-KR': '메인 서포트' },
  FLEX_SUPPORT: { 'zh-CN': '枪辅', 'en-US': 'FLEX SUPPORT', 'ko-KR': '플렉스 서포트' }
}

const SUBROLE_ORDER = ['TANK', 'HITSCAN', 'FLEX_DPS', 'MAIN_SUPPORT', 'FLEX_SUPPORT']
const RECRUITMENT_SCENARIO_ORDER = ['BALANCED', 'RELIABLE_CORE', 'PRESSURE_MATCH', 'FLEXIBLE_POOL']
const RECRUITMENT_SCENARIO_PARAMS = {
  BALANCED: 'balanced',
  RELIABLE_CORE: 'reliable',
  PRESSURE_MATCH: 'pressure',
  FLEXIBLE_POOL: 'flexible'
}

const SUBROLE_COLORS = {
  TANK: '#5d9cff',
  HITSCAN: '#ff6969',
  FLEX_DPS: '#ff9f45',
  MAIN_SUPPORT: '#5dde8a',
  FLEX_SUPPORT: '#36c8d8'
}

const COMPARISON_PLAYER_COLORS = ['#f4c320', '#67a7ff', '#62df92', '#ff7c72', '#b58cff']

const METRIC_COPY = {
  elim: { 'zh-CN': '消灭', 'en-US': 'Eliminations', 'ko-KR': '처치' },
  ast: { 'zh-CN': '助攻', 'en-US': 'Assists', 'ko-KR': '도움' },
  dth: { 'zh-CN': '生存', 'en-US': 'Survival', 'ko-KR': '생존' },
  dmg: { 'zh-CN': '伤害', 'en-US': 'Damage', 'ko-KR': '피해' },
  heal: { 'zh-CN': '治疗', 'en-US': 'Healing', 'ko-KR': '치유' },
  block: { 'zh-CN': '减伤', 'en-US': 'Mitigation', 'ko-KR': '완화' },
  impact: { 'zh-CN': 'V2 影响分', 'en-US': 'V2 impact', 'ko-KR': 'V2 영향력' }
}

const MAP_TYPE_COPY = {
  Control: { 'zh-CN': '控制', 'en-US': 'Control', 'ko-KR': '쟁탈' },
  Escort: { 'zh-CN': '护送', 'en-US': 'Escort', 'ko-KR': '호위' },
  Hybrid: { 'zh-CN': '混合', 'en-US': 'Hybrid', 'ko-KR': '혼합' },
  Push: { 'zh-CN': '推进', 'en-US': 'Push', 'ko-KR': '밀기' },
  Flashpoint: { 'zh-CN': '闪点', 'en-US': 'Flashpoint', 'ko-KR': '플래시포인트' },
  Clash: { 'zh-CN': '攻防作战', 'en-US': 'Clash', 'ko-KR': '격돌' }
}

const NATIONALITY_COPY = {
  'CN-MAINLAND': { 'zh-CN': '中国大陆', 'en-US': 'Mainland China', 'ko-KR': '중국 본토' },
  KR: { 'zh-CN': '韩国', 'en-US': 'South Korea', 'ko-KR': '대한민국' }
}

function getCopy(locale) {
  return COPY[locale] || COPY['zh-CN']
}

function getRoleLabel(role, locale) {
  return ROLE_COPY[role]?.[locale] || role
}

function getSubroleLabel(subrole, locale) {
  return SUBROLE_COPY[subrole]?.[locale] || subrole
}

function getRoleCockpitMeta(subrole, candidateCount, locale) {
  const role = getSubroleLabel(subrole, locale)
  if (locale === 'en-US') {
    return `Compare ${candidateCount} ${role} candidates on immediate readiness, pressure performance and hero-pool fit. Change the selection emphasis to update the technical order.`
  }
  if (locale === 'ko-KR') {
    return `이번 대회 표본을 바탕으로 ${role} 후보 ${candidateCount}명의 즉시 전력, 압박 경기력과 영웅 폭 적합도를 비교합니다. 평가 초점을 바꾸면 기술 우선순위도 함께 갱신됩니다.`
  }
  return `基于本届赛事样本，比较 ${candidateCount} 名${role}选手的即战能力、高压表现与英雄池适配；切换用人侧重，候选顺序同步更新。`
}

function SubroleButtonLabel({ subrole, locale }) {
  return (
    <span className={styles.subroleButtonLabel}>
      <b>{getSubroleLabel(subrole, locale)}</b>
      {locale !== 'en-US' ? <small>{SUBROLE_COPY[subrole]?.['en-US'] || subrole}</small> : null}
    </span>
  )
}

function getTierLabel(tier, locale) {
  const t = getCopy(locale)
  if (tier === 'PRIORITY') return t.priorityTier
  if (tier === 'EXTENDED') return t.extendedTier
  return t.watchTier
}

function getCandidateStatusLabel(player, locale) {
  const rank = Number(player?.highSampleSubroleRank)
  if (rank === 1) {
    if (locale === 'en-US') return 'Technical primary'
    if (locale === 'ko-KR') return '기술 1순위'
    return '技术首选'
  }
  if (rank <= 3) {
    if (locale === 'en-US') return 'Core candidate'
    if (locale === 'ko-KR') return '핵심 후보'
    return '核心候选'
  }
  if (player?.tier === 'PRIORITY') {
    if (locale === 'en-US') return 'Priority shortlist'
    if (locale === 'ko-KR') return '우선 후보군'
    return '优先候选'
  }
  return getTierLabel(player?.tier, locale)
}

function getManagerDossierCopy(locale) {
  if (locale === 'en-US') {
    return {
      eyebrow: 'MANAGER DECISION BRIEF',
      currentRead: 'Current technical read',
      snapshotEyebrow: '30-SECOND PLAYER READ',
      snapshotTitle: name => `${name} in 30 seconds`,
      snapshotMeta: 'Role, rotation readiness, recommended use and decision evidence are summarised here; the five-axis profile provides the detailed breakdown.',
      snapshotPosition: 'Current technical position',
      snapshotReady: 'Immediate rotation readiness',
      snapshotReadyMeta: 'Baseline reliability inside the recorded sample',
      snapshotCeiling: 'Observed sample ceiling',
      snapshotCeilingMeta: 'Role-relative ceiling, not a future-potential forecast',
      snapshotEvidenceShield: 'Decision evidence strength',
      snapshotEvidenceShieldMeta: 'Lower of evidence quality and ranking stability',
      snapshotBestUse: 'Best recorded use',
      snapshotFirstCheck: 'First validation item',
      snapshotNoUse: 'No hero × map context has cleared the evidence gate yet.',
      snapshotScale: '0–100 · same-position read',
      peerEyebrow: 'SELECTED-CANDIDATE CONTEXT',
      peerTitle: count => `Position inside the current ${count}-player group`,
      peerMeta: count => `This player is compared with the average of the other ${count} selected candidate${count === 1 ? '' : 's'}. The read changes with the group and recruitment emphasis.`,
      peerRank: 'FIT rank in this group',
      peerAgainst: 'Compared candidates',
      peerEdge: delta => delta >= 0 ? 'Strongest relative edge' : 'Smallest relative gap',
      peerWatch: delta => delta < 0 ? 'Clearest relative gap' : 'Narrowest relative edge',
      peerPlayer: 'This player',
      peerAverage: 'Other candidates · average',
      peerLegend: 'Solid bar = this player · white marker = other candidates’ average',
      peerReturn: 'Return to selected-candidate comparison',
      peerBoundary: 'This is a within-group technical comparison, not a market-wide ranking. Evidence confidence remains separate from performance.',
      peerDelta: delta => Math.abs(delta) < 0.5 ? 'Level with group average' : delta > 0 ? `${formatComparisonValue(Math.abs(delta))} points above average` : `${formatComparisonValue(Math.abs(delta))} points below average`,
      reasons: 'Why this candidate is shortlisted',
      watchpoints: 'What still needs validation',
      scenarioTitle: 'Fit across four selection emphases',
      scenarioMeta: 'One technical evidence base, read against four different club needs.',
      strongOpponent: 'Strong-opponent test',
      evidence: 'Overall confidence',
      stability: 'Ranking stability',
      trialEyebrow: 'ONE-PAGE TRIAL BRIEF',
      trialTitle: name => `${name} · trial verification card`,
      trialMeta: 'A meeting-ready handoff from statistical conclusion to club-run verification. Criteria below are suggestions, not recorded trial results.',
      trialRecommendedRole: 'Recommended use',
      trialStrengths: 'Two reasons to advance',
      trialRisks: 'Two risks to verify',
      trialQuestions: 'Three verification questions',
      trialPass: 'Suggested pass criteria',
      trialPassCriteria: [
        'Deliver the assigned role across at least two map types while preserving the recorded strength direction.',
        'The primary watchpoint does not become a repeated failure mode under pressure or an alternate-hero assignment.',
        'The club independently clears coach review, communication assessment and trial evidence.'
      ],
      trialHumanEvidence: 'Human evidence status',
      trialHumanEvidenceMeta: 'Not included in this report · VOD review, communication and trial outcomes are completed by the club.',
      printTrial: 'Print one-page card',
      deepDive: 'Open full technical evidence',
      deepDiveMeta: 'Peer comparison, five-axis profile, professional role-shape reference, scenario sensitivity and evidence locator.',
      openCoach: 'Open coach evidence',
      openCoachMeta: 'Review the model path, deployment contexts and match-level evidence.',
      boundary: 'Technical evidence only. This brief does not assess signing interest, communication or future lineup chemistry.'
    }
  }
  if (locale === 'ko-KR') {
    return {
      eyebrow: 'MANAGER DECISION BRIEF',
      currentRead: '현재 기술 판단',
      snapshotEyebrow: '30초 선수 판단',
      snapshotTitle: name => `30초로 보는 ${name}`,
      snapshotMeta: '기술 포지션, 즉시 투입 준비도, 권장 기용법과 결론 근거를 요약하며 5축 프로필에서 세부 구조를 확인할 수 있습니다.',
      snapshotPosition: '현재 기술 포지션',
      snapshotReady: '즉시 로테이션 준비도',
      snapshotReadyMeta: '기록 표본 안의 기준선 신뢰도',
      snapshotCeiling: '관측 표본 상한',
      snapshotCeilingMeta: '동일 세부 역할 상대 상한이며 미래 잠재력 예측이 아닙니다',
      snapshotEvidenceShield: '결론 근거 안정도',
      snapshotEvidenceShieldMeta: '근거 품질과 순위 안정도 중 낮은 값',
      snapshotBestUse: '최적 기록 기용법',
      snapshotFirstCheck: '우선 검증 항목',
      snapshotNoUse: '근거 기준을 통과한 영웅 × 전장 환경이 아직 없습니다.',
      snapshotScale: '0–100 · 동일 포지션 기준',
      peerEyebrow: 'SELECTED-CANDIDATE CONTEXT',
      peerTitle: count => `현재 ${count}인 후보군 내 위치`,
      peerMeta: count => `이 선수를 선택된 다른 후보 ${count}명의 평균과 비교합니다. 후보군과 영입 평가 초점이 바뀌면 결론도 달라집니다.`,
      peerRank: '현재 후보군 FIT 순위',
      peerAgainst: '비교 후보',
      peerEdge: delta => delta >= 0 ? '가장 큰 상대 우위' : '가장 작은 상대 격차',
      peerWatch: delta => delta < 0 ? '가장 큰 상대 열세' : '가장 작은 상대 우위',
      peerPlayer: '현재 선수',
      peerAverage: '다른 후보 평균',
      peerLegend: '실선 막대 = 현재 선수 · 흰색 표식 = 다른 후보 평균',
      peerReturn: '선택 후보 비교로 돌아가기',
      peerBoundary: '현재 후보군 내부의 기술 비교이며 전체 시장 순위가 아닙니다. 근거 신뢰도는 경기력과 분리해 판단합니다.',
      peerDelta: delta => Math.abs(delta) < 0.5 ? '후보 평균과 동률' : delta > 0 ? `평균보다 ${formatComparisonValue(Math.abs(delta))}점 우위` : `평균보다 ${formatComparisonValue(Math.abs(delta))}점 열세`,
      reasons: '핵심 후보로 보는 이유',
      watchpoints: '추가 확인이 필요한 항목',
      scenarioTitle: '네 가지 평가 초점의 적합도',
      scenarioMeta: '동일한 기술 근거를 네 가지 구단 요구로 다시 읽습니다.',
      strongOpponent: '강팀 검증',
      evidence: '종합 신뢰도',
      stability: '순위 안정도',
      trialEyebrow: 'ONE-PAGE TRIAL BRIEF',
      trialTitle: name => `${name} · 테스트 검증 카드`,
      trialMeta: '통계 결론을 구단 자체 검증으로 연결하는 회의용 1페이지입니다. 아래 기준은 제안이며 기록된 테스트 결과가 아닙니다.',
      trialRecommendedRole: '권장 기용법',
      trialStrengths: '진행 근거 2가지',
      trialRisks: '검증할 위험 2가지',
      trialQuestions: '검증 질문 3가지',
      trialPass: '권장 통과 기준',
      trialPassCriteria: [
        '최소 두 가지 전장 유형에서 지정 역할을 수행하며 기록된 강점 방향을 유지합니다.',
        '압박 또는 대체 영웅 기용에서 주요 확인 항목이 반복적인 실패 원인이 되지 않습니다.',
        '코치 검토, 소통 평가와 테스트 근거를 구단이 독립적으로 통과 처리합니다.'
      ],
      trialHumanEvidence: '인적 검증 상태',
      trialHumanEvidenceMeta: '본 보고서 미포함 · 영상 검토, 소통과 테스트 결과는 구단이 완료합니다.',
      printTrial: '1페이지 카드 인쇄',
      deepDive: '전체 기술 근거 펼치기',
      deepDiveMeta: '후보 비교, 5축 프로필, 프로 역할 형태 참고, 평가 초점 민감도와 근거 위치.',
      openCoach: '코치 근거 펼치기',
      openCoachMeta: '모델 경로, 기용 환경과 경기 단위 근거를 확인합니다.',
      boundary: '기술 근거만 제시하며 영입 의사, 소통 또는 미래 라인업 시너지는 판단하지 않습니다.'
    }
  }
  return {
    eyebrow: 'MANAGER DECISION BRIEF',
    currentRead: '当前技术结论',
    snapshotEyebrow: '30秒个人结论',
    snapshotTitle: name => `30秒读懂 ${name}`,
    snapshotMeta: '本节汇总技术定位、即插即用程度、推荐用法与结论证据；五维画像提供详细拆解。',
    snapshotPosition: '当前技术定位',
    snapshotReady: '立即进入轮换准备度',
    snapshotReadyMeta: '已记录样本中的基线可靠度',
    snapshotCeiling: '样本内技术上限',
    snapshotCeilingMeta: '同位置样本上限，不代表未来潜力预测',
    snapshotEvidenceShield: '结论证据稳健度',
    snapshotEvidenceShieldMeta: '证据质量与权重稳定度取较低值',
    snapshotBestUse: '最优记录用法',
    snapshotFirstCheck: '首要验证项',
    snapshotNoUse: '尚无达到证据门槛的英雄 × 地图情境。',
    snapshotScale: '0–100 · 同位置读取',
    peerEyebrow: 'SELECTED-CANDIDATE CONTEXT',
    peerTitle: count => `在当前 ${count} 人候选组中的位置`,
    peerMeta: count => `将本选手与另外 ${count} 名已选候选的平均值比较；候选组或用人侧重改变时，结论也会同步变化。`,
    peerRank: '当前组内 FIT 顺位',
    peerAgainst: '对比候选',
    peerEdge: delta => delta >= 0 ? '最大相对优势' : '最小相对差距',
    peerWatch: delta => delta < 0 ? '首要相对落后项' : '相对最小优势',
    peerPlayer: '本选手',
    peerAverage: '其余候选均值',
    peerLegend: '实色条 = 本选手 · 白色标记 = 其余候选均值',
    peerReturn: '返回当前候选对比',
    peerBoundary: '这里只比较当前候选组内的技术证据，不代表全市场顺位；证据可信度仍与竞技表现分开判断。',
    peerDelta: delta => Math.abs(delta) < 0.5 ? '与同组均值基本持平' : delta > 0 ? `领先同组均值 ${formatComparisonValue(Math.abs(delta))} 分` : `落后同组均值 ${formatComparisonValue(Math.abs(delta))} 分`,
    reasons: '为什么进入核心候选',
    watchpoints: '仍需验证什么',
    scenarioTitle: '四种用人侧重下的适配',
    scenarioMeta: '同一组技术证据，按四种不同俱乐部需求重新读取。',
    strongOpponent: '强敌检验',
    evidence: '总体可信度',
    stability: '顺位稳定度',
    trialEyebrow: 'ONE-PAGE TRIAL BRIEF',
    trialTitle: name => `${name} · 试训验证卡`,
    trialMeta: '把统计结论交接给俱乐部自行验证的一页会议卡；以下是建议标准，不是已经发生的试训结论。',
    trialRecommendedRole: '推荐用法',
    trialStrengths: '两项推进依据',
    trialRisks: '两项待验证风险',
    trialQuestions: '三个验证问题',
    trialPass: '建议通过标准',
    trialPassCriteria: [
      '至少在两种地图类型中完成预定职责，并保持已记录的核心优势方向。',
      '主要观察项在高压或替代英雄任务中未成为重复性失分来源。',
      '教练复核、沟通评估与试训证据均由俱乐部独立确认通过。'
    ],
    trialHumanEvidence: '人工证据状态',
    trialHumanEvidenceMeta: '未纳入本报告 · 录像复核、沟通与试训结论由俱乐部完成。',
    printTrial: '打印一页试训卡',
    deepDive: '展开完整技术证据',
    deepDiveMeta: '同组对比、五轴画像、职业角色形态参考、侧重敏感度与证据定位。',
    openCoach: '展开教练证据',
    openCoachMeta: '查看模型路径、部署情境与比赛级证据。',
    boundary: '仅呈现技术证据，不判断签约意愿、沟通能力或未来阵容化学反应。'
  }
}

const DECISION_PROFILE_AXIS_IDS = [
  'adjustedPerformance',
  'competitiveFloor',
  'consistency',
  'pressureReadiness',
  'contextPortability'
]

function getDecisionProfileCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'ROLE-RELATIVE DECISION PROFILE',
    title: 'Five-axis decision profile',
    meta: 'Five indicators use a same-position 0–100 index; the dashed polygon marks the median at 50, with exact evidence available for each axis.',
    profileRead: 'Profile read',
    confidence: 'Evidence confidence',
    median: 'Same-position median · 50',
    playerShape: 'Player profile',
    open: 'Open evidence',
    boundary: 'This profile is for same-position comparison only, not a cross-position score; evidence confidence is assessed separately from ability.',
    axes: {
      adjustedPerformance: { label: 'Adjusted performance', short: 'Adjusted', meta: 'Same-position output after opponent, own-team and recorded lineup context adjustments.' },
      competitiveFloor: { label: 'Competitive floor', short: 'Floor', meta: 'Lower-quartile adjusted map performance benchmarked inside the position.' },
      consistency: { label: 'Consistent delivery', short: 'Consistency', meta: 'Lower adjusted map-to-map variation produces a higher role-relative index.' },
      pressureReadiness: { label: 'Pressure readiness', short: 'Pressure', meta: 'Role-weighted blend of strong-opponent retention and stage validation.' },
      contextPortability: { label: 'Context portability', short: 'Portability', meta: 'Role-weighted blend of hero breadth, map coverage and map balance.' }
    }
  }
  if (locale === 'ko-KR') return {
    eyebrow: 'ROLE-RELATIVE DECISION PROFILE',
    title: '5축 의사결정 프로필',
    meta: '다섯 지표는 동일 포지션 0–100 지수로 표시하며 점선 다각형은 중앙값 50입니다. 각 축에서 정확한 근거를 확인할 수 있습니다.',
    profileRead: '프로필 해석',
    confidence: '근거 신뢰도',
    median: '동일 포지션 중앙값 · 50',
    playerShape: '선수 프로필',
    open: '근거 열기',
    boundary: '이 프로필은 동일 포지션 비교 전용이며 포지션 간 점수가 아닙니다. 근거 신뢰도는 능력과 별도로 판단합니다.',
    axes: {
      adjustedPerformance: { label: '보정 경기력', short: '보정 경기력', meta: '상대·아군 강도와 기록된 조합 환경을 보정한 동일 포지션 경기력입니다.' },
      competitiveFloor: { label: '경기 하한', short: '경기 하한', meta: '환경 보정 전장 경기력의 하위 사분위를 동일 포지션 안에서 비교합니다.' },
      consistency: { label: '안정적 수행', short: '안정 수행', meta: '환경 보정 전장 간 변동이 작을수록 동일 포지션 지수가 높습니다.' },
      pressureReadiness: { label: '압박 준비도', short: '압박 준비', meta: '포지션별 가중치로 강팀 유지력과 단계 검증을 결합합니다.' },
      contextPortability: { label: '환경 전환성', short: '환경 전환', meta: '포지션별 가중치로 영웅 폭, 전장 커버리지와 균형도를 결합합니다.' }
    }
  }
  return {
    eyebrow: 'ROLE-RELATIVE DECISION PROFILE',
    title: '五维决策画像',
    meta: '五项指标按同位置 0–100 指数呈现；虚线轮廓为同位置中位参考 50，各指标均可查看精确证据。',
    profileRead: '画像结论',
    confidence: '证据可信度',
    median: '同位置中位 · 50',
    playerShape: '选手画像',
    open: '查看证据',
    boundary: '五维画像仅用于同位置内部比较，不是跨位置总分；证据可信度与能力画像分别判断。',
    axes: {
      adjustedPerformance: { label: '校正后表现', short: '校正表现', meta: '校正对手、己方强度与已记录阵容环境后的同位置表现。' },
      competitiveFloor: { label: '竞技下限', short: '竞技下限', meta: '以环境校正地图表现的下四分位衡量低谷时的保留水平。' },
      consistency: { label: '稳定兑现', short: '稳定兑现', meta: '环境校正后的地图间波动越小，同位置指数越高。' },
      pressureReadiness: { label: '高压准备', short: '高压准备', meta: '按该位置权重合并强敌保持度与季后赛阶段验证。' },
      contextPortability: { label: '环境迁移', short: '环境迁移', meta: '按该位置权重合并英雄宽度、地图覆盖与地图均衡度。' }
    }
  }
}

function getDecisionProfileBand(value, locale) {
  const level = value >= 85 ? 'LEADING' : value >= 70 ? 'STRONG' : value >= 55 ? 'ABOVE' : value >= 50 ? 'MIDDLE' : 'WATCH'
  const labels = {
    LEADING: { 'zh-CN': '领先区', 'en-US': 'Leading', 'ko-KR': '선두 구간' },
    STRONG: { 'zh-CN': '前段区', 'en-US': 'Strong', 'ko-KR': '상위 구간' },
    ABOVE: { 'zh-CN': '中上区', 'en-US': 'Above median', 'ko-KR': '중상위 구간' },
    MIDDLE: { 'zh-CN': '中位区', 'en-US': 'Middle band', 'ko-KR': '중간 구간' },
    WATCH: { 'zh-CN': '观察区', 'en-US': 'Watch band', 'ko-KR': '관찰 구간' }
  }
  return { level, label: labels[level][locale] || labels[level]['zh-CN'] }
}

function getDecisionProfileRead(topAxis, watchAxis, locale) {
  const watchBand = getDecisionProfileBand(watchAxis.value, locale)
  if (locale === 'en-US') {
    return watchAxis.value < 50
      ? `${topAxis.label} is the clearest edge. ${watchAxis.label} sits below the median reference and is the first dimension to test against hero, map and lineup context.`
      : `${topAxis.label} is the clearest edge. All five dimensions clear the median reference; ${watchAxis.label} remains the narrowest relative boundary.`
  }
  if (locale === 'ko-KR') {
    return watchAxis.value < 50
      ? `${topAxis.label}이 가장 뚜렷한 강점입니다. ${watchAxis.label}은 중앙값 아래의 ${watchBand.label}으로 영웅·전장·조합 맥락을 먼저 확인해야 합니다.`
      : `${topAxis.label}이 가장 뚜렷한 강점입니다. 다섯 축 모두 중앙값을 넘으며 ${watchAxis.label}이 상대적으로 가장 좁은 경계입니다.`
  }
  return watchAxis.value < 50
    ? `${topAxis.label}是最突出的决策优势；${watchAxis.label}低于中位参考，属于${watchBand.label}，应优先结合英雄、地图与阵容情境复核。`
    : `${topAxis.label}是最突出的决策优势；五项均高于中位参考，${watchAxis.label}仍是相对最窄的边界。`
}

function getDecisionProfileAxes(player, locale) {
  const profile = player?.performanceSignals?.decisionProfile || {}
  const storedAxes = new Map((profile.axes || []).map(axis => [axis.id, axis.value]))
  const factors = player?.selection?.factors || {}
  const deployment = player?.performanceSignals?.deploymentProfile || {}
  const fallback = {
    adjustedPerformance: factors.opponentAdjusted ?? player?.performanceSignals?.opponentStrength?.adjustedPercentile,
    competitiveFloor: factors.profileFloor ?? player?.performanceSignals?.opponentStrength?.performanceEnvelope?.floorPercentile,
    consistency: factors.consistency ?? player?.performanceSignals?.consistency?.percentile,
    pressureReadiness: deployment.pressureReadiness,
    contextPortability: deployment.contextPortability
  }
  const copy = getDecisionProfileCopy(locale)
  const anchors = {
    adjustedPerformance: 'evidence-decision-profile',
    competitiveFloor: 'evidence-decision-profile',
    consistency: 'evidence-decision-profile',
    pressureReadiness: 'evidence-strong-opponents',
    contextPortability: 'context'
  }

  return DECISION_PROFILE_AXIS_IDS.map(id => ({
    id,
    label: copy.axes[id].label,
    short: copy.axes[id].short,
    meta: copy.axes[id].meta,
    value: Math.max(1, Math.min(100, Math.round(Number(storedAxes.get(id) ?? fallback[id] ?? 50)))),
    benchmark: Number(profile.benchmark) || 50,
    anchor: anchors[id]
  }))
}

function getManagerComparisonCopy(locale) {
  if (locale === 'en-US') {
    return {
      eyebrow: '01 · POSITION DECISION COMPARISON',
      title: 'Candidate comparison desk',
      meta: 'Select two or three candidates from this position. The desk explains the fit gap, its model drivers and which club need changes the choice.',
      snapshotEyebrow: '30-SECOND DECISION SNAPSHOT',
      snapshotTitle: 'Who to evaluate first — and why',
      snapshotMeta: 'Summarises the current priority, readiness, sample-based ceiling and evidence strength; weighted drivers and exact metrics support follow-up review.',
      snapshotPriority: 'Current first review',
      snapshotReady: 'Fastest route into rotation',
      snapshotReadyMeta: 'Baseline reliability inside the recorded sample',
      snapshotCeiling: 'Highest observed ceiling',
      snapshotCeilingMeta: 'Role-relative sample ceiling — not a future-potential forecast',
      snapshotEvidence: 'Most evidence-stable read',
      snapshotEvidenceMeta: 'Lower of evidence quality and ranking stability',
      snapshotClose: gap => `Only ${gap} points apart · review both`,
      snapshotLead: gap => `${gap}-point lead over the next candidate`,
      snapshotScale: '0–100 · higher is stronger',
      snapshotRunner: 'Nearest alternative',
      snapshotDossier: 'Open first-choice dossier',
      snapshotEvidenceLink: 'See supporting analysis',
      picker: 'Candidates in comparison',
      selected: 'selected',
      print: 'Print one-page brief',
      gapConfidence: 'Gap confidence',
      clear: 'Clear lead',
      conditional: 'Close — decide by need',
      sensitive: 'Model-sensitive',
      axisTitle: 'Same-scale technical comparison',
      axisMeta: 'Every row uses percentile 0–100 or FIT 0–100. The centre line marks the role-relative midpoint.',
      factorTitle: 'Why the leader is ahead',
      factorMeta: 'Weighted point differences reproduce the active FIT formula. Right favours the current leader; left favours the alternate.',
      factorTotal: 'Explained FIT gap',
      routesTitle: 'Which need points to whom',
      routesMeta: 'Re-read only the selected candidates under the four club emphases. A narrow gap is marked for joint review.',
      jointReview: 'Joint review',
      dossier: 'Open dossier',
      evidenceFloor: 'Evidence floor',
      stabilityFloor: 'Stability floor',
      bootstrapWin: 'Adjusted-performance win probability',
      bootstrapMeta: 'match-clustered bootstrap',
      intervalOverlap: 'Ranges overlap',
      intervalSeparated: 'Ranges separated',
      boundary: 'This comparison explains technical trade-offs inside the recorded sample. It does not assess signing interest, communication or future lineup chemistry.'
    }
  }
  if (locale === 'ko-KR') {
    return {
      eyebrow: '01 · POSITION DECISION COMPARISON',
      title: '포지션 후보 비교 데스크',
      meta: '같은 포지션에서 2–3명을 선택해 적합도 차이, 모델상 차이의 원인과 구단 요구에 따른 선택 변화를 함께 봅니다.',
      snapshotEyebrow: '30초 의사결정 요약',
      snapshotTitle: '누구를 먼저 검토할지, 그리고 그 이유',
      snapshotMeta: '현재 우선 후보, 즉시 투입 안정성, 표본 내 기술 상한과 근거 강도를 요약하며 가중 근거와 정밀 지표는 후속 검토에 사용합니다.',
      snapshotPriority: '현재 우선 검토',
      snapshotReady: '즉시 로테이션 적합',
      snapshotReadyMeta: '기록 표본 안의 기준선 신뢰도',
      snapshotCeiling: '관측 표본 상한',
      snapshotCeilingMeta: '세부 역할 상대 표본 상한이며 미래 잠재력 예측이 아닙니다',
      snapshotEvidence: '근거가 가장 안정적인 결론',
      snapshotEvidenceMeta: '근거 품질과 순위 안정도 중 낮은 값',
      snapshotClose: gap => `차이 ${gap}점 · 두 선수 공동 검토`,
      snapshotLead: gap => `차순위보다 ${gap}점 우위`,
      snapshotScale: '0–100 · 높을수록 우수',
      snapshotRunner: '가장 가까운 대안',
      snapshotDossier: '1순위 선수 파일',
      snapshotEvidenceLink: '상세 근거 보기',
      picker: '비교 후보',
      selected: '명 선택',
      print: '1페이지 요약 인쇄',
      gapConfidence: '격차 신뢰도',
      clear: '명확한 우위',
      conditional: '근접 — 요구에 따라 판단',
      sensitive: '모델 민감',
      axisTitle: '동일 척도 기술 비교',
      axisMeta: '모든 행은 백분위 0–100 또는 FIT 0–100이며 중앙선은 역할 기준 중간값입니다.',
      factorTitle: '선두가 앞서는 이유',
      factorMeta: '가중 점수 차이는 현재 FIT 공식을 재현합니다. 오른쪽은 선두, 왼쪽은 차순위 우위입니다.',
      factorTotal: '설명된 FIT 차이',
      routesTitle: '어떤 요구에서 누구를 선택할지',
      routesMeta: '선택한 후보만 네 가지 구단 요구로 다시 비교하며 차이가 작으면 공동 검토로 표시합니다.',
      jointReview: '공동 검토',
      dossier: '선수 파일 보기',
      evidenceFloor: '근거 하한',
      stabilityFloor: '안정도 하한',
      bootstrapWin: '보정 경기력 우위 확률',
      bootstrapMeta: '경기 클러스터 부트스트랩',
      intervalOverlap: '구간 중첩',
      intervalSeparated: '구간 분리',
      boundary: '기록된 표본 안의 기술적 트레이드오프만 설명하며 영입 의사, 소통 또는 미래 라인업 시너지는 판단하지 않습니다.'
    }
  }
  return {
    eyebrow: '01 · POSITION DECISION COMPARISON',
    title: '岗位候选对比台',
    meta: '选择同位置 2–3 名候选，同时解释适配差距、模型差值来源，以及不同俱乐部需求下应该优先看谁。',
    snapshotEyebrow: '30秒决策摘要',
    snapshotTitle: '先看谁，以及为什么',
    snapshotMeta: '汇总当前优先人选、即战稳定性、样本内技术上限与证据强度；加权依据和精确指标用于后续复核。',
    snapshotPriority: '当前优先评估',
    snapshotReady: '最容易立即进入轮换',
    snapshotReadyMeta: '已记录样本中的基线可靠度',
    snapshotCeiling: '样本内技术上限最高',
    snapshotCeilingMeta: '同位置样本上限，不代表未来潜力预测',
    snapshotEvidence: '结论证据最稳',
    snapshotEvidenceMeta: '证据质量与权重稳定度取较低值',
    snapshotClose: gap => `仅差 ${gap} 分 · 建议共同复核`,
    snapshotLead: gap => `领先次位 ${gap} 分`,
    snapshotScale: '0–100 · 越高越优',
    snapshotRunner: '最近替代',
    snapshotDossier: '打开首选档案',
    snapshotEvidenceLink: '查看详细依据',
    picker: '参与对比的候选',
    selected: '人已选',
    print: '打印一页岗位简报',
    gapConfidence: '差距可信度',
    clear: '领先明确',
    conditional: '接近，需要结合需求',
    sensitive: '模型敏感，不能只看排名',
    axisTitle: '同尺度技术对比',
    axisMeta: '所有维度统一使用百分位 0–100 或 FIT 0–100；中线代表同位置中位水平。',
    factorTitle: '为什么首位排在次位之前',
    factorMeta: '加权差值可复现当前 FIT 公式：向右代表首位占优，向左代表次位占优。',
    factorTotal: '已解释 FIT 差距',
    routesTitle: '什么需求下优先看谁',
    routesMeta: '只在已选候选中按四种俱乐部需求重新比较；差距过小时标记为共同复核。',
    jointReview: '共同复核',
    dossier: '查看技术档案',
    evidenceFloor: '证据下限',
    stabilityFloor: '稳定度下限',
    bootstrapWin: '校正表现胜出概率',
    bootstrapMeta: '按比赛聚类 Bootstrap',
    intervalOverlap: '区间重叠',
    intervalSeparated: '区间分离',
    boundary: '本对比只解释已记录样本中的技术取舍，不判断签约意愿、沟通能力或未来阵容化学反应。'
  }
}

function getComparisonPickerCopy(locale) {
  if (locale === 'en-US') return {
    full: 'All 3 comparison slots are filled',
    ready: slots => `${slots} comparison ${slots === 1 ? 'slot' : 'slots'} available`,
    help: 'Select two or three candidates. Select an active candidate again to remove them.',
    fullHelp: 'Remove one active candidate before adding someone else.',
    limitReached: 'The comparison is full. Remove one active candidate before adding another.',
    minimumReached: 'Keep at least two candidates in the comparison.',
    added: (name, count) => `${name} added · ${count}/3 selected`,
    removed: (name, count) => `${name} removed · ${count}/3 selected`
  }
  if (locale === 'ko-KR') return {
    full: '비교 후보 3명이 모두 선택됨',
    ready: slots => `${slots}명 더 선택 가능`,
    help: '후보 2–3명을 선택하세요. 선택된 후보를 다시 누르면 제외됩니다.',
    fullHelp: '다른 후보를 추가하려면 선택된 후보 한 명을 먼저 제외하세요.',
    limitReached: '비교 인원이 가득 찼습니다. 선택된 후보 한 명을 먼저 제외하세요.',
    minimumReached: '비교 후보는 최소 2명을 유지해야 합니다.',
    added: (name, count) => `${name} 추가 · ${count}/3명 선택`,
    removed: (name, count) => `${name} 제외 · ${count}/3명 선택`
  }
  return {
    full: '3 个对比名额已满',
    ready: slots => `还可加入 ${slots} 人`,
    help: '请选择 2–3 名候选；再次点击已选候选即可取消。',
    fullHelp: '如需加入其他人，请先取消一名带彩色圆点的已选候选。',
    limitReached: '对比名额已满，请先取消一名已选候选。',
    minimumReached: '对比至少需要保留 2 名候选。',
    added: (name, count) => `已加入 ${name} · 当前 ${count}/3`,
    removed: (name, count) => `已移除 ${name} · 当前 ${count}/3`
  }
}

function getEvidenceLocatorCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'DECISION EVIDENCE',
    title: 'Evidence behind the current decision',
    meta: 'The current decision is supported by role-relative metrics, pressure-opponent performance and recent match records.',
    metric: 'Role-relative metric',
    opponent: 'Pressure evidence',
    recent: 'Recent-form evidence',
    open: 'Open evidence'
  }
  if (locale === 'ko-KR') return {
    eyebrow: 'DECISION EVIDENCE',
    title: '현재 판단의 핵심 근거',
    meta: '현재 판단은 동일 역할 지표, 강팀 상대 성과와 최근 경기 기록을 함께 근거로 합니다.',
    metric: '동일 역할 지표',
    opponent: '압박 경기 근거',
    recent: '최근 흐름 근거',
    open: '근거 보기'
  }
  return {
    eyebrow: 'DECISION EVIDENCE',
    title: '当前判断的关键依据',
    meta: '当前判断由同职责指标、强敌表现与近期比赛记录共同支撑。',
    metric: '同职责指标',
    opponent: '强敌与压力证据',
    recent: '近期状态证据',
    open: '查看证据'
  }
}

function getDecisionTrailBadges(locale) {
  if (locale === 'en-US') return { raw: 'BASE MODEL', shrunk: 'EVIDENCE SHRINK', stress: 'STRESS FLOOR' }
  if (locale === 'ko-KR') return { raw: '기초 모델', shrunk: '근거 축소', stress: '압박 하한' }
  return { raw: '基础模型', shrunk: '证据收缩', stress: '压力下限' }
}

function getStabilityLabel(status, locale) {
  const t = getCopy(locale)
  if (status === 'STABLE') return t.stable
  if (status === 'WATCH') return t.watch
  return t.boundary
}

function getDeploymentModeLabel(mode, locale) {
  const t = getCopy(locale)
  if (mode === 'CORE_READY') return t.modeCoreReady
  if (mode === 'RELIABLE_BASE') return t.modeReliableBase
  if (mode === 'PRESSURE_OPTION') return t.modePressureOption
  if (mode === 'BALANCED') return t.modeBalanced
  return t.modeTargetedUse
}

function getRecruitmentScenarioCopy(scenario, locale) {
  const t = getCopy(locale)
  const copy = {
    BALANCED: {
      label: t.scenarioBalanced,
      meta: t.scenarioBalancedMeta,
      formula: t.scenarioFormulaBalanced
    },
    RELIABLE_CORE: {
      label: t.scenarioReliableCore,
      meta: t.scenarioReliableCoreMeta,
      formula: t.scenarioFormulaReliableCore
    },
    PRESSURE_MATCH: {
      label: t.scenarioPressureMatch,
      meta: t.scenarioPressureMatchMeta,
      formula: t.scenarioFormulaPressureMatch
    },
    FLEXIBLE_POOL: {
      label: t.scenarioFlexiblePool,
      meta: t.scenarioFlexiblePoolMeta,
      formula: t.scenarioFormulaFlexiblePool
    }
  }
  return copy[scenario] || copy.BALANCED
}

function getRecruitmentScenarioShortLabel(scenario, locale) {
  const copy = {
    BALANCED: { 'zh-CN': '综合', 'en-US': 'BALANCED', 'ko-KR': '종합' },
    RELIABLE_CORE: { 'zh-CN': '即战', 'en-US': 'READY', 'ko-KR': '즉시' },
    PRESSURE_MATCH: { 'zh-CN': '强敌', 'en-US': 'PRESSURE', 'ko-KR': '강팀' },
    FLEXIBLE_POOL: { 'zh-CN': '英雄池', 'en-US': 'HERO POOL', 'ko-KR': '영웅폭' }
  }
  return copy[scenario]?.[locale] || scenario
}

function normalizePercentileValue(percentile) {
  const numeric = Number(percentile)
  if (!Number.isFinite(numeric)) return null
  return Math.max(0, Math.min(100, numeric))
}

function formatPercentileShort(percentile, locale) {
  const value = normalizePercentileValue(percentile)
  if (value == null) return '—'
  const top = Math.max(1, Number((100 - value).toFixed(1)))
  if (locale === 'en-US') return `Top ${top}%`
  if (locale === 'ko-KR') return `상위 ${top}%`
  return `前 ${top}%`
}

function formatPercentileCode(percentile) {
  const value = normalizePercentileValue(percentile)
  return value == null ? '—' : `P${value}`
}

function formatPercentileRead(percentile, locale) {
  const value = normalizePercentileValue(percentile)
  if (value == null) return '—'
  const top = Math.max(1, Number((100 - value).toFixed(1)))
  if (locale === 'en-US') return `Top ${top}% in position · P${value}`
  if (locale === 'ko-KR') return `동일 포지션 상위 ${top}% · P${value}`
  return `同位置前 ${top}% · P${value}`
}

function getPercentileScaleLabel(locale) {
  if (locale === 'en-US') return 'Percentile 0–100'
  if (locale === 'ko-KR') return '백분위 0–100'
  return '百分位 0–100'
}

function getPercentileScaleTicks(locale) {
  if (locale === 'en-US') return 'LOW 0 · MEDIAN 50 · HIGH 100'
  if (locale === 'ko-KR') return '하위 0 · 중앙 50 · 상위 100'
  return '后段 0 · 中位 50 · 前段 100'
}

function getPercentilePointUnit(locale) {
  if (locale === 'en-US') return 'pctile pts'
  if (locale === 'ko-KR') return '백분위점'
  return '分位点'
}

function normalizeRecruitmentScenario(value) {
  const match = Object.entries(RECRUITMENT_SCENARIO_PARAMS).find(([, param]) => param === value)
  return match?.[0] || 'BALANCED'
}

function getOpponentTierLabel(tier, locale) {
  const t = getCopy(locale)
  if (tier === 'STRONG') return t.strongTier
  if (tier === 'PEER') return t.peerTier
  return t.lowerTier
}

function getPlacementLabel(placement, locale) {
  const rank = Number(placement?.rank)
  if (!Number.isFinite(rank) || rank <= 0) return '—'
  const podium = {
    1: { 'zh-CN': '冠军', 'en-US': 'Champion', 'ko-KR': '우승' },
    2: { 'zh-CN': '亚军', 'en-US': 'Runner-up', 'ko-KR': '준우승' },
    3: { 'zh-CN': '季军', 'en-US': '3rd place', 'ko-KR': '3위' },
    4: { 'zh-CN': '殿军', 'en-US': '4th place', 'ko-KR': '4위' }
  }
  if (podium[rank]) return podium[rank][locale] || podium[rank]['zh-CN']
  if (locale === 'en-US') return `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} place`
  if (locale === 'ko-KR') return `${rank}위`
  return `第 ${rank} 名`
}

function getMetricLabel(metricId, locale) {
  return METRIC_COPY[metricId]?.[locale] || metricId
}

function getMapTypeLabel(mapType, locale) {
  return MAP_TYPE_COPY[mapType]?.[locale] || mapType
}

function formatLineupContextKey(contextKey, locale) {
  return String(contextKey || '')
    .split(' + ')
    .map(hero => formatOwHeroName(hero, locale))
    .filter(Boolean)
    .join(' + ') || '—'
}

function getDeploymentContextLabel(status, locale) {
  const t = getCopy(locale)
  if (status === 'PRIMARY') return t.contextPrimary
  if (status === 'STABLE') return t.contextStable
  return t.contextConditional
}

function getNationalityLabel(nationality, locale) {
  return NATIONALITY_COPY[nationality]?.[locale] || nationality || getCopy(locale).unknown
}

function getLocaleParam(locale) {
  if (locale === 'en-US') return 'en'
  if (locale === 'ko-KR') return 'ko'
  return 'zh'
}

function formatMinutes(value) {
  return Math.round(Number(value) || 0).toLocaleString()
}

function formatSignalValue(value, locale) {
  if (!Number.isFinite(value)) return '—'
  return Math.round(value).toLocaleString(locale)
}

function formatSignedPct(value) {
  if (!Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value}%`
}

function formatSignedNumber(value) {
  if (!Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${value}`
}

function HeroIcon({ hero, role, locale }) {
  const [failed, setFailed] = useState(false)
  const src = hero ? getHeroAvatarSrc(hero, role) : ''
  const label = formatOwHeroName(hero, locale)

  useEffect(() => setFailed(false), [src])

  return (
    <span className={styles.heroIcon} aria-label={label}>
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : <b>{label.slice(0, 2)}</b>}
    </span>
  )
}

function getHeroRenderSrc(hero, role) {
  const avatarSrc = hero ? getHeroAvatarSrc(hero, role) : ''
  if (!avatarSrc) return ''
  return avatarSrc.replace('/heroes/', '/review/hero-renders/').replace(/_/g, '-')
}

function HeroArtwork({ hero, role, className = '', loading = 'lazy' }) {
  const avatarSrc = hero ? getHeroAvatarSrc(hero, role) : ''
  const renderSrc = getHeroRenderSrc(hero, role)
  const [src, setSrc] = useState(renderSrc || avatarSrc)

  useEffect(() => setSrc(renderSrc || avatarSrc), [avatarSrc, renderSrc])

  if (!src) return null

  return (
    <img
      className={className}
      src={src}
      alt=""
      aria-hidden="true"
      loading={loading}
      onError={() => setSrc(current => current !== avatarSrc ? avatarSrc : '')}
    />
  )
}

function MetricBar({ metric, locale, medianLabel }) {
  return (
    <div className={styles.metricBar}>
      <div className={styles.metricBarLabel}>
        <span>{getMetricLabel(metric.metricId, locale)}</span>
        <b title={formatPercentileCode(metric.percentile)}>{formatPercentileShort(metric.percentile, locale)}</b>
      </div>
      <div className={styles.metricTrack} aria-label={`${getMetricLabel(metric.metricId, locale)} ${formatPercentileRead(metric.percentile, locale)}`}>
        <i style={{ width: `${Math.max(3, metric.percentile)}%` }} />
        <em style={{ left: '50%' }} title={medianLabel} />
      </div>
    </div>
  )
}

function PlayerCard({ player, locale, to, returnTo, stage = 'season', scenario = 'BALANCED' }) {
  const t = getCopy(locale)
  const topMetrics = player.strengths.slice(0, 2)
  const primaryHero = player.heroPool[0]?.hero || player.summary.primaryHero
  const stageValidation = player.performanceSignals.stageValidation
  const playoff = stageValidation?.playoffs
  const isPlayoffView = stage === 'playoffs'
  const playoffEligible = Boolean(stageValidation?.eligible && playoff)
  const sensitivity = player.selection.preferenceSensitivity
  const deploymentProfile = player.performanceSignals.deploymentProfile
  const subroleEvidence = player.subroleEvidence
  const evidenceLabel = subroleEvidence?.grade === 'FULL' ? t.fullEvidence : t.partialEvidence
  const scenarioFit = getScenarioFit(player, scenario)

  return (
    <Link
      className={`${styles.playerCard} ${styles[`role${player.role}`]} ${styles[`subrole${player.subrole}`] || ''} ${player.tier === 'EXTENDED' ? styles.playerCardExtended : ''} ${player.tier === 'WATCH' ? styles.playerCardWatch : ''}`}
      to={to}
      state={{ returnTo }}
      onPointerEnter={() => preloadScoutingPlayer(player.playerId)}
      onFocus={() => preloadScoutingPlayer(player.playerId)}
      aria-label={`${t.openDossier}: ${player.identity.displayName}`}
    >
      <HeroArtwork hero={primaryHero} role={player.role} className={styles.playerCardArtwork} />
      <div className={styles.playerCardTopline}>
        <span>{getSubroleLabel(player.subrole, locale)} · {t.publicTier}：{getCandidateStatusLabel(player, locale)}</span>
        <small>{t.shortlistRank} #{scenarioFit?.shortlistRank ?? player.highSampleSubroleRank}/{scenarioFit?.shortlistTotal ?? 5} · {t.poolRank} #{scenarioFit?.rank ?? player.highSampleSubroleRank}/{scenarioFit?.total ?? player.highSampleSubroleTotal}</small>
      </div>
      <div className={styles.playerIdentityRow}>
        <HeroIcon hero={primaryHero} role={player.role} locale={locale} />
        <div>
          <h2>{player.identity.displayName}</h2>
          <p>{t.primaryHero} · {formatOwHeroName(primaryHero, locale)} · {t.subroleFit} {player.subroleProfile.primarySharePct}%</p>
        </div>
        <strong>{scenarioFit?.score ?? player.selection.score}<small>FIT</small></strong>
      </div>
      <div className={styles.subroleEvidenceRail}>
        <span><small>{t.subroleEvidence} · {evidenceLabel}</small><b>{subroleEvidence?.confidencePct || 0}%</b></span>
        <i><em style={{ width: `${subroleEvidence?.confidencePct || 0}%` }} /></i>
        <small>{subroleEvidence?.maps || 0} {t.maps} · {formatMinutes(subroleEvidence?.minutes)} {t.minutes} · {subroleEvidence?.matches || 0} {t.matches}</small>
      </div>
      <div className={styles.sampleRow}>
        <span><b>{isPlayoffView ? (playoffEligible ? formatPercentileShort(stageValidation.playoffPerformancePercentile, locale) : '—') : player.summary.seasonOvr}</b>{isPlayoffView ? t.playoffsView : 'OVR'}</span>
        <span><b>{isPlayoffView ? (playoff?.maps || '—') : subroleEvidence?.maps}</b>{isPlayoffView ? t.playoffMaps : t.maps}</span>
        <span><b>{isPlayoffView ? `${stageValidation?.confidencePct || 0}%` : formatPercentileShort(player.performanceSignals.opponentStrength?.adjustedPercentile, locale)}</b>{isPlayoffView ? t.stageConfidence : t.contextAdjusted}</span>
        <span><b>{sensitivity?.relevantPct ?? '—'}%</b>{t.selectionStability}</span>
      </div>
      <div className={styles.cardProfileSignature} aria-label={t.deploymentProfile}>
        {[
          [t.baselineReliability, deploymentProfile?.baselineReliability || 0],
          [t.pressureReadiness, deploymentProfile?.pressureReadiness || 0],
          [t.contextPortability, deploymentProfile?.contextPortability || 0]
        ].map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <i><em style={{ width: `${value}%` }} /></i>
            <b>{value}</b>
          </span>
        ))}
      </div>
      {isPlayoffView ? (
        playoffEligible ? (
          <div className={styles.stageSignalGrid}>
            <span><small>{t.stageValidation}</small><b>{formatPercentileShort(stageValidation.percentile, locale)}</b></span>
            <span><small>{t.stageDelta}</small><b>{formatSignedPct(stageValidation.adjustedDeltaPct)}</b></span>
          </div>
        ) : <p className={styles.stageInsufficient}>{t.insufficientPlayoff}</p>
      ) : (
        <div className={styles.cardMetricList}>
          {topMetrics.map(metric => <MetricBar key={metric.metricId} metric={metric} locale={locale} medianLabel={t.roleMedian} />)}
        </div>
      )}
      <span className={styles.cardAction}>{t.openDossier}<b aria-hidden="true">↗</b></span>
    </Link>
  )
}

function getStrengthText(item, locale) {
  const metric = getMetricLabel(item.metricId, locale)
  const hasSubroleRank = item.benchmarkScope === 'subrole' && item.subroleRank && item.subroleTotal
  if (locale === 'en-US') return hasSubroleRank
    ? `${metric} ranks #${item.subroleRank}/${item.subroleTotal} among same-position candidates (${formatPercentileRead(item.percentile, locale)}): ${item.value} per 10 versus a ${item.average} same-position average.`
    : `${metric} ranks at ${formatPercentileRead(item.percentile, locale)} in-role: ${item.value} per 10 versus a ${item.average} role average.`
  if (locale === 'ko-KR') return hasSubroleRank
    ? `${metric} 지표는 동일 포지션 후보 중 #${item.subroleRank}/${item.subroleTotal}(${formatPercentileRead(item.percentile, locale)})이며 10분당 ${item.value}, 동일 포지션 평균은 ${item.average}입니다.`
    : `${metric} 지표는 동일 역할 ${formatPercentileRead(item.percentile, locale)}이며 10분당 ${item.value}, 역할 평균은 ${item.average}입니다.`
  return hasSubroleRank
    ? `${metric}在同位置完整候选池排名 #${item.subroleRank}/${item.subroleTotal}（${formatPercentileRead(item.percentile, locale)}）：每 10 分钟 ${item.value}，同位置均值 ${item.average}。`
    : `${metric}达到同职责${formatPercentileRead(item.percentile, locale)}：每 10 分钟 ${item.value}，同职责平均 ${item.average}。`
}

function getRiskText(item, locale) {
  if (!item) return ''
  const metric = getMetricLabel(item.metricId, locale)
  const hero = formatOwHeroName(item.primaryHero, locale)

  if (item.type === 'pool_depth') {
    if (locale === 'en-US') return `Only ${item.heroCount} heroes were recorded. Transfer beyond the current pool should be verified; this is not proof of a hard limitation.`
    if (locale === 'ko-KR') return `기록된 영웅은 ${item.heroCount}명입니다. 현재 영웅 폭 밖의 전환 능력은 추가 확인이 필요하며 확정된 한계를 의미하지 않습니다.`
    return `本届赛事仅记录 ${item.heroCount} 名英雄；需要继续验证当前英雄池以外的迁移能力，但这不等同于确认存在硬性短板。`
  }

  if (item.type === 'hero_concentration') {
    if (locale === 'en-US') return `${hero} accounts for ${item.usagePct}% of recorded time. Performance outside that primary context needs more evidence.`
    if (locale === 'ko-KR') return `${hero} 사용 비율이 기록 시간의 ${item.usagePct}%입니다. 주요 환경 밖의 경기력은 더 많은 근거가 필요합니다.`
    return `${hero}占已记录时间的 ${item.usagePct}%；离开主要英雄环境后的表现仍需要更多证据。`
  }

  if (item.type === 'metric_risk') {
    const rank = item.subroleRank && item.subroleTotal ? ` #${item.subroleRank}/${item.subroleTotal}` : ''
    if (locale === 'en-US') return `${metric} is at ${formatPercentileRead(item.percentile, locale)}${rank} among same-position candidates. Review composition and match context before treating it as an individual issue.`
    if (locale === 'ko-KR') return `${metric}은 동일 포지션 ${formatPercentileRead(item.percentile, locale)}${rank}입니다. 개인 문제로 판단하기 전에 조합과 경기 맥락을 함께 검토해야 합니다.`
    return `${metric}在同位置候选中为${formatPercentileRead(item.percentile, locale)}${rank}；在归因到个人前，需要结合阵容与比赛语境复核。`
  }

  const rank = item.subroleRank && item.subroleTotal ? ` · #${item.subroleRank}/${item.subroleTotal}` : ''
  if (locale === 'en-US') return `${metric} at ${formatPercentileRead(item.percentile, locale)}${rank} is the relative low point inside a strong same-position profile, not an absolute weakness.`
  if (locale === 'ko-KR') return `${metric} ${formatPercentileRead(item.percentile, locale)}${rank}는 동일 포지션 종합 프로필 안에서의 상대적 저점이며 절대적인 약점은 아닙니다.`
  return `${metric}${formatPercentileRead(item.percentile, locale)}${rank} 是同位置综合画像中的相对低点，不应直接解释为绝对短板。`
}

function getWeightedDecisionReasons(player, locale, scenario, recruitmentWeights) {
  const t = getCopy(locale)
  const inputs = player?.performanceSignals?.recruitmentScenarios?.inputs || {}
  const weights = recruitmentWeights?.[player?.subrole]?.[scenario] || {}
  const factorRows = Object.entries(weights)
    .map(([factor, weight]) => ({
      factor,
      value: Number(inputs[factor]),
      contribution: Number(inputs[factor]) * Number(weight)
    }))
    .filter(row => Number.isFinite(row.value) && Number.isFinite(row.contribution))
    .sort((a, b) => b.contribution - a.contribution)

  return factorRows.slice(0, 2).map(row => {
    const label = getComparisonFactorLabel(row.factor, t)
    if (locale === 'en-US') return `${label} is ${formatComparisonValue(row.value)}/100 and contributes ${row.contribution.toFixed(1)} points to the active FIT model.`
    if (locale === 'ko-KR') return `${label}은 ${formatComparisonValue(row.value)}/100이며 현재 FIT 모델에 ${row.contribution.toFixed(1)}점을 기여합니다.`
    return `${label}为 ${formatComparisonValue(row.value)}/100，在当前 FIT 模型中贡献 ${row.contribution.toFixed(1)} 分。`
  })
}

function getVerdict(player, locale) {
  const first = player.strengths[0]
  const second = player.strengths[1]
  const firstMetric = getMetricLabel(first?.metricId, locale)
  const secondMetric = getMetricLabel(second?.metricId, locale)

  if (locale === 'en-US') {
    return `${player.identity.displayName} presents a high-confidence ${getRoleLabel(player.role, locale).toLowerCase()} profile led by ${firstMetric} and ${secondMetric}. The sample-depth index is ${player.sampleDepth}/100, so the season-level read is stable enough for shortlist discussion.`
  }
  if (locale === 'ko-KR') {
    return `${player.identity.displayName}의 기술 프로필은 ${firstMetric}와 ${secondMetric}이 중심인 높은 신뢰도의 ${getRoleLabel(player.role, locale)} 유형입니다. 표본 깊이는 ${player.sampleDepth}/100으로 시즌 단위 검토에 충분한 수준입니다.`
  }
  return `${player.identity.displayName}呈现出以${firstMetric}和${secondMetric}为核心的高置信度${getRoleLabel(player.role, locale)}画像。样本深度为 ${player.sampleDepth}/100，足以支持赛季层面的候选讨论。`
}

function getAdditionalWatchpoint(player, locale) {
  const sensitivity = player.selection.preferenceSensitivity
  const formDelta = player.performanceSignals.form?.deltaPct
  if (sensitivity && sensitivity.status !== 'STABLE') {
    if (sensitivity.target === 'CORE_ENTRY') {
      if (locale === 'en-US') return `Top-four entry rate is ${sensitivity.relevantPct}% under the weight-sensitivity audit. This is a watch candidate whose core-pool case depends on club priorities.`
      if (locale === 'ko-KR') return `가중치 민감도 검증에서 상위 4위 진입률은 ${sensitivity.relevantPct}%입니다. 구단 우선순위에 따라 핵심 풀 진입 가능성이 달라지는 관찰 후보입니다.`
      return `权重敏感度检验中，进入分路前四的比例为 ${sensitivity.relevantPct}%；这是核心池资格随俱乐部偏好变化的观察候选。`
    }
    if (locale === 'en-US') return `Roster-tier retention is ${sensitivity.relevantPct}% under the weight-sensitivity audit. The seat changes more than the stable group when club priorities shift.`
    if (locale === 'ko-KR') return `가중치 민감도 검증에서 현재 명단 층위 유지율은 ${sensitivity.relevantPct}%입니다. 구단 우선순위가 바뀌면 안정군보다 좌석 변동 가능성이 큽니다.`
    return `权重敏感度检验中，当前名单层级保留率为 ${sensitivity.relevantPct}%；当俱乐部偏好变化时，该席位比稳定组更容易发生变动。`
  }
  if (locale === 'en-US') return `Recent five-map change is ${formatSignedPct(formDelta)} versus the previous five. Treat the short window as monitoring evidence, not a new baseline.`
  if (locale === 'ko-KR') return `최근 5개 전장은 이전 5개 대비 ${formatSignedPct(formDelta)}입니다. 짧은 구간은 새로운 기준선이 아니라 모니터링 근거로 봐야 합니다.`
  return `最近 5 图相对此前 5 图变化为 ${formatSignedPct(formDelta)}；短窗口只作为跟踪证据，不替代赛季基线。`
}

function getProfessionalReferenceCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'PROFESSIONAL SAMPLE REFERENCE · NON-SCORING',
    title: 'Professional role-shape reference',
    managerTitle: 'Professional role shape',
    meta: 'Same-map team-share structure is compared with two professional same-position samples; no cross-competition strength conversion is made.',
    currentRead: 'Professional sample comparison',
    nonScoring: 'NON-SCORING',
    recent: 'Recent regional pro sample',
    elite: 'International elite sample',
    player: 'This event',
    middleHalf: 'middle 50%',
    median: 'median',
    sample: 'players',
    high: 'favourable-end shape',
    range: 'common range',
    watch: 'review-end shape',
    mixed: 'sample directions differ',
    open: 'Open professional evidence',
    ranking: 'This reference does not add FIT points or change shortlist order.',
    boundary: 'Contribution shape is not skill equivalence. Event strength, teammate quality, patch and regional style remain uncalibrated.',
    verification: 'Priority verification',
    unavailable: 'A professional role-shape reference is not available for this profile.'
  }
  if (locale === 'ko-KR') return {
    eyebrow: 'PROFESSIONAL SAMPLE REFERENCE · NON-SCORING',
    title: '프로 역할 형태 참고',
    managerTitle: '프로 역할 형태',
    meta: '동일 전장 팀 기여 구조를 같은 포지션의 두 프로 표본과 비교하며 대회 간 실력 환산은 하지 않습니다.',
    currentRead: '프로 표본 비교',
    nonScoring: 'FIT 미반영',
    recent: '최근 지역 프로 표본',
    elite: '국제 엘리트 표본',
    player: '본 대회',
    middleHalf: '중간 50%',
    median: '중앙값',
    sample: '명',
    high: '유리한 쪽 형태',
    range: '일반 범위',
    watch: '확인 필요 형태',
    mixed: '두 표본 방향 불일치',
    open: '프로 근거 열기',
    ranking: '이 참고값은 FIT 점수나 후보 순위를 바꾸지 않습니다.',
    boundary: '기여 형태는 실력 등가가 아닙니다. 대회 강도, 동료 수준, 패치와 지역 스타일은 아직 교정되지 않았습니다.',
    verification: '우선 확인 항목',
    unavailable: '이 프로필에는 사용할 수 있는 프로 역할 형태 참고가 없습니다.'
  }
  return {
    eyebrow: 'PROFESSIONAL SAMPLE REFERENCE · NON-SCORING',
    title: '职业角色形态参考',
    managerTitle: '职业角色形态',
    meta: '本赛事同图队内贡献结构与两组职业同位置样本进行对照，不进行跨赛事强度换算。',
    currentRead: '职业样本对照',
    nonScoring: '不参与 FIT',
    recent: '近期区域职业样本',
    elite: '国际精英样本',
    player: '本赛事选手',
    middleHalf: '中间 50%',
    median: '中位',
    sample: '人',
    high: '有利端形态',
    range: '常见区间',
    watch: '待核验端形态',
    mixed: '两组样本方向不一致',
    open: '查看职业参考证据',
    ranking: '该参考不向 FIT 加分，也不改变名单顺序。',
    boundary: '贡献形态不等于实力等价；赛事强度、队友水平、版本和地区风格仍未完成校准。',
    verification: '优先验证问题',
    unavailable: '该画像暂时没有可用的职业角色形态样本。'
  }
}

function getProfessionalSignalLabel(row, datasetKey, locale) {
  const copy = getProfessionalReferenceCopy(locale)
  const signal = row?.[datasetKey]?.signal
  if (signal === 'POSITIVE_SIGNAL') return copy.high
  if (signal === 'WATCH_SIGNAL') return copy.watch
  if (signal === 'REFERENCE_RANGE') return copy.range
  return copy.mixed
}

function buildProfessionalReferenceRead(player, locale, meta) {
  const reference = player?.performanceSignals?.professionalReference
  if (!reference?.metrics?.length) return null
  const byMetric = new Map(reference.metrics.map(row => [row.metricId, row]))
  const signatureRows = (reference.signatureMetricIds || []).map(metricId => byMetric.get(metricId)).filter(Boolean)
  const signature = signatureRows[0] || reference.metrics[0]
  const watch = reference.watchMetricId ? byMetric.get(reference.watchMetricId) : null
  const signatureMetric = getMetricLabel(signature.metricId, locale)
  const signatureSignal = getProfessionalSignalLabel(signature, 'recent', locale)
  const watchMetric = watch ? getMetricLabel(watch.metricId, locale) : ''
  const watchSignal = watch ? getProfessionalSignalLabel(watch, 'recent', locale) : ''
  let summary = ''

  if (locale === 'en-US') {
    summary = `${signatureMetric} team-share structure sits in the ${signatureSignal.toLowerCase()} of the recent same-position professional sample.`
    if (watch && watch.metricId !== signature.metricId) summary += ` ${watchMetric} sits on the ${watchSignal.toLowerCase()} and is the first transfer question to verify.`
    summary += ' This describes role shape, not professional-level strength.'
  } else if (locale === 'ko-KR') {
    summary = `${signatureMetric} 팀 기여 구조는 최근 동일 포지션 프로 표본의 ${signatureSignal}에 위치합니다.`
    if (watch && watch.metricId !== signature.metricId) summary += ` ${watchMetric}은 ${watchSignal}로, 상위 강도 전환에서 먼저 확인할 항목입니다.`
    summary += ' 이는 역할 형태 설명이며 프로 수준의 실력 판정이 아닙니다.'
  } else {
    summary = `${signatureMetric}队内贡献结构落在近期职业同位置样本的${signatureSignal}。`
    if (watch && watch.metricId !== signature.metricId) summary += `${watchMetric}处于${watchSignal}，是跨强度验证时应优先复核的部分。`
    summary += '这描述的是角色形态，不代表达到职业比赛强度。'
  }

  return {
    ...reference,
    meta,
    summary,
    signatureRows,
    watchRow: watch
  }
}

function buildPlayerDecisionContract(player, locale, activeScenario, recruitmentWeights, professionalReferenceMeta) {
  const analystNote = getScoutingAnalystNote(player.playerId, locale, player)
  const weightedReasons = getWeightedDecisionReasons(player, locale, activeScenario, recruitmentWeights)
  const reasons = [
    ...weightedReasons,
    ...player.strengths.slice(0, Math.max(1, 3 - weightedReasons.length)).map(item => getStrengthText(item, locale))
  ].slice(0, 3)
  const sensitivity = player.selection.preferenceSensitivity
  const watchpoints = player.risks
    .slice(0, sensitivity?.status === 'STABLE' ? 2 : 1)
    .map(item => getRiskText(item, locale))
  while (watchpoints.length < 2) watchpoints.push(getAdditionalWatchpoint(player, locale))

  return {
    version: 'player-decision-contract-v2',
    archetype: analystNote?.archetype || getCandidateStatusLabel(player, locale),
    managerSummary: formatOwNamesInText(analystNote?.managerSummary || analystNote?.verdict || getVerdict(player, locale), locale),
    verdict: formatOwNamesInText(analystNote?.verdict || getVerdict(player, locale), locale),
    reasons,
    watchpoints: watchpoints.slice(0, 2),
    tacticalHypothesis: formatOwNamesInText(analystNote?.tacticalHypothesis || '', locale),
    verificationQuestions: (analystNote?.vodQuestions || []).map(question => formatOwNamesInText(question, locale)),
    professionalReference: buildProfessionalReferenceRead(player, locale, professionalReferenceMeta)
  }
}

function PlayerDecisionBrief({ player, locale, decision }) {
  const t = getCopy(locale)
  const evidence = player.performanceSignals.opponentStrength?.evidenceQuality
  const subroleEvidence = player.subroleEvidence
  const subroleEvidenceLabel = subroleEvidence?.grade === 'FULL' ? t.fullEvidence : t.partialEvidence
  const sensitivity = player.selection.preferenceSensitivity
  const robustness = player.selection.robustness
  const reasons = decision?.reasons || []
  const watchpoints = decision?.watchpoints || []

  return (
    <div className={styles.decisionBrief}>
      <article className={styles.decisionVerdict}>
        <span>{t.decisionBrief}</span>
        {decision ? <strong className={styles.archetype}>{t.archetype} · {decision.archetype}</strong> : null}
        <p>{decision?.verdict || getVerdict(player, locale)}</p>
      </article>
      <div className={styles.decisionLists}>
        <article>
          <header><span>01</span><strong>{t.whyShortlisted}</strong></header>
          <ol>{reasons.map((reason, index) => <li key={`${index}-${reason}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{reason}</p></li>)}</ol>
        </article>
        <article>
          <header><span>02</span><strong>{t.decisionRisks}</strong></header>
          <ol>{watchpoints.slice(0, 2).map((watchpoint, index) => <li key={`${index}-${watchpoint}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{watchpoint}</p></li>)}</ol>
        </article>
      </div>
      <article className={styles.reliabilityCard}>
        <div>
          <span>{t.evidenceConfidence}</span>
          <strong>{evidence?.grade || '—'} <small>{evidence?.confidencePct || 0}%</small></strong>
          <i><em style={{ width: `${evidence?.confidencePct || 0}%` }} /></i>
          <p>{evidence?.effectiveMaps || '—'} {t.effectiveMaps} · {evidence?.effectiveOpponents || '—'} {t.effectiveOpponents}</p>
        </div>
        <div>
          <span>{t.selectionStability}</span>
          <strong>{sensitivity?.relevantPct ?? '—'}% <small>{getStabilityLabel(sensitivity?.status, locale)}</small></strong>
          <i><em style={{ width: `${sensitivity?.relevantPct || 0}%` }} /></i>
          <p>{t.preferenceSensitivity}</p>
        </div>
        <div>
          <span>{t.rankingStressTest}</span>
          <strong>{getRobustnessLabel(robustness?.status, t)} <small>{robustness?.worstRankDrop ? `${t.rankDrop} ${robustness.worstRankDrop}` : t.rankNoDrop} · {t.selectionScore} −{robustness?.worstScoreDrop || 0}</small></strong>
          <i><em style={{ width: `${Math.max(8, 100 - ((robustness?.worstRankDrop || 0) * 22))}%` }} /></i>
          <p>{t.removeWeakOpponent} {robustness?.removeWeakestOpponent?.opponentTeamName || '—'} {(robustness?.removeWeakestOpponent?.rankDelta || 0) > 0 ? `−${robustness.removeWeakestOpponent.rankDelta}` : '±0'} · {t.leaveOneMatchOut} {robustness?.leaveOneMatchOut?.influentialOpponentName || '—'} {(robustness?.leaveOneMatchOut?.rankDelta || 0) > 0 ? `−${robustness.leaveOneMatchOut.rankDelta}` : '±0'}</p>
        </div>
        <small>
          <b>{t.subroleEvidence} {subroleEvidence?.confidencePct || 0}% · {subroleEvidenceLabel} · {subroleEvidence?.maps || 0} {t.maps} · {formatMinutes(subroleEvidence?.minutes)} {t.minutes} · {subroleEvidence?.matches || 0} {t.matches}</b>
          {t.preferenceSensitivityMeta} {t.stressMethodMeta}
        </small>
      </article>
    </div>
  )
}

function DecisionEvidenceLocator({ player, locale, coachHref }) {
  const copy = getEvidenceLocatorCopy(locale)
  const topMetric = player.strengths?.[0]
  const opponent = player.performanceSignals?.opponentStrength || {}
  const pressure = opponent.pressureTest || {}
  const form = player.performanceSignals?.form || {}
  const metricMeta = topMetric
    ? locale === 'en-US'
      ? `${topMetric.value} per 10 · same-position average ${topMetric.average} · #${topMetric.subroleRank || '—'}/${topMetric.subroleTotal || '—'}`
      : locale === 'ko-KR'
        ? `10분당 ${topMetric.value} · 동일 포지션 평균 ${topMetric.average} · #${topMetric.subroleRank || '—'}/${topMetric.subroleTotal || '—'}`
        : `每 10 分钟 ${topMetric.value} · 同位置均值 ${topMetric.average} · #${topMetric.subroleRank || '—'}/${topMetric.subroleTotal || '—'}`
    : '—'
  const pressureMeta = locale === 'en-US'
    ? `${pressure.maps || 0} maps · ${pressure.retentionPct ?? '—'}% baseline retained`
    : locale === 'ko-KR'
      ? `${pressure.maps || 0}개 전장 · 기준선 ${pressure.retentionPct ?? '—'}% 유지`
      : `${pressure.maps || 0} 图 · 保持个人基线 ${pressure.retentionPct ?? '—'}%`
  const formMeta = locale === 'en-US'
    ? `Latest ${form.recentMaps || 5} maps versus previous ${form.previousMaps || 5}`
    : locale === 'ko-KR'
      ? `최근 ${form.recentMaps || 5}개 전장 ↔ 이전 ${form.previousMaps || 5}개`
      : `最近 ${form.recentMaps || 5} 图 ↔ 此前 ${form.previousMaps || 5} 图`
  const items = [
    {
      id: 'metric',
      anchor: 'evidence-role-metrics',
      label: copy.metric,
      value: topMetric ? `${getMetricLabel(topMetric.metricId, locale)} · ${formatPercentileShort(topMetric.percentile, locale)}` : '—',
      meta: topMetric ? `${metricMeta} · ${formatPercentileCode(topMetric.percentile)}` : metricMeta
    },
    {
      id: 'opponent',
      anchor: 'evidence-strong-opponents',
      label: copy.opponent,
      value: formatPercentileShort(pressure.percentile, locale),
      meta: `${pressureMeta} · ${formatPercentileCode(pressure.percentile)}`
    },
    {
      id: 'recent',
      anchor: 'evidence-recent-form',
      label: copy.recent,
      value: formatSignedPct(form.deltaPct),
      meta: formMeta
    }
  ]

  return (
    <section className={styles.evidenceLocator} aria-labelledby="evidence-locator-title">
      <header>
        <div><span>{copy.eyebrow}</span><h3 id="evidence-locator-title">{copy.title}</h3></div>
        <p>{copy.meta}</p>
      </header>
      <div>
        {items.map(item => {
          const content = (
            <>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.meta}</small>
              <b>{copy.open} ↗</b>
            </>
          )
          return coachHref ? (
            <Link key={item.id} to={coachHref(item.anchor)}>{content}</Link>
          ) : (
            <a key={item.id} href={`#${item.anchor}`}>{content}</a>
          )
        })}
      </div>
    </section>
  )
}

const TEAM_SHARE_METRICS_BY_SUBROLE = {
  TANK: ['dmg', 'elim', 'ast'],
  HITSCAN: ['dmg', 'elim', 'ast'],
  FLEX_DPS: ['elim', 'dmg', 'ast'],
  MAIN_SUPPORT: ['heal', 'ast', 'elim'],
  FLEX_SUPPORT: ['heal', 'dmg', 'ast']
}

function getShadowValidationCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'INDEPENDENT ROBUSTNESS CHECK · NOT IN FIT',
    title: 'Robustness beyond the headline score',
    meta: 'Two independent checks assess role context and time stability without changing the current shortlist.',
    temporal: 'Chronological holdout',
    temporalMeta: 'First half of matches → second half, benchmarked inside the full same-position pool.',
    insufficient: 'Not enough match clusters for a 3 + 3 holdout.',
    contribution: 'Same-map team contribution',
    contributionMeta: 'Share of recorded team totals on the same map; 0–50% visual scale.',
    coverage: 'complete-lineup coverage',
    noRanking: 'These diagnostics do not add FIT points or change candidate order.'
  }
  if (locale === 'ko-KR') return {
    eyebrow: '독립 안정성 검증 · FIT 미반영',
    title: '대표 점수 밖의 결론 안정성',
    meta: '두 가지 독립 검증으로 포지션 맥락과 시간 안정성을 평가하며 현재 후보 순위는 바꾸지 않습니다.',
    temporal: '시간 순서 홀드아웃',
    temporalMeta: '경기 전반부 → 후반부를 동일 포지션 전체 후보군 안에서 다시 비교합니다.',
    insufficient: '3 + 3 경기 클러스터 홀드아웃에 필요한 표본이 부족합니다.',
    contribution: '동일 전장 팀 기여 비중',
    contributionMeta: '같은 전장에서 기록된 팀 합계 중 비중이며 시각 척도는 0–50%입니다.',
    coverage: '완전 라인업 커버리지',
    noRanking: '진단 결과는 FIT 점수를 더하거나 후보 순위를 바꾸지 않습니다.'
  }
  return {
    eyebrow: '独立稳健性验证 · 不计入 FIT',
    title: '总分之外的结论稳健性',
    meta: '两项独立检验用于评估位置语境与时间稳定性，不改变当前候选顺位。',
    temporal: '时间留出验证',
    temporalMeta: '按比赛顺序以前半段预测后半段，并在同位置完整池重新比较。',
    insufficient: '比赛聚类不足，暂不形成 3 + 3 的时间留出判断。',
    contribution: '同图队内贡献占比',
    contributionMeta: '同一地图内占队伍已记录总量的比例；图形按 0–50% 尺度显示。',
    coverage: '完整阵容覆盖',
    noRanking: '这些诊断不向 FIT 加分，也不改变候选顺序。'
  }
}

function ShadowValidationPanel({ player, locale }) {
  const copy = getShadowValidationCopy(locale)
  const temporal = player?.performanceSignals?.temporalValidation || {}
  const contribution = player?.performanceSignals?.opponentStrength?.teamContribution || {}
  const metricIds = TEAM_SHARE_METRICS_BY_SUBROLE[player?.subrole] || ['dmg', 'elim', 'ast']
  const contributionRows = metricIds.map(metricId => ({
    metricId,
    ...contribution.metrics?.[metricId]
  })).filter(row => Number.isFinite(Number(row.sharePct)))

  return (
    <section className={styles.shadowValidation} aria-labelledby="shadow-validation-title">
      <header>
        <div><span>{copy.eyebrow}</span><h3 id="shadow-validation-title">{copy.title}</h3></div>
        <p>{copy.meta}</p>
      </header>
      <div className={styles.shadowValidationGrid}>
        <article data-status={temporal.status || 'INSUFFICIENT'}>
          <div><span>{copy.temporal}</span><small>{copy.temporalMeta}</small></div>
          {temporal.eligible ? (
            <>
              <strong>#{temporal.earlyRank}/{temporal.total}<i>→</i>#{temporal.lateRank}/{temporal.total}</strong>
              <div className={styles.temporalRails}>
                <span><small>EARLY · {formatPercentileRead(temporal.earlyPercentile, locale)}</small><i><em style={{ width: `${temporal.earlyPercentile}%` }} /></i></span>
                <span><small>LATE · {formatPercentileRead(temporal.latePercentile, locale)}</small><i><em style={{ width: `${temporal.latePercentile}%` }} /></i></span>
              </div>
            </>
          ) : <p>{copy.insufficient}</p>}
        </article>
        <article>
          <div><span>{copy.contribution}</span><small>{copy.contributionMeta}</small></div>
          <div className={styles.teamShareRows}>
            {contributionRows.map(row => (
              <span key={row.metricId}>
                <small>{getMetricLabel(row.metricId, locale)}</small>
                <i><em style={{ width: `${Math.min(100, Number(row.sharePct) * 2)}%` }} /></i>
                <strong>{row.sharePct}%</strong>
              </span>
            ))}
          </div>
          <p>{contribution.coveragePct || 0}% {copy.coverage}</p>
        </article>
      </div>
      <footer>{copy.noRanking}</footer>
    </section>
  )
}

function getProfessionalReferenceScaleMax(row) {
  const maxValue = Math.max(
    Number(row?.sharePct) || 0,
    Number(row?.recent?.q3) || 0,
    Number(row?.elite?.q3) || 0
  )
  if (maxValue > 65) return 100
  if (maxValue > 38) return 60
  if (maxValue > 28) return 40
  if (maxValue > 18) return 35
  return 20
}

function ProfessionalReferenceRail({ row, datasetKey, datasetLabel, sampleSize, locale }) {
  const read = row?.[datasetKey]
  if (!read) return null
  const copy = getProfessionalReferenceCopy(locale)
  const scaleMax = getProfessionalReferenceScaleMax(row)
  const toPosition = value => `${Math.max(0, Math.min(100, (Number(value) / scaleMax) * 100))}%`
  return (
    <div className={styles.professionalReferenceRow} data-signal={read.signal}>
      <div><span>{datasetLabel}</span><small>n={sampleSize || '—'} · {getProfessionalSignalLabel(row, datasetKey, locale)}</small></div>
      <div
        className={styles.professionalReferenceRail}
        style={{
          '--reference-q1': toPosition(read.q1),
          '--reference-median': toPosition(read.median),
          '--reference-q3': toPosition(read.q3),
          '--reference-player': toPosition(row.sharePct)
        }}
        aria-label={`${datasetLabel}: ${copy.middleHalf} ${read.q1}%–${read.q3}%, ${copy.median} ${read.median}%, ${copy.player} ${row.sharePct}%`}
      >
        <i /><b /><em />
      </div>
      <strong>{row.sharePct}%</strong>
    </div>
  )
}

function ProfessionalReferencePanel({ player, locale, decision }) {
  const copy = getProfessionalReferenceCopy(locale)
  const reference = decision?.professionalReference
  if (!reference?.metrics?.length) return null
  const recentMeta = reference.meta?.datasets?.RECENT || {}
  const eliteMeta = reference.meta?.datasets?.ELITE || {}
  const recentSample = recentMeta.sampleBySubrole?.[player.subrole]
  const eliteSample = eliteMeta.sampleBySubrole?.[player.subrole]

  return (
    <section id="professional-reference" className={`${styles.professionalReference} ${styles.anchorSection}`} aria-labelledby="professional-reference-title">
      <header>
        <div><span>{copy.eyebrow}</span><h3 id="professional-reference-title">{copy.title}</h3><p>{copy.meta}</p></div>
        <aside><span>{copy.player}</span><strong>{reference.coveragePct}%</strong><small>{reference.metricCount} METRICS</small></aside>
      </header>
      <article className={styles.professionalReferenceConclusion}>
        <span>{copy.currentRead}</span>
        <p>{reference.summary}</p>
      </article>
      <div className={styles.professionalReferenceLegend}>
        <span><i className={styles.professionalReferenceIqr} />{copy.middleHalf}</span>
        <span><i className={styles.professionalReferenceMedian} />{copy.median}</span>
        <span><i className={styles.professionalReferencePlayer} />{copy.player}</span>
      </div>
      <div className={styles.professionalReferenceMetrics}>
        {reference.metrics.map(row => (
          <article key={row.metricId} data-consensus={row.consensusSignal}>
            <header><span>{getMetricLabel(row.metricId, locale)}</span><strong>{row.sharePct}%<small>{copy.player}</small></strong></header>
            <ProfessionalReferenceRail row={row} datasetKey="recent" datasetLabel={copy.recent} sampleSize={recentSample} locale={locale} />
            <ProfessionalReferenceRail row={row} datasetKey="elite" datasetLabel={copy.elite} sampleSize={eliteSample} locale={locale} />
          </article>
        ))}
      </div>
      <footer>
        <div><b>{copy.ranking}</b><p>{copy.boundary}</p></div>
        <small>{recentMeta.label} · {recentMeta.dateFrom}—{recentMeta.dateTo} · {recentMeta.matches || '—'} MATCHES<br />{eliteMeta.label} · {eliteMeta.dateFrom}—{eliteMeta.dateTo} · {eliteMeta.matches || '—'} MATCHES</small>
      </footer>
    </section>
  )
}

function ManagerProfessionalReference({ player, locale, decision, coachHref }) {
  const copy = getProfessionalReferenceCopy(locale)
  const reference = decision?.professionalReference
  if (!reference) return null
  const signalRows = [...(reference.signatureRows || []), reference.watchRow].filter((row, index, rows) => (
    row && rows.findIndex(item => item?.metricId === row.metricId) === index
  )).slice(0, 3)

  return (
    <section className={styles.managerProfessionalReference} style={{ '--slot-color': SUBROLE_COLORS[player.subrole] }}>
      <header><div><span>{copy.eyebrow}</span><h3>{copy.managerTitle}</h3></div><b>{copy.nonScoring}</b></header>
      <p>{reference.summary}</p>
      <div>
        {signalRows.map(row => (
          <span key={row.metricId} data-signal={row.recent.signal}>
            <small>{getMetricLabel(row.metricId, locale)}</small>
            <strong>{getProfessionalSignalLabel(row, 'recent', locale)}</strong>
          </span>
        ))}
      </div>
      {decision.verificationQuestions?.[0] ? <aside><span>{copy.verification}</span><p>{decision.verificationQuestions[0]}</p></aside> : null}
      <footer><p>{copy.ranking}</p><Link to={coachHref('professional-reference')}>{copy.open} ↗</Link></footer>
    </section>
  )
}

function getDisclosureCopy(locale) {
  if (locale === 'en-US') return {
    rankTitle: 'Open full requirement-sensitivity ranking',
    rankMeta: 'Complete rank and FIT-gap movement for all five candidates across the four selection emphases.',
    auditTitle: 'Open model transformation audit',
    auditMeta: 'Trace raw score → context adjustment → confidence shrinkage → final selection score.'
  }
  if (locale === 'ko-KR') return {
    rankTitle: '전체 요구 민감도 순위 열기',
    rankMeta: '다섯 후보의 네 가지 평가 초점별 순위와 FIT 격차 변화를 모두 보여 줍니다.',
    auditTitle: '모델 변환 감사 열기',
    auditMeta: '원점수 → 맥락 보정 → 신뢰도 축소 → 최종 선발 점수를 추적합니다.'
  }
  return {
    rankTitle: '展开完整需求敏感度排名',
    rankMeta: '完整呈现五名候选在四种用人侧重下的顺位与 FIT 分差变化。',
    auditTitle: '展开模型变换审计',
    auditMeta: '追溯原始分 → 语境校正 → 置信度收缩 → 最终选拔分。'
  }
}

function DecisionProfileTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null
  const row = payload.find(item => item.dataKey === 'value')?.payload || payload[0]?.payload
  if (!row) return null
  const band = getDecisionProfileBand(row.value, locale)
  return (
    <div className={styles.managerProfileTooltip}>
      <span>{row.label}</span>
      <strong>{row.value}<small>/100 · {band.label}</small></strong>
      <p>{row.meta}</p>
    </div>
  )
}

function ManagerDecisionProfile({ player, locale, coachHref }) {
  const copy = getDecisionProfileCopy(locale)
  const axes = getDecisionProfileAxes(player, locale)
  const rankedAxes = [...axes].sort((a, b) => b.value - a.value)
  const topAxis = rankedAxes[0]
  const watchAxis = rankedAxes[rankedAxes.length - 1]
  const profile = player.performanceSignals?.decisionProfile || {}
  const evidence = player.performanceSignals?.opponentStrength?.evidenceQuality || {}
  const evidenceGrade = profile.evidenceGrade || evidence.grade || '—'
  const evidenceConfidence = profile.evidenceConfidencePct ?? evidence.confidencePct ?? 0
  const playerColor = SUBROLE_COLORS[player.subrole]

  return (
    <section
      className={styles.managerDecisionProfile}
      style={{ '--slot-color': playerColor }}
      aria-labelledby="manager-decision-profile-title"
    >
      <header>
        <div>
          <span>{copy.eyebrow}</span>
          <h3 id="manager-decision-profile-title">{getSubroleLabel(player.subrole, locale)} · {copy.title}</h3>
          <p>{copy.meta}</p>
        </div>
        <aside>
          <span>{copy.confidence}</span>
          <strong>{evidenceGrade}</strong>
          <small>{evidenceConfidence}%</small>
        </aside>
      </header>

      <div className={styles.managerDecisionProfileBody}>
        <div
          className={styles.managerRadarStage}
          role="img"
          aria-label={`${player.identity.displayName} · ${copy.title} · ${axes.map(axis => `${axis.label} ${axis.value}/100`).join(' · ')}`}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={360} initialDimension={{ width: 560, height: 420 }}>
            <RadarChart data={axes} cx="50%" cy="50%" outerRadius="67%" margin={{ top: 34, right: 56, bottom: 34, left: 56 }}>
              <PolarGrid stroke="rgba(255,255,255,.12)" gridType="polygon" />
              <PolarAngleAxis dataKey="short" tick={{ fill: 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: 800 }} tickLine={false} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
              <Radar
                name={copy.median}
                dataKey="benchmark"
                stroke="rgba(255,255,255,.48)"
                strokeWidth={1.5}
                strokeDasharray="5 6"
                fill="transparent"
                dot={false}
                isAnimationActive={false}
              />
              <Radar
                name={copy.playerShape}
                dataKey="value"
                stroke={playerColor}
                strokeWidth={3}
                fill={playerColor}
                fillOpacity={0.2}
                dot={{ r: 4, fill: playerColor, stroke: '#0c1015', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#fff', stroke: playerColor, strokeWidth: 3 }}
                isAnimationActive={false}
              />
              <Tooltip cursor={false} content={<DecisionProfileTooltip locale={locale} />} />
            </RadarChart>
          </ResponsiveContainer>
          <div className={styles.managerRadarLegend} aria-hidden="true">
            <span><i /><b>{copy.playerShape}</b></span>
            <span><i /><b>{copy.median}</b></span>
          </div>
        </div>

        <div className={styles.managerProfileReadout}>
          <article className={styles.managerProfileNarrative}>
            <span>{copy.profileRead}</span>
            <strong>{topAxis.label} · {getDecisionProfileBand(topAxis.value, locale).label}</strong>
            <p>{getDecisionProfileRead(topAxis, watchAxis, locale)}</p>
          </article>
          <div className={styles.managerProfileAxisList}>
            {axes.map((axis, index) => {
              const band = getDecisionProfileBand(axis.value, locale)
              return (
                <Link
                  key={axis.id}
                  to={coachHref(axis.anchor)}
                  data-level={band.level}
                  aria-label={`${copy.open}: ${axis.label} ${axis.value}/100`}
                >
                  <div>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <b>{axis.label}</b>
                    <small>{axis.meta}</small>
                  </div>
                  <strong>{axis.value}<small>/100</small></strong>
                  <em>{band.label}</em>
                  <i aria-hidden="true"><b style={{ width: `${axis.value}%` }} /><span style={{ left: `${axis.benchmark}%` }} /></i>
                  <u>{copy.open} ↗</u>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <footer><span>SCALE · 0—100</span><p>{copy.boundary}</p></footer>
    </section>
  )
}

function ManagerPlayerSnapshot({ player, locale, activeScenario, decision }) {
  const t = getCopy(locale)
  const copy = getManagerDossierCopy(locale)
  const fit = getScenarioFit(player, activeScenario) || getScenarioFit(player, 'BALANCED')
  const scenarioCopy = getRecruitmentScenarioCopy(activeScenario, locale)
  const deployment = player.performanceSignals?.deploymentProfile || {}
  const opponent = player.performanceSignals?.opponentStrength || {}
  const evidence = opponent.evidenceQuality || {}
  const stability = player.selection?.preferenceSensitivity || {}
  const primaryUse = opponent.deploymentPlaybook?.recommendations?.primaryUse
  const evidenceShield = Math.min(Number(evidence.confidencePct) || 0, Number(stability.relevantPct) || 0)
  const lenses = [
    {
      id: 'ready',
      label: copy.snapshotReady,
      meta: copy.snapshotReadyMeta,
      value: Number(deployment.baselineReliability) || 0
    },
    {
      id: 'ceiling',
      label: copy.snapshotCeiling,
      meta: copy.snapshotCeilingMeta,
      value: Number(opponent.performanceEnvelope?.ceilingPercentile) || 0
    },
    {
      id: 'evidence',
      label: copy.snapshotEvidenceShield,
      meta: copy.snapshotEvidenceShieldMeta,
      value: evidenceShield
    }
  ]
  const firstCheck = decision?.watchpoints?.[0] || getAdditionalWatchpoint(player, locale)

  return (
    <section className={styles.managerPlayerSnapshot} style={{ '--slot-color': SUBROLE_COLORS[player.subrole] }} aria-labelledby="manager-player-snapshot-title">
      <header className={styles.managerPlayerSnapshotHeader}>
        <div>
          <span>{copy.snapshotEyebrow}</span>
          <h3 id="manager-player-snapshot-title">{copy.snapshotTitle(player.identity.displayName)}</h3>
          <strong>{decision?.archetype || getCandidateStatusLabel(player, locale)}</strong>
          <p>{decision?.managerSummary || decision?.verdict || getVerdict(player, locale)}</p>
        </div>
        <aside>
          <span>{copy.snapshotPosition}</span>
          <strong>{scenarioCopy.label}</strong>
          <div className={styles.managerRankScopes}>
            <span><small>{t.shortlistRank}</small><b>#{fit?.shortlistRank ?? player.highSampleSubroleRank}/{fit?.shortlistTotal ?? 5}</b></span>
            <span><small>{t.publicTier}</small><b>{getCandidateStatusLabel(player, locale)}</b></span>
            <span><small>{t.poolRank}</small><b>#{fit?.rank ?? player.highSampleSubroleRank}/{fit?.total ?? player.highSampleSubroleTotal}</b></span>
          </div>
          <p>{scenarioCopy.label} · {fit?.score ?? '—'} FIT</p>
        </aside>
      </header>

      <div className={styles.managerPlayerSnapshotLenses}>
        {lenses.map((lens, index) => {
          const band = getDecisionProfileBand(lens.value, locale)
          return (
            <article key={lens.id} data-level={band.level}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{lens.label}</strong><small>{lens.meta}</small></div></header>
              <div><strong>{formatComparisonValue(lens.value)}<small>/100</small></strong><b>{band.label}</b></div>
              <i aria-hidden="true"><em style={{ width: `${Math.max(3, Math.min(100, lens.value))}%` }} /><span /></i>
              <footer>{copy.snapshotScale}</footer>
            </article>
          )
        })}
      </div>

      <footer className={styles.managerPlayerSnapshotFooter}>
        <article>
          <span>{copy.snapshotBestUse}</span>
          {primaryUse ? (
            <div>
              <HeroIcon hero={primaryUse.hero} role={player.role} locale={locale} />
              <strong>{formatOwHeroName(primaryUse.hero, locale)}<small>{getMapTypeLabel(primaryUse.mapType, locale)}</small></strong>
              <p><b>{primaryUse.retentionPct}%</b> {t.contextRetention}<br /><b>{primaryUse.confidencePct}%</b> {t.contextConfidence}</p>
            </div>
          ) : <p>{copy.snapshotNoUse}</p>}
        </article>
        <article>
          <span>{copy.snapshotFirstCheck}</span>
          <p>{firstCheck}</p>
        </article>
      </footer>
    </section>
  )
}

function ManagerPlayerPeerContext({ player, peers = [], locale, activeScenario, comparisonHref, getPlayerHref }) {
  if (!peers.length) return null

  const t = getCopy(locale)
  const copy = getManagerDossierCopy(locale)
  const scenarioCopy = getRecruitmentScenarioCopy(activeScenario, locale)
  const group = [player, ...peers]
  const metrics = getManagerComparisonMetrics(t, activeScenario).filter(metric => metric.id !== 'evidence')
  const rows = metrics.map(metric => {
    const playerValue = Number(metric.value(player))
    const peerValues = peers.map(peer => Number(metric.value(peer))).filter(Number.isFinite)
    if (!Number.isFinite(playerValue) || !peerValues.length) return null
    const peerAverage = Number((peerValues.reduce((sum, value) => sum + value, 0) / peerValues.length).toFixed(1))
    return {
      ...metric,
      playerValue,
      peerAverage,
      delta: Number((playerValue - peerAverage).toFixed(1))
    }
  }).filter(Boolean)
  if (!rows.length) return null

  const strongest = [...rows].sort((a, b) => b.delta - a.delta)[0]
  const watch = [...rows].sort((a, b) => a.delta - b.delta).find(row => row.id !== strongest.id) || strongest
  const fitRank = [...group]
    .sort((a, b) => getComparisonFitScore(b, activeScenario) - getComparisonFitScore(a, activeScenario))
    .findIndex(candidate => candidate.playerId === player.playerId) + 1
  const highlights = [
    { id: 'edge', metric: strongest, label: copy.peerEdge(strongest.delta) },
    { id: 'watch', metric: watch, label: copy.peerWatch(watch.delta) }
  ]

  return (
    <section className={styles.managerPlayerPeerContext} style={{ '--slot-color': SUBROLE_COLORS[player.subrole] }} aria-labelledby="manager-player-peer-context-title">
      <header className={styles.managerPlayerPeerHeader}>
        <div>
          <span>{copy.peerEyebrow}</span>
          <h3 id="manager-player-peer-context-title">{copy.peerTitle(group.length)}</h3>
          <p>{copy.peerMeta(peers.length)}</p>
          <div className={styles.managerPlayerPeerCandidates}>
            <span>{copy.peerAgainst}</span>
            <nav>
              {peers.map(peer => (
                <Link
                  key={peer.playerId}
                  to={getPlayerHref(peer.playerId)}
                  state={{ returnTo: comparisonHref }}
                  onPointerEnter={() => preloadScoutingPlayer(peer.playerId)}
                  onFocus={() => preloadScoutingPlayer(peer.playerId)}
                >
                  <b>{peer.identity.displayName}</b>
                  <small>{formatComparisonValue(getComparisonFitScore(peer, activeScenario))} FIT</small>
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <aside>
          <span>{copy.peerRank}</span>
          <strong>#{fitRank}<small>/ {group.length}</small></strong>
          <p>{scenarioCopy.label} · {formatComparisonValue(getComparisonFitScore(player, activeScenario))} FIT</p>
        </aside>
      </header>

      <div className={styles.managerPlayerPeerHighlights}>
        {highlights.map(item => {
          const direction = item.metric.delta > 0.5 ? 'ahead' : item.metric.delta < -0.5 ? 'behind' : 'even'
          return (
            <article key={item.id} data-direction={direction}>
              <span>{item.label}</span>
              <strong>{item.metric.label}</strong>
              <div>
                <b>{formatComparisonValue(item.metric.playerValue)}<small>{copy.peerPlayer}</small></b>
                <i aria-hidden="true">→</i>
                <b>{formatComparisonValue(item.metric.peerAverage)}<small>{copy.peerAverage}</small></b>
              </div>
              <p>{copy.peerDelta(item.metric.delta)}</p>
            </article>
          )
        })}
      </div>

      <div className={styles.managerPlayerPeerMetrics}>
        <header><span>{copy.peerLegend}</span></header>
        {rows.map(row => {
          const direction = row.delta > 0.5 ? 'ahead' : row.delta < -0.5 ? 'behind' : 'even'
          return (
            <div key={row.id} className={styles.managerPlayerPeerMetricRow} data-direction={direction}>
              <span><strong>{row.label}</strong><small>{copy.peerPlayer} {formatComparisonValue(row.playerValue)} · {copy.peerAverage} {formatComparisonValue(row.peerAverage)}</small></span>
              <div className={styles.managerPlayerPeerRail} aria-label={`${row.label}: ${copy.peerDelta(row.delta)}`}>
                <i style={{ width: `${Math.max(2, Math.min(100, row.playerValue))}%` }} />
                <em style={{ left: `${Math.max(0, Math.min(100, row.peerAverage))}%` }} />
              </div>
              <b>{formatSignedNumber(row.delta)}</b>
            </div>
          )
        })}
      </div>

      <footer>
        <p>{copy.peerBoundary}</p>
        <Link to={comparisonHref}>{copy.peerReturn}<b aria-hidden="true">↗</b></Link>
      </footer>
    </section>
  )
}

function getTrialVerificationQuestions(player, decision, locale) {
  const primaryUse = player.performanceSignals.opponentStrength?.deploymentPlaybook?.recommendations?.primaryUse
  const useLabel = primaryUse
    ? `${formatOwHeroName(primaryUse.hero, locale)} × ${getMapTypeLabel(primaryUse.mapType, locale)}`
    : getSubroleLabel(player.subrole, locale)
  const fallbacks = locale === 'en-US'
    ? [
        `Does the recorded ${useLabel} strength transfer when the opponent changes the pace or composition?`,
        'Can the player preserve the same role output on an alternate hero or map type?',
        'Under pressure, are positioning, cooldown decisions and communication repeatable rather than isolated highlights?'
      ]
    : locale === 'ko-KR'
      ? [
          `상대가 템포나 조합을 바꿨을 때도 기록된 ${useLabel} 강점이 전환됩니까?`,
          '대체 영웅 또는 다른 전장 유형에서도 같은 역할 산출을 유지할 수 있습니까?',
          '압박 상황의 위치 선정, 쿨다운 판단과 소통이 일회성 장면이 아니라 반복 가능합니까?'
        ]
      : [
          `对手改变节奏或阵容后，已记录的 ${useLabel} 优势能否迁移？`,
          '切换替代英雄或地图类型后，能否保持相同职责产出？',
          '高压情境中的站位、技能决策与沟通是否可重复，而非少数高光？'
        ]
  return [...(decision?.verificationQuestions || []), ...fallbacks].filter(Boolean).slice(0, 3)
}

function ManagerTrialCard({ player, locale, activeScenario, decision, onPrintTrial }) {
  const t = getCopy(locale)
  const copy = getManagerDossierCopy(locale)
  const scenarioCopy = getRecruitmentScenarioCopy(activeScenario, locale)
  const fit = getScenarioFit(player, activeScenario) || getScenarioFit(player, 'BALANCED')
  const primaryUse = player.performanceSignals.opponentStrength?.deploymentPlaybook?.recommendations?.primaryUse
  const reasons = (decision?.reasons || []).slice(0, 2)
  const watchpoints = (decision?.watchpoints || []).slice(0, 2)
  const questions = getTrialVerificationQuestions(player, decision, locale)

  return (
    <section className={styles.managerTrialCard} style={{ '--slot-color': SUBROLE_COLORS[player.subrole] }} aria-labelledby="manager-trial-card-title">
      <header>
        <div>
          <span>{copy.trialEyebrow}</span>
          <h3 id="manager-trial-card-title">{copy.trialTitle(player.identity.displayName)}</h3>
          <p>{copy.trialMeta}</p>
        </div>
        <button type="button" onClick={onPrintTrial}>{copy.printTrial}</button>
      </header>
      <div className={styles.managerTrialGrid}>
        <article className={styles.managerTrialUse}>
          <span>01 · {copy.trialRecommendedRole}</span>
          <strong>{getSubroleLabel(player.subrole, locale)} · {scenarioCopy.label}</strong>
          {primaryUse ? (
            <div><HeroIcon hero={primaryUse.hero} role={player.role} locale={locale} /><p><b>{formatOwHeroName(primaryUse.hero, locale)}</b><small>{getMapTypeLabel(primaryUse.mapType, locale)} · {primaryUse.retentionPct}% {t.contextRetention} · {primaryUse.confidencePct}% {t.contextConfidence}</small></p></div>
          ) : <p>{copy.snapshotNoUse}</p>}
          <footer><span>{t.shortlistRank} <b>#{fit?.shortlistRank ?? player.highSampleSubroleRank}/{fit?.shortlistTotal ?? 5}</b></span><span>{t.poolRank} <b>#{fit?.rank ?? player.highSampleSubroleRank}/{fit?.total ?? player.highSampleSubroleTotal}</b></span></footer>
        </article>
        <article>
          <span>02 · {copy.trialStrengths}</span>
          <ol>{reasons.map((reason, index) => <li key={`${index}-${reason}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{reason}</p></li>)}</ol>
        </article>
        <article>
          <span>03 · {copy.trialRisks}</span>
          <ol>{watchpoints.map((item, index) => <li key={`${index}-${item}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p></li>)}</ol>
        </article>
        <article className={styles.managerTrialQuestions}>
          <span>04 · {copy.trialQuestions}</span>
          <ol>{questions.map((question, index) => <li key={`${index}-${question}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{question}</p></li>)}</ol>
        </article>
        <article className={styles.managerTrialPass}>
          <span>05 · {copy.trialPass}</span>
          <ol>{copy.trialPassCriteria.map((criterion, index) => <li key={`${index}-${criterion}`}><b>{String(index + 1).padStart(2, '0')}</b><p>{criterion}</p></li>)}</ol>
        </article>
      </div>
      <footer><span>{copy.trialHumanEvidence}</span><p>{copy.trialHumanEvidenceMeta}</p></footer>
    </section>
  )
}

function ManagerPlayerAnalysis({ player, locale, activeScenario, decision, coachHref, comparisonPeers, comparisonHref, getPlayerHref, onPrint, onPrintTrial }) {
  const t = getCopy(locale)
  const copy = getManagerDossierCopy(locale)
  const fit = getScenarioFit(player, activeScenario) || getScenarioFit(player, 'BALANCED')

  return (
    <section id="summary" className={`${styles.playerAnalysis} ${styles.managerPlayerAnalysis}`}>
      <div className={styles.analysisHeader}>
        <div>
          <span>{copy.eyebrow} · {getCandidateStatusLabel(player, locale)}</span>
          <h2>{player.identity.displayName}</h2>
          <p>
            {getSubroleLabel(player.subrole, locale)} · {player.identity.teamShort} · {getPlacementLabel(player.teamPlacement, locale)} · {t.subroleFit} {player.subroleProfile.primarySharePct}%
            {player.subroleProfile.secondary ? ` / ${getSubroleLabel(player.subroleProfile.secondary, locale)} ${player.subroleProfile.secondarySharePct}%` : ''}
          </p>
          <div className={styles.identityMetadata}>
            <p className={styles.battleTag}><b>{t.battleTag}</b> · {player.identity.battleTag || '—'}</p>
            <p><b>{t.nationality}</b> · {getNationalityLabel(player.identity.nationality, locale)}</p>
          </div>
        </div>
        <div className={styles.analysisScore}>
          <strong>{fit?.score ?? '—'}</strong><small>FIT</small>
          <em>{t.poolRank} #{fit?.rank ?? player.highSampleSubroleRank}/{fit?.total ?? player.highSampleSubroleTotal}</em>
          <span>{t.shortlistRank} #{fit?.shortlistRank ?? player.highSampleSubroleRank}/{fit?.shortlistTotal ?? 5} · {t.publicTier}：{getCandidateStatusLabel(player, locale)}</span>
        </div>
        <button type="button" className={styles.printButton} onClick={onPrint}>{t.printPdf}</button>
      </div>

      <ManagerPlayerSnapshot player={player} locale={locale} activeScenario={activeScenario} decision={decision} />
      <ManagerTrialCard player={player} locale={locale} activeScenario={activeScenario} decision={decision} onPrintTrial={onPrintTrial} />

      <details className={styles.managerDeepDive}>
        <summary><span><strong>{copy.deepDive}</strong><small>{copy.deepDiveMeta}</small></span><b aria-hidden="true">＋</b></summary>
        <div>
          <ManagerPlayerPeerContext
            player={player}
            peers={comparisonPeers}
            locale={locale}
            activeScenario={activeScenario}
            comparisonHref={comparisonHref}
            getPlayerHref={getPlayerHref}
          />
          <ManagerDecisionProfile player={player} locale={locale} coachHref={coachHref} />
          <ManagerProfessionalReference player={player} locale={locale} decision={decision} coachHref={coachHref} />
          <section className={styles.managerScenarioSummary}>
            <header><div><span>SELECTION LENS</span><h3>{copy.scenarioTitle}</h3></div><p>{copy.scenarioMeta}</p></header>
            <div>
              {RECRUITMENT_SCENARIO_ORDER.map(item => {
                const scenarioCopy = getRecruitmentScenarioCopy(item, locale)
                const scenarioFit = getScenarioFit(player, item)
                return (
                  <article key={item} data-active={activeScenario === item ? 'true' : 'false'}>
                    <span>{scenarioCopy.label}</span>
                    <strong>{scenarioFit?.score ?? '—'}<small>FIT</small></strong>
                    <p>{t.poolRank} #{scenarioFit?.rank ?? '—'}/{scenarioFit?.total ?? '—'}</p>
                  </article>
                )
              })}
            </div>
          </section>
          <DecisionEvidenceLocator player={player} locale={locale} coachHref={coachHref} />
        </div>
      </details>

      <Link className={styles.managerCoachLink} to={coachHref('summary')}>
        <span><strong>{copy.openCoach}</strong><small>{copy.openCoachMeta}</small></span><b>↗</b>
      </Link>
      <p className={styles.managerBoundary}>{copy.boundary}</p>
    </section>
  )
}

function PlayerDecisionTrail({ player, locale }) {
  const t = getCopy(locale)
  const badges = getDecisionTrailBadges(locale)
  const opponent = player.performanceSignals.opponentStrength || {}
  const sensitivity = player.selection.preferenceSensitivity || {}
  const robustness = player.selection.robustness || {}
  const stressScores = [
    robustness.removeWeakestOpponent?.score,
    robustness.leaveOneMatchOut?.score
  ].map(Number).filter(Number.isFinite)
  const stressScore = stressScores.length ? Math.min(...stressScores) : player.selection.score
  const interval = opponent.performanceEnvelope
  const factorCount = Object.keys(player.selection.factors || {}).length
  const rawPercentile = Number(opponent.rawPercentile) || 0
  const adjustedPercentile = Number(opponent.adjustedPercentile) || 0
  const percentileDelta = adjustedPercentile - rawPercentile
  const stageCopy = locale === 'en-US'
    ? {
        weighted: `${factorCount} position-weighted factors`,
        neutral: `${player.selection.subroleConfidencePct || 0}% evidence · pulled toward neutral 50`,
        pressure: `${t.rankDrop} ${robustness.worstRankDrop || 0} · ${t.topOneProbability} ${sensitivity.rankProbability?.top1Pct ?? sensitivity.leaderPct ?? '—'}%`
      }
    : locale === 'ko-KR'
      ? {
          weighted: `포지션별 가중 요인 ${factorCount}개`,
          neutral: `근거 ${player.selection.subroleConfidencePct || 0}% · 중립값 50 방향 축소`,
          pressure: `${t.rankDrop} ${robustness.worstRankDrop || 0} · ${t.topOneProbability} ${sensitivity.rankProbability?.top1Pct ?? sensitivity.leaderPct ?? '—'}%`
        }
      : {
          weighted: `${factorCount} 个细分位置加权因子`,
          neutral: `${player.selection.subroleConfidencePct || 0}% 证据 · 向中性值 50 收缩`,
          pressure: `${t.rankDrop} ${robustness.worstRankDrop || 0} · ${t.topOneProbability} ${sensitivity.rankProbability?.top1Pct ?? sensitivity.leaderPct ?? '—'}%`
        }
  const steps = [
    {
      label: t.rawSignal,
      from: formatPercentileShort(opponent.rawPercentile, locale),
      to: formatPercentileShort(opponent.adjustedPercentile, locale),
      badge: `${percentileDelta >= 0 ? '+' : ''}${percentileDelta}P`,
      meta: `${opponent.rawScore ?? '—'} RAW → ${opponent.adjustedScore ?? '—'} ADJ · ${formatSignedNumber(opponent.adjustment)}`
    },
    {
      label: t.adjustedSignal,
      from: `${factorCount}`,
      fromUnit: 'FACTORS',
      to: `${player.selection.rawScore}`,
      badge: badges.raw,
      meta: stageCopy.weighted
    },
    {
      label: t.evidenceShrinkage,
      from: `${player.selection.rawScore}`,
      to: `${player.selection.score}`,
      badge: badges.shrunk,
      meta: stageCopy.neutral
    },
    {
      label: t.stressFloor,
      from: `${player.selection.score}`,
      to: `${stressScore}`,
      badge: badges.stress,
      meta: stageCopy.pressure
    }
  ]

  return (
    <section className={styles.decisionTrail} aria-labelledby="decision-trail-title">
      <header>
        <div><span>DECISION EVIDENCE · SELECTION V2.7</span><h3 id="decision-trail-title">{t.decisionTrail}</h3></div>
        <p>{t.decisionTrailMeta}</p>
      </header>
      <div className={styles.decisionTrailSteps}>
        {steps.map((step, index) => (
          <article key={step.label}>
            <div className={styles.decisionTrailIndex}><span>{String(index + 1).padStart(2, '0')}</span><b>{step.badge}</b></div>
            <small>{step.label}</small>
            <div className={styles.decisionTrailTransform}>
              <strong>{step.from}<small>{step.fromUnit || ''}</small></strong>
              <i aria-hidden="true">→</i>
              <strong>{step.to}</strong>
            </div>
            <p>{step.meta}</p>
          </article>
        ))}
      </div>
      <footer>
        <span>{interval?.intervalMethod === 'MATCH_CLUSTERED' ? 'MATCH-CLUSTERED 90%' : '90% MODEL RANGE'} · {interval?.rangeLow90 ?? '—'}–{interval?.rangeHigh90 ?? '—'} · {interval?.effectiveMatches ?? player.matchCount} {t.matches}</span>
        <p>{t.decisionTrailCaution}</p>
      </footer>
    </section>
  )
}

function getResultLabel(result, t) {
  if (result === 'win') return t.win
  if (result === 'loss') return t.loss
  if (result === 'draw') return t.draw
  return t.unknown
}

function DeploymentTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  const t = getCopy(locale)
  return (
    <div className={styles.chartTooltip}>
      <span>{row.name}</span>
      <b>{getDeploymentModeLabel(row.mode, locale)}</b>
      <small>{t.baselineReliability} {row.baselineReliability} · {t.pressureReadiness} {row.pressureReadiness} · {t.contextPortability} {row.contextPortability}</small>
    </div>
  )
}

function SelectionFramework({ model, locale, id }) {
  const t = getCopy(locale)

  return (
    <section id={id} className={`${styles.selectionFramework} ${id ? styles.anchorSection : ''}`}>
      <div className={styles.sectionHeading}>
        <div><span>05 · MODEL STRUCTURE</span><h2>{t.slotPlan}</h2><p>{t.slotPlanMeta}</p></div>
      </div>
      <div className={styles.slotPlanGrid}>
        {SUBROLE_ORDER.map((subrole, index) => {
          const qualifiedCount = model.qualifiedPool.filter(player => player.subrole === subrole).length
          const selectedCount = model.players.filter(player => player.subrole === subrole).length
          return (
            <article key={subrole} style={{ '--slot-color': SUBROLE_COLORS[subrole] }}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{getSubroleLabel(subrole, locale)}</strong>
              <p>{selectedCount} {t.slots} · {qualifiedCount} {t.qualifiedCandidates}</p>
            </article>
          )
        })}
      </div>
      <div className={styles.selectionFormula}>
        <span>{t.selectionModel}</span>
        <p>{t.selectionModelMeta}</p>
      </div>
    </section>
  )
}

function averageSignal(values) {
  if (!values.length) return 0
  return Number((values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length).toFixed(1))
}

function getScenarioRolePlayers(model, subrole, scenario) {
  return model.players
    .filter(player => player.subrole === subrole)
    .sort((a, b) => (
      (getScenarioFit(a, scenario)?.rank || 99) - (getScenarioFit(b, scenario)?.rank || 99) ||
      b.selection.score - a.selection.score
    ))
}

function getMarketStructure(players, scenario) {
  const fitScores = players.map(player => Number(getScenarioFit(player, scenario)?.score) || 0)
  const topGap = Number(((fitScores[0] || 0) - (fitScores[1] || 0)).toFixed(1))
  const topThreeSpread = Number(((fitScores[0] || 0) - (fitScores[2] || 0)).toFixed(1))
  const coreGap = Number(((fitScores[2] || 0) - (fitScores[3] || 0)).toFixed(1))
  const status = topGap >= 6
    ? 'CLEAR_LEADER'
    : topThreeSpread <= 4 ? 'OPEN_RACE' : coreGap >= 6 ? 'TIER_BREAK' : 'COMPETITIVE'
  return { status, topGap, topThreeSpread, coreGap }
}

function getMarketStructureLabel(status, t) {
  if (status === 'CLEAR_LEADER') return t.marketClearLeader
  if (status === 'OPEN_RACE') return t.marketOpenRace
  if (status === 'TIER_BREAK') return t.marketTierBreak
  return t.marketCompetitive
}

function getMarketDecisionLabel(structure, confidence, t) {
  if (confidence?.status === 'SENSITIVE') return t.marketFitLeadReview
  if (structure.status === 'CLEAR_LEADER') {
    if (confidence?.rangesOverlap === true) return t.marketFitLeadOverlap
    if (confidence?.status === 'CLEAR') return t.marketFitLeadSupported
  }
  return getMarketStructureLabel(structure.status, t)
}

function getValidationSummary(locale) {
  if (locale === 'en-US') return {
    temporal: 'Time-split Top-3 retention',
    pairwise: 'Pairwise direction agreement',
    belowGate: 'Below gate',
    singleGatePassed: 'Single gate passed',
    gateLabel: 'Gate',
    boundary: 'Independent validation · does not change candidate order'
  }
  if (locale === 'ko-KR') return {
    temporal: '시간 분할 Top 3 유지율',
    pairwise: '쌍대 방향 일치율',
    belowGate: '기준 미달',
    singleGatePassed: '단일 기준 통과',
    gateLabel: '기준',
    boundary: '독립 검증 · 후보 순위 미반영'
  }
  return {
    temporal: '时间切分 Top 3 保留率',
    pairwise: '两两方向一致度',
    belowGate: '未达门槛',
    singleGatePassed: '单项达标',
    gateLabel: '门槛',
    boundary: '独立验证 · 不参与候选顺位'
  }
}

function getRobustnessLabel(status, t) {
  if (status === 'SENSITIVE') return t.stressSensitive
  if (status === 'FRAGILE') return t.stressFragile
  return t.stressStable
}

function ExecutiveCommandView({ model, locale, audience = 'manager', scenario, onScenarioChange, activeSubrole, onRoleChange, getPlayerHref, returnTo }) {
  const t = getCopy(locale)
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const validationCopy = getValidationSummary(locale)
  const temporalValue = model.validationAudit?.temporal?.averageTopThreeRetentionPct
  const pairwiseValue = model.validationAudit?.pairwise?.concordancePct
  const temporalTarget = model.validationAudit?.promotionGate?.temporalTopThreeRetentionTargetPct ?? 80
  const pairwiseTarget = model.validationAudit?.promotionGate?.pairwiseConcordanceTargetPct ?? 70
  const temporalPassed = Number.isFinite(Number(temporalValue)) && Number(temporalValue) >= temporalTarget
  const pairwisePassed = Number.isFinite(Number(pairwiseValue)) && Number(pairwiseValue) >= pairwiseTarget
  const markets = SUBROLE_ORDER.map(subrole => {
    const players = getScenarioRolePlayers(model, subrole, scenario)
    return {
      subrole,
      players,
      structure: getMarketStructure(players, scenario),
      confidence: getComparisonDecisionConfidence(players, scenario, model.pairwiseBootstrap)
    }
  })

  return (
    <section className={styles.executiveCommand} aria-labelledby="executive-command-title">
      <div className={styles.commandHeader}>
        <div>
          <span>00 · POSITION SCOUTING OVERVIEW</span>
          <h2 id="executive-command-title">{t.commandTitle}</h2>
          <p>{t.commandMeta}</p>
        </div>
        <div className={styles.commandScenarioLabel}>
          <small>{t.commandLineup}</small>
          <strong>{scenarioCopy.label}</strong>
          <span>{scenarioCopy.meta}</span>
        </div>
      </div>

      <div className={styles.commandScenarioSwitch} aria-label={t.recruitmentScenarioBoard}>
        {RECRUITMENT_SCENARIO_ORDER.map((item, index) => {
          const copy = getRecruitmentScenarioCopy(item, locale)
          return (
            <button
              key={item}
              type="button"
              aria-pressed={scenario === item}
              className={scenario === item ? styles.commandScenarioActive : ''}
              onClick={() => onScenarioChange(item)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{copy.label}</strong>
            </button>
          )
        })}
      </div>

      <div key={scenario} className={styles.marketGrid}>
        {markets.map(({ subrole, players, structure, confidence }, index) => {
          const leader = players[0]
          const runnerUp = players[1]
          if (!leader) return null
          const fit = getScenarioFit(leader, scenario)
          const primaryHero = leader.heroPool[0]?.hero || leader.summary.primaryHero
          const evidence = leader.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct || 0
          const robustness = leader.selection.robustness
          const isActive = activeSubrole === subrole
          return (
            <article
              key={subrole}
              className={`${styles.marketCard} ${isActive ? styles.marketCardActive : ''}`}
              style={{ '--slot-color': SUBROLE_COLORS[subrole] }}
              data-market-status={structure.status}
            >
              <button type="button" className={styles.marketCardMain} onClick={() => onRoleChange(subrole)} aria-pressed={isActive}>
                <header className={styles.marketCardHeader}>
                  <span>{String(index + 1).padStart(2, '0')} · {getSubroleLabel(subrole, locale)}</span>
                  <b>{getMarketDecisionLabel(structure, confidence, t)}</b>
                </header>
                <div className={styles.marketLeaderVisual}>
                  <HeroArtwork hero={primaryHero} role={leader.role} className={styles.marketHeroArtwork} loading="eager" />
                  <span><small>{t.marketLeader}</small><strong>{leader.identity.displayName}</strong><em>{leader.identity.teamShort}</em></span>
                  <b><strong>{fit?.score ?? '—'}</strong><small>FIT</small></b>
                </div>
                <div className={styles.marketHeadGap} data-density={audience}>
                  <span><small>{t.marketRunnerUp}</small><strong>{runnerUp?.identity.displayName || '—'}</strong></span>
                  <span><small>{t.marketTopGap}</small><strong>+{structure.topGap}</strong></span>
                  {audience === 'coach' ? <span><small>{t.marketTopThreeSpread}</small><strong>{structure.topThreeSpread}</strong></span> : null}
                  <span><small>{t.marketEvidence}</small><strong>{evidence}%</strong></span>
                </div>
                <div className={styles.marketCandidateBars} aria-label={`${getSubroleLabel(subrole, locale)} ${t.marketCandidateCount}`}>
                  {players.map((player, playerIndex) => {
                    const playerFit = getScenarioFit(player, scenario)?.score || 0
                    return (
                      <span key={player.playerId}>
                        <small>{playerIndex + 1}</small><b>{player.identity.displayName}</b>
                        <i><em style={{ width: `${Math.max(6, playerFit)}%` }} /></i><strong>{playerFit}</strong>
                      </span>
                    )
                  })}
                </div>
                <div className={styles.marketStress} data-density={audience} data-stress-status={robustness?.status || 'STABLE'}>
                  <span><small>{t.rankingStressTest}</small><strong>{getRobustnessLabel(robustness?.status, t)}</strong></span>
                  <span><small>{t.comparisonIntervalStatus}</small><strong>{confidence?.rangesOverlap === true ? t.comparisonIntervalOverlap : confidence?.rangesOverlap === false ? t.comparisonIntervalSeparated : '—'}</strong></span>
                  {audience === 'coach' ? <span><small>{t.removeWeakOpponent}</small><b>{(robustness?.removeWeakestOpponent?.rankDelta || 0) > 0 ? `−${robustness.removeWeakestOpponent.rankDelta}` : '±0'}</b></span> : null}
                  {audience === 'coach' ? <span><small>{t.leaveOneMatchOut}</small><b>{(robustness?.leaveOneMatchOut?.rankDelta || 0) > 0 ? `−${robustness.leaveOneMatchOut.rankDelta}` : '±0'}</b></span> : null}
                </div>
              </button>
              <footer className={styles.marketCardFooter}>
                <button type="button" onClick={() => onRoleChange(subrole)}>{isActive ? t.marketActive : t.marketOpenRole}<b aria-hidden="true">→</b></button>
                <Link
                  to={getPlayerHref(leader.playerId)}
                  state={{ returnTo }}
                  onPointerEnter={() => preloadScoutingPlayer(leader.playerId)}
                  onFocus={() => preloadScoutingPlayer(leader.playerId)}
                >{t.openDossier}<b aria-hidden="true">↗</b></Link>
              </footer>
            </article>
          )
        })}
      </div>

      <div className={styles.commandValidationStrip}>
        <span data-state={temporalPassed ? 'passed' : 'review'}><small>{validationCopy.temporal}</small><strong>{temporalValue ?? '—'}%</strong><em>{temporalPassed ? validationCopy.singleGatePassed : validationCopy.belowGate} · {validationCopy.gateLabel} {temporalTarget}%</em></span>
        <span data-state={pairwisePassed ? 'passed' : 'review'}><small>{validationCopy.pairwise}</small><strong>{pairwiseValue ?? '—'}%</strong><em>{pairwisePassed ? validationCopy.singleGatePassed : validationCopy.belowGate} · {validationCopy.gateLabel} {pairwiseTarget}%</em></span>
        <p>{validationCopy.boundary}</p>
      </div>
      <footer className={styles.commandCaution}><span>{scenarioCopy.formula}</span><p>{t.commandCaution}</p></footer>
    </section>
  )
}

function getRoleFocusRead(players, structure, scenario, locale) {
  const leader = players[0]
  const runnerUp = players[1]
  if (!leader) return ''
  const leaderScore = getScenarioFit(leader, scenario)?.score ?? '—'
  const leaderIds = new Set(RECRUITMENT_SCENARIO_ORDER.map(item => (
    [...players].sort((a, b) => (
      (getScenarioFit(a, item)?.rank || 99) - (getScenarioFit(b, item)?.rank || 99) ||
      (getScenarioFit(b, item)?.score || 0) - (getScenarioFit(a, item)?.score || 0)
    ))[0]?.playerId
  )).filter(Boolean))
  const fixedLeader = leaderIds.size <= 1

  if (locale === 'en-US') {
    return `${leader.identity.displayName} leads at ${leaderScore} FIT, ${structure.topGap} points ahead of ${runnerUp?.identity.displayName || 'the next candidate'}. ${fixedLeader ? 'The technical primary stays fixed across all four emphases.' : 'The technical primary changes with the selection emphasis.'}`
  }
  if (locale === 'ko-KR') {
    return `${leader.identity.displayName}이(가) ${leaderScore} FIT로 1순위이며 ${runnerUp?.identity.displayName || '다음 후보'}보다 ${structure.topGap}점 앞섭니다. ${fixedLeader ? '네 가지 평가 초점에서 기술 1순위가 유지됩니다.' : '평가 초점에 따라 기술 1순위가 바뀝니다.'}`
  }
  return `${leader.identity.displayName} 以 ${leaderScore} FIT 暂列首位，领先 ${runnerUp?.identity.displayName || '下一名候选'} ${structure.topGap} 分；${fixedLeader ? '四种用人侧重下技术首选均保持不变。' : '用人侧重变化时，技术首选也会切换。'}`
}

const ROLE_COACH_AXIS_ORDER = ['baselineReliability', 'pressureReadiness', 'contextPortability']

function getRoleCoachReadCopy(locale) {
  if (locale === 'en-US') return {
    summaryEyebrow: '30-SECOND POSITION READ',
    summaryTitle: 'Candidate priority and decision strength',
    summaryMeta: 'This summary explains the current FIT order and does not introduce an additional score.',
    primary: 'Advance first',
    parallel: 'Review in parallel',
    confidence: 'Decision strength',
    primaryMeta: (alternate, gap) => alternate ? `${gap} FIT ahead of ${alternate} under the current emphasis.` : 'Current technical primary.',
    parallelMeta: gap => gap == null ? 'Keep the nearest alternatives in the same review track.' : `Second and third are separated by ${gap} FIT; compare their usage paths, not just the rank.`,
    confidenceReads: {
      CLEAR: { label: 'Order supported', meta: 'FIT separation, evidence and ranking stability support the current primary.' },
      CLEAR_OVERLAP: { label: 'Lead, with overlap', meta: 'The FIT order is supported, while the top 90% performance ranges still overlap.' },
      CONDITIONAL: { label: 'Direction, not closure', meta: 'The lead is decision-relevant, but the alternative path should stay open for trials.' },
      SENSITIVE: { label: 'Order needs review', meta: 'Evidence or ranking stability makes this a trial priority, not a final verdict.' }
    },
    metricEyebrow: 'THREE DECISION SIGNALS',
    metricTitle: 'Decision label and model definition',
    metricMeta: 'All three are 0–100 usage indices compared only with players in the same position. Higher is better; they are not cross-position ability scores.',
    axes: {
      baselineReliability: { plain: 'Everyday stability', technical: 'Baseline reliability', meta: 'Can the player preserve a usable competitive floor and deliver consistently from map to map?' },
      pressureReadiness: { plain: 'Strong-match retention', technical: 'Pressure readiness', meta: 'Does performance hold against stronger opponents and on the recorded playoff stage?' },
      contextPortability: { plain: 'Tactical range', technical: 'Context portability', meta: 'Do hero breadth, map coverage and map balance support more than one deployment context?' }
    },
    candidateUse: 'Best current use',
    candidateVerify: 'Verify first',
    uses: {
      CORE_READY: 'Advance as a regular core-rotation option.',
      RELIABLE_BASE: 'Use as a stable everyday rotation option.',
      PRESSURE_OPTION: 'Prioritise for strong-opponent or key-match tasks.',
      BALANCED: 'Keep in the balanced parallel-review group.',
      TARGETED_USE: 'Start with a defined hero or map assignment.'
    },
    verifies: {
      baselineReliability: 'Whether the competitive floor and map-to-map delivery hold.',
      pressureReadiness: 'Whether output holds against strong opponents and in playoffs.',
      contextPortability: 'Whether hero and map responsibilities transfer beyond recorded contexts.'
    }
  }
  if (locale === 'ko-KR') return {
    summaryEyebrow: '30초 포지션 결론',
    summaryTitle: '후보 추진 순서와 결론 강도',
    summaryMeta: '현재 FIT 순위를 설명하는 요약이며 추가 점수를 만들지 않습니다.',
    primary: '우선 추진',
    parallel: '병행 검토',
    confidence: '결론 강도',
    primaryMeta: (alternate, gap) => alternate ? `현재 평가 초점에서 ${alternate}보다 ${gap} FIT 앞섭니다.` : '현재 기술 1순위입니다.',
    parallelMeta: gap => gap == null ? '가장 가까운 대안을 같은 검토 트랙에 유지합니다.' : `2위와 3위 차이는 ${gap} FIT입니다. 순위뿐 아니라 기용 경로를 비교하세요.`,
    confidenceReads: {
      CLEAR: { label: '순위 근거 충분', meta: 'FIT 격차, 근거량과 순위 안정도가 현재 1순위를 지지합니다.' },
      CLEAR_OVERLAP: { label: '우위, 구간은 중첩', meta: 'FIT 순서는 지지되지만 상위 90% 경기력 구간은 여전히 중첩됩니다.' },
      CONDITIONAL: { label: '방향성 확인', meta: '의미 있는 우위는 있으나 테스트 단계에서 대안 경로를 함께 유지해야 합니다.' },
      SENSITIVE: { label: '순위 재검토 필요', meta: '근거량 또는 순위 안정도 때문에 최종 결론이 아닌 테스트 우선순위로 읽어야 합니다.' }
    },
    metricEyebrow: '세 가지 의사결정 지표',
    metricTitle: '의사결정 명칭과 모델 정의',
    metricMeta: '세 지표는 같은 포지션 안에서만 비교하는 0–100 기용 지수입니다. 높을수록 좋으며 포지션 간 능력 점수가 아닙니다.',
    axes: {
      baselineReliability: { plain: '일상 안정성', technical: '기준선 신뢰도', meta: '사용 가능한 경기 하한과 전장 간 안정적 수행을 유지할 수 있는지 봅니다.' },
      pressureReadiness: { plain: '강팀전 유지력', technical: '압박 준비도', meta: '강한 상대와 기록된 플레이오프 단계에서도 경기력이 유지되는지 봅니다.' },
      contextPortability: { plain: '전술 적응 범위', technical: '환경 전환성', meta: '영웅 폭, 전장 범위와 균형이 여러 기용 환경을 뒷받침하는지 봅니다.' }
    },
    candidateUse: '현재 추천 기용',
    candidateVerify: '우선 검증',
    uses: {
      CORE_READY: '정규 핵심 로테이션 후보로 우선 추진.',
      RELIABLE_BASE: '일상 경기의 안정적 로테이션 옵션으로 기용.',
      PRESSURE_OPTION: '강팀전 또는 중요 경기 과제로 우선 검증.',
      BALANCED: '균형형 병행 검토군에 유지.',
      TARGETED_USE: '특정 영웅 또는 전장 임무부터 시작.'
    },
    verifies: {
      baselineReliability: '경기 하한과 전장 간 수행이 계속 유지되는지.',
      pressureReadiness: '강팀전과 플레이오프에서도 출력이 유지되는지.',
      contextPortability: '영웅·전장 임무가 기록 밖 환경으로 전환되는지.'
    }
  }
  return {
    summaryEyebrow: '30 秒岗位结论',
    summaryTitle: '候选推进顺序与结论强度',
    summaryMeta: '本摘要解释当前 FIT 顺位，不构成新增评分。',
    primary: '优先推进',
    parallel: '并行考察',
    confidence: '结论强度',
    primaryMeta: (alternate, gap) => alternate ? `当前侧重下领先 ${alternate} ${gap} FIT。` : '当前技术首选。',
    parallelMeta: gap => gap == null ? '将最近的替代人选保留在同一考察路径。' : `第二与第三相差 ${gap} FIT；应比较使用路径，不只比较名次。`,
    confidenceReads: {
      CLEAR: { label: '顺位证据支持', meta: 'FIT 差距、证据量与顺位稳定度共同支持当前首选。' },
      CLEAR_OVERLAP: { label: '首位领先，区间重叠', meta: 'FIT 顺位得到支持，但头部 90% 表现区间仍有重叠。' },
      CONDITIONAL: { label: '方向明确，尚未定案', meta: '领先具备决策意义，但试训时仍应保留替代路径。' },
      SENSITIVE: { label: '顺位需要复核', meta: '证据量或顺位稳定度不足，应把它当作试训优先级而非最终结论。' }
    },
    metricEyebrow: '三个决策指标',
    metricTitle: '决策名称与模型口径',
    metricMeta: '三项均为同位置内部比较的 0–100 使用指数，越高越好；不能跨位置比较，也不是单独的能力总分。',
    axes: {
      baselineReliability: { plain: '日常稳定性', technical: '基线可靠度', meta: '看选手能否守住可用的竞技下限，并在不同地图持续稳定兑现。' },
      pressureReadiness: { plain: '强局保持', technical: '高压准备度', meta: '看面对更强对手和已记录的季后赛阶段时，表现能否保持。' },
      contextPortability: { plain: '战术适配范围', technical: '环境迁移性', meta: '看英雄宽度、地图覆盖与地图均衡能否支持多种使用环境。' }
    },
    candidateUse: '当前适合',
    candidateVerify: '优先验证',
    uses: {
      CORE_READY: '按常规核心轮换候选优先推进。',
      RELIABLE_BASE: '承担日常比赛的稳定轮换。',
      PRESSURE_OPTION: '优先验证强敌或关键场次任务。',
      BALANCED: '保留在均衡型并行考察组。',
      TARGETED_USE: '先从明确的英雄或地图任务使用。'
    },
    verifies: {
      baselineReliability: '竞技下限与地图间稳定性能否继续保持。',
      pressureReadiness: '面对强敌和季后赛时输出能否保持。',
      contextPortability: '英雄与地图职责能否迁移到已记录环境之外。'
    }
  }
}

function getRoleCoachConfidenceRead(confidence, copy) {
  if (confidence?.status === 'CLEAR' && confidence.rangesOverlap === true) return copy.confidenceReads.CLEAR_OVERLAP
  return copy.confidenceReads[confidence?.status] || copy.confidenceReads.CONDITIONAL
}

function getRoleCoachCandidateRead(profile, locale) {
  const copy = getRoleCoachReadCopy(locale)
  const axisScores = ROLE_COACH_AXIS_ORDER.map(axis => ({ axis, value: Number(profile?.[axis]) || 0 }))
  const weakestAxis = [...axisScores].sort((a, b) => a.value - b.value)[0]?.axis || 'baselineReliability'
  return {
    use: copy.uses[profile?.mode] || copy.uses.TARGETED_USE,
    verify: copy.verifies[weakestAxis]
  }
}

function RoleRecruitmentCockpit({ model, locale, audience = 'manager', scenario, subrole, onScenarioChange, onRoleChange, getPlayerHref, returnTo }) {
  const t = getCopy(locale)
  const coachCopy = getRoleCoachReadCopy(locale)
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const players = getScenarioRolePlayers(model, subrole, scenario)
  const leader = players[0]
  const runnerUp = players[1]
  const third = players[2]
  const structure = getMarketStructure(players, scenario)
  const confidence = getComparisonDecisionConfidence(players, scenario, model.pairwiseBootstrap)
  const leaderFit = getScenarioFit(leader, scenario)
  const runnerUpFit = getScenarioFit(runnerUp, scenario)
  const thirdFit = getScenarioFit(third, scenario)
  const parallelGap = runnerUp && third
    ? Number(((runnerUpFit?.score || 0) - (thirdFit?.score || 0)).toFixed(1))
    : null
  const confidenceRead = getRoleCoachConfidenceRead(confidence, coachCopy)
  const qualifiedCount = model.qualifiedPool.filter(player => player.subrole === subrole).length
  const primaryHero = leader?.heroPool[0]?.hero || leader?.summary?.primaryHero
  const evidence = leader?.performanceSignals?.opponentStrength?.evidenceQuality?.confidencePct || 0
  const evidenceGrade = leader?.performanceSignals?.opponentStrength?.evidenceQuality?.grade || '—'
  const pressure = leader?.performanceSignals?.opponentStrength?.pressureTest
  const context = leader?.performanceSignals?.opponentStrength?.heroLineupContext
  const coreCount = players.filter(player => {
    const profile = player.performanceSignals.deploymentProfile
    return profile?.baselineReliability >= 65 && profile?.pressureReadiness >= 65
  }).length

  if (!leader) return null

  const leadStats = audience === 'coach'
    ? [
        [t.marketTopGap, `+${structure.topGap}`],
        [t.marketTopThreeSpread, structure.topThreeSpread],
        [t.marketEvidence, `${evidence}%`],
        [t.deploymentCoreCount, coreCount],
        [t.heroLineupAdjusted, formatPercentileRead(leader.performanceSignals.opponentStrength?.adjustedPercentile, locale)],
        [t.contextCoverage, `${context?.coveragePct ?? '—'}%`]
      ]
    : [
        [t.marketTopGap, `+${structure.topGap}`],
        [t.strongOpponentTest, pressure?.percentile != null ? formatPercentileRead(pressure.percentile, locale) : '—'],
        [t.marketEvidence, `${evidence}% · ${evidenceGrade}`]
      ]

  return (
    <section id="role-cockpit" className={styles.roleCockpit} style={{ '--slot-color': SUBROLE_COLORS[subrole] }} aria-labelledby="role-cockpit-title" tabIndex={-1}>
      <header className={styles.roleCockpitHeader}>
        <div>
          <span>00 · {getSubroleLabel(subrole, 'en-US')} SCOUTING BRIEF</span>
          <h1 id="role-cockpit-title">{getSubroleLabel(subrole, locale)} · {t.roleCockpit}</h1>
          <p>{getRoleCockpitMeta(subrole, players.length, locale)}</p>
        </div>
        <div className={styles.roleCockpitRequirement}>
          <small>{t.commandLineup}</small><strong>{scenarioCopy.label}</strong><span>{scenarioCopy.meta}</span>
        </div>
      </header>

      <nav className={styles.roleCockpitRoleSwitch} aria-label={t.filterSubrole}>
        {SUBROLE_ORDER.map((item, index) => (
          <button key={item} type="button" aria-pressed={item === subrole} onClick={() => onRoleChange(item)}>
            <span>{String(index + 1).padStart(2, '0')}</span><SubroleButtonLabel subrole={item} locale={locale} />
          </button>
        ))}
      </nav>

      {audience === 'coach' ? (
        <section className={styles.roleCoachSummary} aria-labelledby="role-coach-summary-title">
          <header>
            <span>{coachCopy.summaryEyebrow}</span>
            <strong id="role-coach-summary-title">{coachCopy.summaryTitle}</strong>
            <p>{coachCopy.summaryMeta}</p>
          </header>
          <div>
            <article data-priority="primary">
              <small>{coachCopy.primary}</small>
              <strong>{leader.identity.displayName}</strong>
              <b>{leaderFit?.score ?? '—'} FIT</b>
              <p>{coachCopy.primaryMeta(runnerUp?.identity.displayName, structure.topGap)}</p>
            </article>
            <article>
              <small>{coachCopy.parallel}</small>
              <strong>{[runnerUp, third].filter(Boolean).map(player => player.identity.displayName).join(' · ') || '—'}</strong>
              <p>{coachCopy.parallelMeta(parallelGap)}</p>
            </article>
            <article data-status={confidence?.status || 'CONDITIONAL'}>
              <small>{coachCopy.confidence}</small>
              <strong>{confidenceRead.label}</strong>
              <p>{confidenceRead.meta}</p>
            </article>
          </div>
        </section>
      ) : null}

      <div className={styles.roleCockpitLeadGrid}>
        <article className={styles.roleCockpitLeader} data-market-status={structure.status}>
          <HeroArtwork hero={primaryHero} role={leader.role} className={styles.roleCockpitArtwork} loading="eager" />
          <div className={styles.roleCockpitLeaderIdentity}>
            <span>{t.marketVerdict} · {getMarketDecisionLabel(structure, confidence, t)}</span>
            <strong>{leader.identity.displayName}</strong>
            <small>{leader.identity.teamShort} · {t.shortlistRank} #{leaderFit?.shortlistRank ?? 1}/{leaderFit?.shortlistTotal ?? players.length} · {t.publicTier}：{getCandidateStatusLabel(leader, locale)} · {t.poolRank} #{leaderFit?.rank ?? leader.highSampleSubroleRank}/{leaderFit?.total ?? leader.highSampleSubroleTotal}</small>
          </div>
          <div className={styles.roleCockpitFit}><strong>{leaderFit?.score ?? '—'}</strong><span>{t.scenarioFitScore} · /100</span></div>
          <p>{getRoleFocusRead(players, structure, scenario, locale)}</p>
          <div className={styles.roleCockpitLeadStats} data-density={audience}>
            {leadStats.map(([label, value]) => <span key={label}><small>{label}</small><strong>{value}</strong></span>)}
          </div>
        </article>

        <aside className={styles.roleCockpitScenarios}>
          <header><span>{t.commandLineup}</span><strong>{scenarioCopy.label}</strong><p>{scenarioCopy.meta}</p></header>
          <div>
            {RECRUITMENT_SCENARIO_ORDER.map((item, index) => {
              const copy = getRecruitmentScenarioCopy(item, locale)
              return (
                <button key={item} type="button" aria-label={`${copy.label}: ${copy.meta}`} aria-pressed={scenario === item} onClick={() => onScenarioChange(item)}>
                  <span>{String(index + 1).padStart(2, '0')}</span><strong>{copy.label}</strong>
                </button>
              )
            })}
          </div>
          <footer><span>MODEL WEIGHTS</span><p>{scenarioCopy.formula}</p></footer>
        </aside>
      </div>

      {audience === 'coach' ? (
        <section className={styles.roleCoachMetricGuide} aria-labelledby="role-coach-metric-title">
          <header>
            <span>{coachCopy.metricEyebrow}</span>
            <strong id="role-coach-metric-title">{coachCopy.metricTitle}</strong>
            <p>{coachCopy.metricMeta}</p>
          </header>
          {ROLE_COACH_AXIS_ORDER.map(axis => {
            const axisCopy = coachCopy.axes[axis]
            return (
              <article key={axis}>
                <div><strong>{axisCopy.plain}</strong><small>{axisCopy.technical}</small></div>
                <p>{axisCopy.meta}</p>
              </article>
            )
          })}
        </section>
      ) : null}

      <div className={styles.roleCockpitCandidates} data-audience={audience}>
        <header><span>{t.candidateDecisionStack}</span><small>{players.length} {t.publishedCandidates} · {qualifiedCount} {t.qualifiedCandidates} · {scenarioCopy.label}</small></header>
        <p className={styles.roleCockpitRankGuide}>{t.rankScopeGuide}</p>
        <div>
          {players.map((player, index) => {
            const fit = getScenarioFit(player, scenario)
            const profile = player.performanceSignals.deploymentProfile
            const playerContext = player.performanceSignals.opponentStrength?.heroLineupContext
            const hero = player.heroPool[0]?.hero || player.summary.primaryHero
            const strength = player.strengths[0]
            const risk = player.risks[0]
            const coachRead = getRoleCoachCandidateRead(profile, locale)
            const gap = Math.max(0, Number(((leaderFit?.score || 0) - (fit?.score || 0)).toFixed(1)))
            return (
              <Link
                key={player.playerId}
                to={getPlayerHref(player.playerId)}
                state={{ returnTo }}
                onPointerEnter={() => preloadScoutingPlayer(player.playerId)}
                onFocus={() => preloadScoutingPlayer(player.playerId)}
              >
                <span className={styles.roleCockpitCandidateRank} title={t.shortlistRank}>{String(index + 1).padStart(2, '0')}</span>
                <HeroIcon hero={hero} role={player.role} locale={locale} />
                <div className={styles.roleCockpitCandidateIdentity}><strong>{player.identity.displayName}</strong><small title={`${t.publicTier}：${getCandidateStatusLabel(player, locale)}`}>{player.identity.teamShort} · {getCandidateStatusLabel(player, locale)}</small></div>
                <b className={styles.roleCockpitCandidateFit}>
                  <small>{audience === 'manager' ? t.scenarioFitScore : 'FIT'}</small>
                  {fit?.score ?? '—'}
                  {audience === 'manager' ? <em>{index === 0 ? t.marketMatrixLeader : `${t.marketMatrixGap} −${gap}`}</em> : null}
                </b>
                {audience === 'coach' ? (
                  <div className={styles.roleCockpitCandidateAxes}>
                    {ROLE_COACH_AXIS_ORDER.map(axis => {
                      const axisCopy = coachCopy.axes[axis]
                      const value = profile?.[axis] || 0
                      return <span key={axis}><small title={`${axisCopy.technical} · ${axisCopy.meta}`}>{axisCopy.plain}</small><i><em style={{ width: `${value}%` }} /></i><b>{value}</b></span>
                    })}
                  </div>
                ) : (
                  <div className={styles.roleCockpitCandidateRead}>
                    <span><small>{t.topStrength}</small><b>{strength ? `${getMetricLabel(strength.metricId, locale)} · ${formatPercentileShort(strength.percentile, locale)}` : '—'}</b></span>
                    <span><small>{t.watchpoint}</small><b>{risk ? `${getMetricLabel(risk.metricId, locale)} · ${formatPercentileShort(risk.percentile, locale)}` : '—'}</b></span>
                  </div>
                )}
                {audience === 'coach' ? (
                  <div className={styles.roleCockpitCandidateTranslation}>
                    <span><small>{coachCopy.candidateUse}</small><b>{coachRead.use}</b></span>
                    <span><small>{coachCopy.candidateVerify}</small><b>{coachRead.verify}</b></span>
                  </div>
                ) : null}
                {audience === 'coach' ? (
                  <footer><span>{t.heroLineupAdjusted} · {formatPercentileRead(player.performanceSignals.opponentStrength?.adjustedPercentile, locale)}</span><span>{t.contextCoverage} {playerContext?.coveragePct ?? '—'}%</span><b>{t.openFullDossier} ↗</b></footer>
                ) : <footer><span>{t.poolRank} #{fit?.rank ?? '—'}/{fit?.total ?? '—'}</span><b>{t.openFullDossier} ↗</b></footer>}
              </Link>
            )
          })}
        </div>
      </div>

      <footer className={styles.roleCockpitCaution}><span>SELECTION V2.7 · MODEL BOUNDARY</span><p>{t.roleFocusCaution}</p></footer>
    </section>
  )
}

function DeploymentMatrix({ model, locale, activeSubrole = 'ALL', id }) {
  const t = getCopy(locale)
  const rows = model.players.map(player => ({
    name: player.identity.displayName,
    team: player.identity.teamShort,
    subrole: player.subrole,
    ...player.performanceSignals.deploymentProfile
  }))
  const subroleData = subrole => rows.filter(player => player.subrole === subrole)
  const subroles = activeSubrole === 'ALL' ? SUBROLE_ORDER : [activeSubrole]

  return (
    <section id={id} className={`${styles.visualPanel} ${styles.deploymentMatrix} ${id ? styles.anchorSection : ''}`}>
      <div className={styles.sectionHeading}>
        <div><span>01 · POSITION DEPLOYMENT MAPS</span><h2>{t.deploymentMatrix}</h2><p>{t.deploymentMatrixMeta}</p></div>
        <div className={styles.deploymentReadKey}>
          <span>{t.pressureReadiness} ↑</span>
          <span>{t.baselineReliability} →</span>
          <span>{t.deploymentThreshold}</span>
        </div>
      </div>
      <div className={styles.deploymentMapsGrid} data-single={subroles.length === 1 ? 'true' : 'false'}>
        {subroles.map(subrole => {
          const players = subroleData(subrole)
          const portabilityRows = [...players].sort((a, b) => b.contextPortability - a.contextPortability)
          const balancedRows = [...players].sort((a, b) => (
            ((b.baselineReliability + b.pressureReadiness + b.contextPortability) / 3) -
            ((a.baselineReliability + a.pressureReadiness + a.contextPortability) / 3)
          ))
          const coreCount = players.filter(player => player.baselineReliability >= 65 && player.pressureReadiness >= 65).length
          const bestBalance = balancedRows[0]
          const portabilityLeader = portabilityRows[0]
          return (
            <article key={subrole} className={styles.deploymentRoleMap} style={{ '--slot-color': SUBROLE_COLORS[subrole] }}>
              <header>
                <div><span>{getSubroleLabel(subrole, locale)}</span><strong>{players.length} {t.deploymentCandidateCount}</strong></div>
                <small>{t.deploymentCoreCount} <b>{coreCount}</b></small>
              </header>
              <div className={styles.deploymentRoleBody}>
                <div>
                  <div className={styles.deploymentMiniChart} aria-label={`${getSubroleLabel(subrole, locale)} · ${t.deploymentMatrix}`}>
                    <div className={styles.matrixQuadrantLayer} aria-hidden="true">
                      <span>{t.quadrantPressure}</span>
                      <span>{t.quadrantCore}</span>
                      <span>{t.quadrantTargeted}</span>
                      <span>{t.quadrantReliable}</span>
                    </div>
                    <ResponsiveContainer className={styles.matrixChartSurface} width="100%" height="100%" minWidth={0} minHeight={230} initialDimension={{ width: 520, height: 270 }}>
                      <ScatterChart margin={{ top: 30, right: 22, bottom: 20, left: -8 }}>
                        <CartesianGrid stroke="rgba(255,255,255,.055)" strokeDasharray="3 6" />
                        <XAxis type="number" dataKey="baselineReliability" domain={[0, 100]} ticks={[0, 50, 65, 100]} tick={{ fill: 'rgba(255,255,255,.42)', fontSize: 8 }} name={t.baselineReliability} />
                        <YAxis type="number" dataKey="pressureReadiness" domain={[0, 100]} ticks={[0, 50, 65, 100]} tick={{ fill: 'rgba(255,255,255,.42)', fontSize: 8 }} name={t.pressureReadiness} />
                        <ReferenceLine x={65} stroke="rgba(244,195,32,.54)" strokeDasharray="4 5" />
                        <ReferenceLine y={65} stroke="rgba(244,195,32,.54)" strokeDasharray="4 5" />
                        <Tooltip content={<DeploymentTooltip locale={locale} />} cursor={{ stroke: 'rgba(244,195,32,.35)', strokeDasharray: '3 4' }} />
                        <Scatter data={players} fill={SUBROLE_COLORS[subrole]}>
                          <LabelList dataKey="name" position="top" fill="rgba(255,255,255,.86)" fontSize={9} fontWeight={900} />
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.deploymentMiniAxes}><span>{t.pressureReadiness} ↑</span><b>{t.baselineReliability} →</b></div>
                </div>
                <aside className={styles.deploymentPortability}>
                  <header><span>{t.deploymentPortabilityRanking}</span><small>{getPercentileScaleLabel(locale)}</small></header>
                  <div>
                    {portabilityRows.map((player, index) => (
                      <span key={player.name}>
                        <small>{index + 1}</small><b>{player.name}</b>
                        <i><em style={{ width: `${player.contextPortability}%` }} /></i>
                        <strong>{player.contextPortability}</strong>
                        <small>{getDeploymentModeLabel(player.mode, locale)}</small>
                      </span>
                    ))}
                  </div>
                </aside>
              </div>
              <footer>
                <span><small>{t.deploymentBestBalance}</small><strong>{bestBalance?.name || '—'}</strong></span>
                <span><small>{t.deploymentPortabilityLeader}</small><strong>{portabilityLeader?.name || '—'} · {portabilityLeader?.contextPortability ?? '—'}</strong></span>
              </footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function getScenarioFit(player, scenario) {
  return player?.performanceSignals?.recruitmentScenarios?.fits?.[scenario] || null
}

function MarketRankFlow({ model, locale, audience = 'manager', activeSubrole, activeScenario, getPlayerHref, returnTo, id }) {
  const t = getCopy(locale)
  const subroles = activeSubrole === 'ALL' ? SUBROLE_ORDER : [activeSubrole]
  const activeScenarioIndex = Math.max(0, RECRUITMENT_SCENARIO_ORDER.indexOf(activeScenario))

  return (
    <section id={id} className={`${styles.marketFlowSection} ${id ? styles.anchorSection : ''}`} aria-labelledby="market-flow-title">
      <div className={styles.sectionHeading}>
        <div><span>{audience === 'manager' ? '02 · RANK MOVEMENT' : '01 · SELECTION EMPHASIS MATRIX'}</span><h2 id="market-flow-title">{t.marketFlowTitle}</h2><p>{t.marketFlowMeta}</p></div>
      </div>
      <div className={styles.marketFlowGrid} data-single={subroles.length === 1 ? 'true' : 'false'}>
        {subroles.map(subrole => {
          const players = model.players
            .filter(player => player.subrole === subrole)
            .sort((a, b) => (
              (getScenarioFit(a, 'BALANCED')?.rank || 99) - (getScenarioFit(b, 'BALANCED')?.rank || 99) ||
              b.selection.score - a.selection.score
            ))
          const flows = players.map((player, index) => ({
            player,
            color: COMPARISON_PLAYER_COLORS[index % COMPARISON_PLAYER_COLORS.length],
            fits: RECRUITMENT_SCENARIO_ORDER.map(scenario => getScenarioFit(player, scenario))
          }))
          const managerFlows = [...flows].sort((a, b) => (
            (Number(a.fits[activeScenarioIndex]?.rank) || 99) - (Number(b.fits[activeScenarioIndex]?.rank) || 99)
          ))
          const scenarioLeaders = RECRUITMENT_SCENARIO_ORDER.map(scenario => ({
            scenario,
            player: [...players].sort((a, b) => (
              (getScenarioFit(a, scenario)?.rank || 99) - (getScenarioFit(b, scenario)?.rank || 99) ||
              (getScenarioFit(b, scenario)?.score || 0) - (getScenarioFit(a, scenario)?.score || 0)
            ))[0]
          }))
          const leaderIds = new Set(scenarioLeaders.map(item => item.player?.playerId).filter(Boolean))
          const leaderLocked = leaderIds.size <= 1
          const coverage = model.marketCoverage?.[subrole]
          const leaderGroups = scenarioLeaders.reduce((groups, item) => {
            if (!item.player) return groups
            const current = groups.get(item.player.playerId) || { player: item.player, scenarios: [] }
            current.scenarios.push(item.scenario)
            groups.set(item.player.playerId, current)
            return groups
          }, new Map())
          const groupText = [...leaderGroups.values()].map(group => (
            `${group.player.identity.displayName}（${group.scenarios.map(scenario => getRecruitmentScenarioCopy(scenario, locale).label).join(locale === 'en-US' ? ', ' : '、')}）`
          )).join(locale === 'en-US' ? '; ' : '；')
          const leaderSummary = locale === 'en-US'
            ? leaderLocked
              ? `Technical primary unchanged: ${scenarioLeaders[0]?.player?.identity.displayName || '—'} ranks first under all four emphases.`
              : `Selection emphasis changes the technical primary: ${groupText}.`
            : locale === 'ko-KR'
              ? leaderLocked
                ? `기술 1순위 유지: ${scenarioLeaders[0]?.player?.identity.displayName || '—'}이(가) 네 가지 평가 초점에서 모두 1위입니다.`
                : `평가 초점에 따라 기술 1순위가 바뀝니다: ${groupText}.`
              : leaderLocked
                ? `技术首选不变：${scenarioLeaders[0]?.player?.identity.displayName || '—'} 在四种用人侧重下均为完整池第 1。`
                : `用人侧重会改变技术首选：${groupText}。`

          return (
            <article key={subrole} className={styles.marketFlowCard} style={{ '--slot-color': SUBROLE_COLORS[subrole] }}>
              <header>
                <div><span>{getSubroleLabel(subrole, locale)}</span><strong>{leaderLocked ? t.marketFlowLocked : t.marketFlowOpen}</strong></div>
                <small data-complete={coverage?.complete ? 'true' : 'false'}>{t.marketFlowCoverage} · {coverage?.complete ? t.marketFlowComplete : t.marketFlowPartial}</small>
              </header>
              <div className={styles.marketMatrixReadout}>
                <strong>{leaderSummary}</strong>
                <span>{audience === 'manager' ? t.managerRankHowToRead : t.marketMatrixHowToRead}</span>
              </div>
              {audience === 'manager' ? (
                <div className={styles.managerScenarioBrief}>
                  <div className={styles.managerScenarioLeaders}>
                    {scenarioLeaders.map(({ scenario, player: scenarioLeader }) => {
                      const scenarioFit = getScenarioFit(scenarioLeader, scenario)
                      return (
                        <div key={scenario} data-active={activeScenario === scenario ? 'true' : 'false'}>
                          <span>{getRecruitmentScenarioShortLabel(scenario, locale)}</span>
                          <strong>{scenarioLeader?.identity.displayName || '—'}</strong>
                          <small>{scenarioFit?.score ?? '—'} FIT · #{scenarioFit?.rank ?? '—'}</small>
                        </div>
                      )
                    })}
                  </div>
                  <div className={styles.managerScenarioCandidates}>
                    {managerFlows.slice(0, 3).map(flow => {
                      const ranks = flow.fits.map(fit => Number(fit?.rank)).filter(Number.isFinite)
                      const minimumRank = ranks.length ? Math.min(...ranks) : 0
                      const maximumRank = ranks.length ? Math.max(...ranks) : 0
                      const activeFit = flow.fits[activeScenarioIndex]
                      return (
                        <Link
                          key={flow.player.playerId}
                          to={getPlayerHref(flow.player.playerId)}
                          state={{ returnTo }}
                          style={{ '--flow-color': flow.color }}
                          onPointerEnter={() => preloadScoutingPlayer(flow.player.playerId)}
                          onFocus={() => preloadScoutingPlayer(flow.player.playerId)}
                        >
                          <i />
                          <b>#{activeFit?.rank || '—'}</b>
                          <span><strong>{flow.player.identity.displayName}</strong><small>{flow.player.identity.teamShort} · #{minimumRank}{minimumRank !== maximumRank ? `–#${maximumRank}` : ' × 4'}</small></span>
                          <em>{activeFit?.score ?? '—'}<small>FIT</small></em>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className={styles.marketMatrixViewport}>
                <table className={styles.marketMatrix} aria-label={`${getSubroleLabel(subrole, locale)} · ${t.marketFlowTitle}`}>
                  <thead>
                    <tr>
                      <th scope="col">{t.marketMatrixCandidate}</th>
                      {RECRUITMENT_SCENARIO_ORDER.map((scenario, index) => (
                        <th key={scenario} scope="col" data-active={activeScenario === scenario ? 'true' : 'false'}>
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <strong>{getRecruitmentScenarioCopy(scenario, locale).label}</strong>
                          {activeScenario === scenario ? <small>{t.marketMatrixCurrent}</small> : null}
                        </th>
                      ))}
                      <th scope="col">{t.marketMatrixSensitivity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows.map(flow => {
                      const ranks = flow.fits.map(fit => Number(fit?.rank)).filter(Number.isFinite)
                      const minimumRank = ranks.length ? Math.min(...ranks) : 0
                      const maximumRank = ranks.length ? Math.max(...ranks) : 0
                      const movement = maximumRank - minimumRank
                      const sensitivityLabel = movement === 0 ? t.marketMatrixStable : movement === 1 ? t.marketMatrixMinor : t.marketMatrixSensitive
                      const balanced = getScenarioFit(flow.player, 'BALANCED')
                      return (
                        <tr key={flow.player.playerId}>
                          <th scope="row">
                            <Link
                              to={getPlayerHref(flow.player.playerId)}
                              state={{ returnTo }}
                              style={{ '--flow-color': flow.color }}
                              onPointerEnter={() => preloadScoutingPlayer(flow.player.playerId)}
                              onFocus={() => preloadScoutingPlayer(flow.player.playerId)}
                            >
                              <i /><span><b>{flow.player.identity.displayName}</b><small>{flow.player.identity.teamShort} · {t.poolRank} #{balanced?.rank}/{balanced?.total}</small></span>
                            </Link>
                          </th>
                          {flow.fits.map((fit, index) => {
                            const scenario = RECRUITMENT_SCENARIO_ORDER[index]
                            const scenarioLeader = scenarioLeaders[index]?.player
                            const leaderScore = getScenarioFit(scenarioLeader, scenario)?.score || fit?.score || 0
                            const gap = Number((leaderScore - (fit?.score || 0)).toFixed(1))
                            const isLeader = Number(fit?.rank) === 1
                            return (
                              <td key={scenario} data-leader={isLeader ? 'true' : 'false'} data-active={activeScenario === scenario ? 'true' : 'false'}>
                                <div className={styles.marketMatrixCell}>
                                  <span><b>#{fit?.rank || '—'}</b><small>/{fit?.total || '—'}</small></span>
                                  <strong>{fit?.score ?? '—'}<small>FIT</small></strong>
                                  <em>{isLeader ? t.marketMatrixLeader : `${t.marketMatrixGap} −${gap}`}</em>
                                  <i aria-hidden="true"><b style={{ width: `${Math.max(4, Math.min(100, fit?.score || 0))}%` }} /></i>
                                </div>
                              </td>
                            )
                          })}
                          <td className={styles.marketMatrixSensitivity} data-level={movement === 0 ? 'stable' : movement === 1 ? 'minor' : 'sensitive'}>
                            <b>{sensitivityLabel}</b>
                            <strong>{movement}</strong>
                            <small>{movement === 0 ? `#${minimumRank} × 4` : `#${minimumRank}–#${maximumRank}`}</small>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function RecruitmentScenarioBoard({ model, locale, scenario, subrole, onScenarioChange, getPlayerHref, returnTo, id }) {
  const t = getCopy(locale)
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const players = getScenarioRolePlayers(model, subrole, scenario)
  const leader = players[0]
  const structure = getMarketStructure(players, scenario)
  const averageEvidence = averageSignal(players.map(player => player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct || 0))
  const profileAverages = [
    [t.baselineReliability, averageSignal(players.map(player => player.performanceSignals.deploymentProfile?.baselineReliability || 0))],
    [t.pressureReadiness, averageSignal(players.map(player => player.performanceSignals.deploymentProfile?.pressureReadiness || 0))],
    [t.contextPortability, averageSignal(players.map(player => player.performanceSignals.deploymentProfile?.contextPortability || 0))]
  ]

  return (
    <section id={id} className={`${styles.scenarioBoard} ${id ? styles.anchorSection : ''}`} aria-labelledby="recruitment-scenario-title" style={{ '--slot-color': SUBROLE_COLORS[subrole] }}>
      <div className={styles.sectionHeading}>
        <div>
          <span>02 · ROLE REQUIREMENT FIT</span>
          <h2 id="recruitment-scenario-title">{getSubroleLabel(subrole, locale)} · {t.recruitmentScenarioBoard}</h2>
          <p>{t.recruitmentScenarioMeta}</p>
        </div>
      </div>

      <div className={styles.scenarioSwitch} aria-label={t.recruitmentScenarioBoard}>
        {RECRUITMENT_SCENARIO_ORDER.map(item => {
          const copy = getRecruitmentScenarioCopy(item, locale)
          return (
            <button key={item} type="button" aria-pressed={scenario === item} className={scenario === item ? styles.scenarioActive : ''} onClick={() => onScenarioChange(item)}>
              <span>{String(RECRUITMENT_SCENARIO_ORDER.indexOf(item) + 1).padStart(2, '0')}</span>
              <strong>{copy.label}</strong>
              <small>{copy.meta}</small>
            </button>
          )
        })}
      </div>

      <div className={styles.scenarioSummary}>
        <div><span>{t.scenarioAverageFit}</span><strong>{getScenarioFit(leader, scenario)?.score || '—'}</strong><small>FIT / 100</small></div>
        <div><span>{t.scenarioFloorFit}</span><strong>+{structure.topGap}</strong><small>{getMarketStructureLabel(structure.status, t)}</small></div>
        <div><span>{t.scenarioEvidence}</span><strong>{averageEvidence}%</strong><small>{t.evidenceConfidence}</small></div>
        <div><span>{t.scenarioRoleCoverage}</span><strong>{players.length}</strong><small>{t.scenarioWithinPool}</small></div>
      </div>

      <div className={`${styles.scenarioRoleGrid} ${styles.roleRequirementGrid}`}>
        {players.map((player, index) => {
          const fit = getScenarioFit(player, scenario)
          const robustness = player.selection.robustness
          return (
            <article key={player.playerId}>
              <header><span>{String(index + 1).padStart(2, '0')}</span><h3>{getCandidateStatusLabel(player, locale)}</h3></header>
              <Link
                className={styles.scenarioPrimary}
                to={getPlayerHref(player.playerId)}
                state={{ returnTo }}
                onPointerEnter={() => preloadScoutingPlayer(player.playerId)}
                onFocus={() => preloadScoutingPlayer(player.playerId)}
              >
                <small>{t.scenarioRank} · #{fit?.rank}/{fit?.total}</small>
                <div><strong>{player.identity.displayName}</strong><b>{fit?.score}<em>FIT</em></b></div>
                <p>{player.identity.teamShort} · {t.selectionScore} {player.selection.score} · {getDeploymentModeLabel(player.performanceSignals.deploymentProfile?.mode, locale)}</p>
                <div className={styles.scenarioMiniAxes}>
                  <span><small>{t.baselineReliability}</small><b>{player.performanceSignals.deploymentProfile?.baselineReliability}</b></span>
                  <span><small>{t.pressureReadiness}</small><b>{player.performanceSignals.deploymentProfile?.pressureReadiness}</b></span>
                  <span><small>{t.contextPortability}</small><b>{player.performanceSignals.deploymentProfile?.contextPortability}</b></span>
                </div>
                <div className={styles.roleStressRow} data-stress-status={robustness?.status || 'STABLE'}>
                  <span><small>{t.rankingStressTest}</small><b>{getRobustnessLabel(robustness?.status, t)}</b></span>
                  <span><small>RANK / MODEL</small><b>{robustness?.worstRankDrop ? `−${robustness.worstRankDrop}` : '±0'} / −{robustness?.worstScoreDrop || 0}</b></span>
                </div>
              </Link>
            </article>
          )
        })}
      </div>

      <div className={styles.scenarioFooter}>
        <div><span>{scenarioCopy.label}</span><strong>{scenarioCopy.formula}</strong></div>
        <p>{t.scenarioBoardCaution}</p>
      </div>
      <div className={styles.scenarioPortfolioAxes}>
        {profileAverages.map(([label, value]) => (
          <div key={label}><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value}</b></div>
        ))}
      </div>
    </section>
  )
}

function TrendTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <div className={styles.chartTooltip}>
      <span>{row.mapName}</span>
      <b>{formatOwHeroName(row.hero, locale)}</b>
      <small>{row.value.toLocaleString()}</small>
    </div>
  )
}

function DiagnosticCard({ eyebrow, value, meta, detail, tone = '' }) {
  return (
    <article className={`${styles.diagnosticCard} ${tone ? styles[`diagnostic${tone}`] : ''}`}>
      <span>{eyebrow}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
      <small>{detail}</small>
    </article>
  )
}

function getDecisionRead(player, locale) {
  const opponentStrength = player?.performanceSignals?.opponentStrength
  const envelope = opponentStrength?.performanceEnvelope
  const pressure = opponentStrength?.pressureTest
  const evidence = opponentStrength?.evidenceQuality
  const lossRetention = opponentStrength?.mapResultContext?.lossRetentionPct
  if (!envelope || !pressure || !evidence) return []

  const name = player.identity.displayName
  const floor = envelope.floorPercentile
  const typical = envelope.typicalPercentile
  const ceiling = envelope.ceilingPercentile
  const pressurePercentile = pressure.percentile
  const interval = `${envelope.rangeLow90}–${envelope.rangeHigh90}`

  if (locale === 'en-US') {
    const boundaryRead = floor >= 70
      ? `${name} carries a ${formatPercentileRead(floor, locale)} competitive floor and ${formatPercentileRead(typical, locale)} typical level in the qualified ${getSubroleLabel(player.subrole, locale)} pool, supporting a dependable baseline rather than a peak-only case.`
      : floor <= 35 && ceiling >= 65
        ? `${name} spans a ${formatPercentileRead(floor, locale)} floor to a ${formatPercentileRead(ceiling, locale)} ceiling. The upside is real, but the wide performance envelope favours map- and composition-specific deployment.`
        : `${name}'s adjusted profile sits at ${formatPercentileRead(typical, locale)} typically with a ${formatPercentileRead(ceiling, locale)} ceiling, placing the season sample in the ${typical >= 65 ? 'upper' : 'middle'} band of the subrole pool.`
    const pressureRead = pressurePercentile >= 70
      ? `Against strong-rated opponents, ${name} retains ${pressure.retentionPct}% of overall adjusted output and grades at ${formatPercentileRead(pressurePercentile, locale)}; pressure resistance is a positive part of the case.`
      : pressurePercentile <= 35
        ? `The strong-opponent test lands at ${formatPercentileRead(pressurePercentile, locale)} with ${pressure.retentionPct}% retention, making high-strength conversion the clearest pricing risk in the current sample.`
        : `Strong-opponent output retains ${pressure.retentionPct}% of the season level and grades at ${formatPercentileRead(pressurePercentile, locale)}, a broadly neutral-to-stable pressure result.`
    const evidenceRead = `Evidence grade ${evidence.grade} (${evidence.confidencePct}%) is supported by ${evidence.effectiveMaps} effective maps and ${evidence.effectiveOpponents} effective opponents; the adjusted mean has a 90% model interval of ${interval}${Number.isFinite(lossRetention) ? ` and ${lossRetention}% loss-map retention` : ''}.`
    return [boundaryRead, pressureRead, evidenceRead]
  }

  if (locale === 'ko-KR') {
    const boundaryRead = floor >= 70
      ? `${name}은(는) 동일 ${getSubroleLabel(player.subrole, locale)} 고표본 선수군에서 경기 하한 ${formatPercentileRead(floor, locale)}, 일반 수준 ${formatPercentileRead(typical, locale)}을 기록해 단순 고점형보다 안정적인 기준선을 보여줍니다.`
      : floor <= 35 && ceiling >= 65
        ? `${name}의 경기력 범위는 하한 ${formatPercentileRead(floor, locale)}에서 상한 ${formatPercentileRead(ceiling, locale)}까지입니다. 고점은 분명하지만 전장과 조합에 맞춘 기용이 더 적합합니다.`
        : `${name}의 보정된 일반 수준은 ${formatPercentileRead(typical, locale)}, 상한은 ${formatPercentileRead(ceiling, locale)}으로 세부 역할 선수군의 ${typical >= 65 ? '상위' : '중간'} 구간에 위치합니다.`
    const pressureRead = pressurePercentile >= 70
      ? `강팀 상대에서도 전체 보정 경기력의 ${pressure.retentionPct}%를 유지하며 ${formatPercentileRead(pressurePercentile, locale)}을 기록해 압박 환경 유지력이 긍정적 근거입니다.`
      : pressurePercentile <= 35
        ? `강팀 상대 검증은 ${formatPercentileRead(pressurePercentile, locale)}, 유지율 ${pressure.retentionPct}%로 현재 표본에서 가장 신중하게 평가할 부분입니다.`
        : `강팀 상대 경기력은 시즌 수준의 ${pressure.retentionPct}%를 유지하고 ${formatPercentileRead(pressurePercentile, locale)}을 기록해 대체로 중립적이고 안정적입니다.`
    const evidenceRead = `증거 등급 ${evidence.grade}(${evidence.confidencePct}%)는 유효 전장 ${evidence.effectiveMaps}개와 유효 상대 ${evidence.effectiveOpponents}팀을 기반으로 하며, 보정 평균의 90% 모델 구간은 ${interval}${Number.isFinite(lossRetention) ? `, 패배 전장 유지율은 ${lossRetention}%` : ''}입니다.`
    return [boundaryRead, pressureRead, evidenceRead]
  }

  const boundaryRead = floor >= 70
    ? `${name} 在同分路高样本池中的竞技下限为${formatPercentileRead(floor, locale)}、常态为${formatPercentileRead(typical, locale)}，说明其价值不是只由少数高峰地图支撑。`
    : floor <= 35 && ceiling >= 65
      ? `${name} 的表现边界从下限${formatPercentileRead(floor, locale)}延伸到上限${formatPercentileRead(ceiling, locale)}，上限明确，但更适合结合地图与阵容进行针对性使用。`
      : `${name} 的校正常态为${formatPercentileRead(typical, locale)}、竞技上限为${formatPercentileRead(ceiling, locale)}，赛季样本处于同分路${typical >= 65 ? '前段' : '中段'}。`
  const pressureRead = pressurePercentile >= 70
    ? `面对强档对手仍保留赛季校正水平的 ${pressure.retentionPct}%，强敌检验达到${formatPercentileRead(pressurePercentile, locale)}，高压环境保持度构成正向证据。`
    : pressurePercentile <= 35
      ? `强敌检验为${formatPercentileRead(pressurePercentile, locale)}、保持度 ${pressure.retentionPct}%，高强度赛程下的兑现是当前样本中最需要谨慎定价的部分。`
      : `强敌环境下保留赛季水平的 ${pressure.retentionPct}%，检验分位为${formatPercentileRead(pressurePercentile, locale)}，整体属于中性至稳定表现。`
  const evidenceRead = `证据等级 ${evidence.grade}（${evidence.confidencePct}%），覆盖 ${evidence.effectiveMaps} 张有效地图和 ${evidence.effectiveOpponents} 个有效对手；校正均值的 90% 模型区间为 ${interval}${Number.isFinite(lossRetention) ? `，败图保持度为 ${lossRetention}%` : ''}。`
  return [boundaryRead, pressureRead, evidenceRead]
}

function DecisionView({ player, locale }) {
  const t = getCopy(locale)
  const opponentStrength = player?.performanceSignals?.opponentStrength
  const envelope = opponentStrength?.performanceEnvelope
  const pressure = opponentStrength?.pressureTest
  const evidence = opponentStrength?.evidenceQuality
  if (!envelope || !pressure || !evidence) return null

  const axes = [
    { label: t.competitiveFloor, percentile: envelope.floorPercentile, value: envelope.floor },
    { label: t.typicalLevel, percentile: envelope.typicalPercentile, value: envelope.median },
    { label: t.competitiveCeiling, percentile: envelope.ceilingPercentile, value: envelope.ceiling },
    { label: t.strongOpponentTest, percentile: pressure.percentile, value: pressure.adjustedScore }
  ]
  const decisionRead = getDecisionRead(player, locale)

  return (
    <section id="evidence-decision-profile" className={styles.decisionView}>
      <header>
        <div><span>DECISION INTELLIGENCE</span><h3>{t.decisionView}</h3></div>
        <p>{t.decisionViewMeta}</p>
      </header>
      <div className={styles.decisionAxisGrid}>
        {axes.map(axis => (
          <article key={axis.label} className={axis.percentile >= 70 ? styles.axisPositive : axis.percentile <= 35 ? styles.axisWatch : ''}>
            <span>{axis.label}</span>
            <strong>{formatPercentileShort(axis.percentile, locale)}</strong>
            <small>{formatPercentileCode(axis.percentile)} · {t.adjustedContextScore} {axis.value}</small>
            <div><i style={{ width: `${Math.max(3, axis.percentile)}%` }} /><em /></div>
          </article>
        ))}
      </div>
      <div className={styles.decisionEvidenceStrip}>
        <div><span>{t.modelRange}</span><strong>{envelope.rangeLow90}–{envelope.rangeHigh90}</strong></div>
        <div><span>{t.strongRetention}</span><strong>{pressure.retentionPct}%</strong></div>
        <div><span>{t.effectiveMaps}</span><strong>{evidence.effectiveMaps}</strong></div>
        <div><span>{t.effectiveOpponents}</span><strong>{evidence.effectiveOpponents}</strong></div>
        <div><span>{t.mapTypes}</span><strong>{evidence.mapTypes}</strong></div>
        <div><span>{t.evidenceQuality}</span><strong>{evidence.grade} · {evidence.confidencePct}%</strong></div>
      </div>
      <article className={styles.decisionNarrative}>
        <span>{t.decisionRead}</span>
        <ol>{decisionRead.map((item, index) => <li key={item}><b>0{index + 1}</b><p>{item}</p></li>)}</ol>
      </article>
    </section>
  )
}

function AnalystWorkbench({ player, locale, decision }) {
  const t = getCopy(locale)
  const signals = player.performanceSignals
  if (!signals || !decision) return null

  const metricLabel = getMetricLabel(signals.focusMetricId, locale)
  const metricUnit = signals.focusMetricId === 'impact' ? '' : ' / 10'
  const consistency = signals.consistency
  const form = signals.form
  const pool = signals.heroPool
  const stageValidation = signals.stageValidation
  const opponentStrength = signals.opponentStrength
  const heroLineupContext = opponentStrength?.heroLineupContext
  const strongestMapType = opponentStrength?.adjustedMapTypes?.strongest
  const mapResultContext = opponentStrength?.mapResultContext
  const hasLossRetention = Number.isFinite(mapResultContext?.lossRetentionPct)

  return (
    <section className={styles.analystWorkbench}>
      <div className={styles.workbenchHeading}>
        <div>
          <span>ANALYST WORKBENCH</span>
          <h3>{t.analystWorkbench}</h3>
        </div>
        <p>{t.analystWorkbenchMeta}</p>
      </div>

      <DecisionView player={player} locale={locale} />

      <div className={styles.diagnosticGrid}>
        <DiagnosticCard
          eyebrow={t.subroleEvidence}
          value={`${player.subroleEvidence?.confidencePct || 0}%`}
          meta={player.subroleEvidence?.grade === 'FULL' ? t.fullEvidence : t.partialEvidence}
          detail={`${player.subroleEvidence?.maps || 0} ${t.maps} · ${formatMinutes(player.subroleEvidence?.minutes)} ${t.minutes} · ${player.subroleEvidence?.matches || 0} ${t.matches}`}
          tone={player.subroleEvidence?.grade === 'FULL' ? 'Positive' : 'Watch'}
        />
        <DiagnosticCard
          eyebrow={t.subrole}
          value={`${player.subroleProfile.primarySharePct}%`}
          meta={getSubroleLabel(player.subrole, locale)}
          detail={player.subroleProfile.secondary
            ? `${getSubroleLabel(player.subroleProfile.secondary, locale)} · ${player.subroleProfile.secondarySharePct}%`
            : `${t.subroleFit} · 100%`}
          tone={player.subroleProfile.hybrid ? 'Watch' : 'Positive'}
        />
        <DiagnosticCard
          eyebrow={t.consistency}
          value={Number.isFinite(consistency.percentile) ? formatPercentileShort(consistency.percentile, locale) : '—'}
          meta={`${t.consistencyMeta} · ${formatPercentileCode(consistency.percentile)}`}
          detail={`${t.middle50} · ${formatSignalValue(consistency.middle50Low, locale)}–${formatSignalValue(consistency.middle50High, locale)} ${metricLabel}${metricUnit}`}
          tone={consistency.percentile >= 70 ? 'Positive' : ''}
        />
        <DiagnosticCard
          eyebrow={t.recentForm}
          value={formatSignedPct(form.deltaPct)}
          meta={t.recentFormMeta}
          detail={`${formatSignalValue(form.recentValue, locale)} ↔ ${formatSignalValue(form.previousValue, locale)} ${metricLabel}${metricUnit}`}
          tone={form.deltaPct >= 5 ? 'Positive' : form.deltaPct <= -5 ? 'Watch' : ''}
        />
        <DiagnosticCard
          eyebrow={t.effectivePool}
          value={pool.effectiveHeroes.toFixed(1)}
          meta={t.effectivePoolMeta}
          detail={`${pool.coverage80} ${t.heroes} · ${t.coverage80} · ${pool.primarySharePct}% #1`}
        />
        {opponentStrength ? (
          <DiagnosticCard
            eyebrow={t.opponentStrength}
            value={formatPercentileShort(opponentStrength.schedulePercentile, locale)}
            meta={`${formatPercentileCode(opponentStrength.schedulePercentile)} · ${t.opponentStrengthMeta} · ${opponentStrength.scheduleRating}`}
            detail={`${t.expectedWin} ${opponentStrength.averageExpectedWinPct}% · ${t.matureCoverage} ${opponentStrength.matureContextPct}%`}
            tone={opponentStrength.schedulePercentile >= 70 ? 'Positive' : ''}
          />
        ) : null}
        {opponentStrength ? (
          <DiagnosticCard
            eyebrow={t.heroLineupAdjusted}
            value={formatSignedNumber(heroLineupContext?.combinedAdjustment)}
            meta={`${t.contextCoverage} ${heroLineupContext?.coveragePct ?? '—'}% · ${t.calibrationWeight} ${heroLineupContext?.appliedWeightPct ?? '—'}%`}
            detail={`${heroLineupContext?.ownHeroContexts ?? '—'} ${t.heroes} · ${heroLineupContext?.lineupAnchorContexts ?? '—'} ${t.lineupAnchors} · ${heroLineupContext?.partnerContexts ?? '—'} ${t.partnerContexts}`}
            tone={Math.abs(heroLineupContext?.combinedAdjustment || 0) >= 3 ? 'Watch' : ''}
          />
        ) : null}
        {opponentStrength ? (
          <DiagnosticCard
            eyebrow={t.contextAdjusted}
            value={formatPercentileShort(opponentStrength.adjustedPercentile, locale)}
            meta={`${formatPercentileCode(opponentStrength.adjustedPercentile)} · ${t.contextAdjustedMeta}`}
            detail={`${opponentStrength.rawScore} → ${opponentStrength.adjustedScore} · ${formatSignedNumber(opponentStrength.adjustment)}`}
            tone={opponentStrength.adjustedPercentile >= 70 ? 'Positive' : opponentStrength.adjustedPercentile <= 30 ? 'Watch' : ''}
          />
        ) : null}
        {stageValidation ? (
          <DiagnosticCard
            eyebrow={t.stageValidation}
            value={formatPercentileShort(stageValidation.percentile, locale)}
            meta={`${formatPercentileCode(stageValidation.percentile)} · ${stageValidation.eligible ? t.stageValidationMeta : t.insufficientContext}`}
            detail={stageValidation.eligible
              ? `${t.stageConfidence} ${stageValidation.confidencePct}% · ${stageValidation.playoffs.maps} ${t.maps} · ${formatSignedPct(stageValidation.adjustedDeltaPct)}`
              : `${t.playoffContext} · ${formatPercentileRead(50, locale)}`}
            tone={stageValidation.percentile >= 70 ? 'Positive' : stageValidation.percentile <= 30 ? 'Watch' : ''}
          />
        ) : null}
        <DiagnosticCard
          eyebrow={t.mapLossRetention}
          value={hasLossRetention ? `${mapResultContext.lossRetentionPct}%` : '—'}
          meta={hasLossRetention ? t.pressureContextMeta : t.insufficientContext}
          detail={hasLossRetention
            ? `${t.win} ${mapResultContext.wins.adjustedScore} ↔ ${t.loss} ${mapResultContext.losses.adjustedScore} · ${t.contextAdjusted}`
            : `${mapResultContext?.wins?.maps || 0}W · ${mapResultContext?.losses?.maps || 0}L`}
          tone={hasLossRetention && mapResultContext.lossRetentionPct >= 90 ? 'Positive' : hasLossRetention && mapResultContext.lossRetentionPct <= 70 ? 'Watch' : ''}
        />
      </div>

      {opponentStrength?.strongestOpponents?.length ? (
        <article id="evidence-strong-opponents" className={styles.opponentEvidenceCard}>
          <header>
            <div><span>{t.observation}</span><h3>{t.strongestOpponents}</h3></div>
            <p>{t.strongestOpponentsMeta}</p>
          </header>
          <div className={styles.opponentEvidenceGrid}>
            {opponentStrength.strongestOpponents.map(opponent => (
              <div key={opponent.opponentTeamId}>
                <span>{opponent.opponentTeamName}</span>
                <strong>{opponent.opponentRating}</strong>
                <p>{opponent.matches} {t.matches} · {opponent.maps} {t.maps}</p>
                <small>{t.rawContextScore} {opponent.rawScore} → {t.adjustedContextScore} {opponent.adjustedScore}</small>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div className={styles.analystInterpretationGrid}>
        <article className={styles.tacticalCard}>
          <div className={styles.observationBlock}>
            <span>{t.observation}</span>
            <strong>{t.strongestMapType}</strong>
            {strongestMapType ? (
              <p>
                {getMapTypeLabel(strongestMapType.key, locale)} · {t.adjustedContextScore} {strongestMapType.adjustedScore} · {strongestMapType.maps} {t.maps}
              </p>
            ) : <p>{t.insufficientContext}</p>}
            <small>{t.strongestMapTypeMeta}</small>
          </div>
          <div className={styles.interpretationBlock}>
            <span>{t.interpretation}</span>
            <strong>{t.tacticalHypothesis}</strong>
            <p>{decision.tacticalHypothesis}</p>
            <small>{t.tacticalHypothesisMeta}</small>
          </div>
        </article>
        {decision.verificationQuestions?.length ? (
          <article className={styles.verificationQuestions}>
            <header><span>VALIDATION QUESTIONS</span><strong>{getProfessionalReferenceCopy(locale).verification}</strong></header>
            <ol>{decision.verificationQuestions.map((question, index) => <li key={question}><b>{String(index + 1).padStart(2, '0')}</b><p>{question}</p></li>)}</ol>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function DeploymentAxisCard({ label, value, detail, tone = '' }) {
  return (
    <article className={`${styles.deploymentAxisCard} ${tone ? styles[`deployment${tone}`] : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <div><i style={{ width: `${Math.max(3, value)}%` }} /><em /></div>
      <small>{detail}</small>
    </article>
  )
}

function RecruitmentScenarioFit({ player, locale, activeScenario = 'BALANCED' }) {
  const t = getCopy(locale)
  const fits = player.performanceSignals.recruitmentScenarios?.fits || {}

  return (
    <div className={styles.scenarioFitDetail}>
      <header><div><span>SELECTION LENS</span><h4>{t.scenarioFitTitle}</h4><p>{t.scenarioFitMeta}</p></div></header>
      <div>
        {RECRUITMENT_SCENARIO_ORDER.map(scenario => {
          const fit = fits[scenario]
          const copy = getRecruitmentScenarioCopy(scenario, locale)
          return (
            <article key={scenario} className={scenario === activeScenario ? styles.scenarioFitBest : ''}>
              <span>{copy.label}</span>
              <strong>{fit?.score ?? '—'}<small>FIT</small></strong>
              <i><em style={{ width: `${fit?.score || 0}%` }} /></i>
              <p>{t.scenarioRank} #{fit?.rank || '—'} / {fit?.total || '—'}</p>
              <small>{copy.meta}</small>
            </article>
          )
        })}
      </div>
      <footer>{t.scenarioBoardCaution}</footer>
    </div>
  )
}

function getDeploymentUseSentence(context, locale) {
  if (!context) return ''
  const hero = formatOwHeroName(context.hero, locale)
  const mapType = getMapTypeLabel(context.mapType, locale)
  if (locale === 'en-US') {
    return `${hero} on ${mapType} retains ${context.retentionPct}% of the player’s adjusted baseline across ${context.maps} maps and ${context.matches} matches.`
  }
  if (locale === 'ko-KR') {
    return `${mapType}에서 ${hero} 기용 시 보정 기준선의 ${context.retentionPct}%를 유지했습니다. 표본은 ${context.maps}개 전장, ${context.matches}경기입니다.`
  }
  return `${mapType}使用${hero}时保持个人校正基线的 ${context.retentionPct}%；样本为 ${context.maps} 图、${context.matches} 场比赛。`
}

function DeploymentUseCard({ label, context, locale, role, emptyText }) {
  const t = getCopy(locale)
  if (!context) {
    return <article className={`${styles.playbookUseCard} ${styles.playbookUseEmpty}`}><span>{label}</span><p>{emptyText}</p></article>
  }

  return (
    <article className={styles.playbookUseCard} data-status={context.status}>
      <HeroArtwork hero={context.hero} role={role} className={styles.playbookUseArtwork} />
      <div className={styles.playbookUseScrim} />
      <header><span>{label}</span><b>{getDeploymentContextLabel(context.status, locale)}</b></header>
      <div className={styles.playbookUseIdentity}>
        <small>{getMapTypeLabel(context.mapType, locale)}</small>
        <strong>{formatOwHeroName(context.hero, locale)}</strong>
        <p>{getDeploymentUseSentence(context, locale)}</p>
      </div>
      <footer>
        <span><b>{context.retentionPct}%</b><small>{t.contextRetention}</small></span>
        <span><b>{context.confidencePct}%</b><small>{t.contextConfidence}</small></span>
        <span><b>{context.percentile ? formatPercentileShort(context.percentile, locale) : context.evidenceGrade}</b><small>{context.percentile ? t.roleMedian : t.evidence}</small></span>
      </footer>
    </article>
  )
}

function ContextFitList({ title, contexts, locale }) {
  const t = getCopy(locale)
  return (
    <article className={styles.playbookContextPanel}>
      <header><span>{title}</span><small>{t.contextRetention} · 80–120%</small></header>
      {contexts.length ? <div>
        {contexts.slice(0, 4).map(context => {
          const position = Math.max(0, Math.min(100, ((context.retentionPct - 80) / 40) * 100))
          return (
            <div key={context.key} className={styles.playbookContextRow} data-status={context.status}>
              <strong>{formatLineupContextKey(context.key, locale)}</strong>
              <div className={styles.playbookContextRail} style={{ '--context-position': `${position}%` }}>
                <i /><em /><b />
              </div>
              <span>{context.retentionPct}%</span>
              <small>{context.maps} {t.maps} · {context.confidencePct}% {t.contextConfidence}</small>
            </div>
          )
        })}
      </div> : <p className={styles.playbookNoContext}>{t.insufficientDeploymentContext}</p>}
    </article>
  )
}

function DeploymentPlaybook({ player, locale }) {
  const t = getCopy(locale)
  const playbook = player.performanceSignals.opponentStrength?.deploymentPlaybook
  if (!playbook) return null
  const cells = playbook.heroMapCells || []
  const recommendations = playbook.recommendations || {}
  const heroMinutes = new Map((playbook.heroContexts || []).map(context => [context.hero, context.minutes]))
  const heroes = [...new Set(cells.map(cell => cell.hero))]
    .sort((a, b) => (heroMinutes.get(b) || 0) - (heroMinutes.get(a) || 0))
  const mapTypes = Object.keys(MAP_TYPE_COPY).filter(mapType => cells.some(cell => cell.mapType === mapType))
  const cellMap = new Map(cells.map(cell => [`${cell.hero}|||${cell.mapType}`, cell]))
  const gate = playbook.sampleGate?.heroMap || {}

  return (
    <section className={styles.deploymentPlaybook} aria-labelledby="deployment-playbook-title">
      <div className={styles.playbookHeading}>
        <div><span>DEPLOYMENT PLAYBOOK · SELECTION V2.7</span><h3 id="deployment-playbook-title">{t.deploymentPlaybook}</h3><p>{t.deploymentPlaybookMeta}</p></div>
        <aside>
          <span><small>{t.eligibleContexts}</small><strong>{playbook.eligibleHeroMapCells}</strong></span>
          <span><small>{t.contextCoverage}</small><strong>{playbook.coveragePct}%</strong></span>
          <span><small>{t.evidenceGate}</small><strong>{gate.minMaps || 2} / {gate.minMatches || 2}</strong></span>
        </aside>
      </div>

      <div className={styles.playbookUseGrid}>
        <DeploymentUseCard label={t.recommendedUse} context={recommendations.primaryUse} locale={locale} role={player.role} emptyText={t.insufficientDeploymentContext} />
        <DeploymentUseCard label={t.alternateUse} context={recommendations.secondaryUse} locale={locale} role={player.role} emptyText={t.insufficientDeploymentContext} />
        <DeploymentUseCard label={t.watchUse} context={recommendations.watchContext} locale={locale} role={player.role} emptyText={t.noWatchContext} />
      </div>

      <article className={styles.heroMapMatrixPanel}>
        <header>
          <div><span>01 · CONTEXT MATRIX</span><h4>{t.heroMapMatrix}</h4><p>{t.heroMapMatrixMeta}</p></div>
          <small>{t.evidenceGate} · ≥{gate.minMaps || 2} {t.maps} · ≥{gate.minMatches || 2} {t.matches} · ≥{gate.minMinutes || 12} {t.minutes} · ≥{gate.minConfidencePct || 45}%</small>
        </header>
        {heroes.length && mapTypes.length ? (
          <div className={styles.heroMapMatrixScroller}>
            <div className={styles.heroMapMatrix} style={{ '--map-columns': mapTypes.length }}>
              <span className={styles.heroMapCorner}>HERO / MAP</span>
              {mapTypes.map(mapType => <strong key={mapType}>{getMapTypeLabel(mapType, locale)}</strong>)}
              {heroes.map(hero => (
                <div key={hero} className={styles.heroMapMatrixRow}>
                  <div className={styles.heroMapHero}><HeroIcon hero={hero} role={player.role} locale={locale} /><b>{formatOwHeroName(hero, locale)}</b></div>
                  {mapTypes.map(mapType => {
                    const cell = cellMap.get(`${hero}|||${mapType}`)
                    return cell ? (
                      <div key={mapType} className={styles.heroMapCell} data-status={cell.status} title={getDeploymentUseSentence(cell, locale)}>
                        <strong>{cell.retentionPct}%</strong>
                        <span>{cell.percentile ? formatPercentileShort(cell.percentile, locale) : cell.evidenceGrade}</span>
                        <small>{cell.maps} {t.maps} · {cell.confidencePct}%</small>
                      </div>
                    ) : <div key={mapType} className={`${styles.heroMapCell} ${styles.heroMapCellEmpty}`}><span>—</span></div>
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : <p className={styles.playbookNoContext}>{t.insufficientDeploymentContext}</p>}
      </article>

      <div className={styles.playbookLineupGrid}>
        <div className={styles.playbookLineupHeading}><span>02 · RECORDED LINEUP CONDITIONS</span><h4>{t.lineupContextFit}</h4><p>{t.lineupContextFitMeta}</p></div>
        <ContextFitList title={t.lineupAnchor} contexts={playbook.lineupAnchors || []} locale={locale} />
        <ContextFitList title={t.sameRolePartner} contexts={playbook.partnerContexts || []} locale={locale} />
      </div>

      <footer className={styles.playbookCaution}><b>ASSOCIATION ≠ CAUSATION</b><p>{t.contextAssociationCaution}</p></footer>
    </section>
  )
}

function DeploymentProfile({ player, locale, activeScenario = 'BALANCED' }) {
  const t = getCopy(locale)
  const profile = player.performanceSignals.deploymentProfile
  const opponentStrength = player.performanceSignals.opponentStrength
  if (!profile || !opponentStrength) return null
  const components = profile.components
  const mapTypeOrder = Object.keys(MAP_TYPE_COPY)
  const mapTypes = [...(opponentStrength.adjustedMapTypes?.groups || [])]
    .sort((a, b) => mapTypeOrder.indexOf(a.key) - mapTypeOrder.indexOf(b.key))
  const opponentTiers = opponentStrength.opponentTiers || []
  const heroContexts = opponentStrength.adjustedHeroContexts?.groups || []

  return (
    <section className={styles.deploymentProfile}>
      <div className={styles.deploymentHeading}>
        <div><span>DEPLOYMENT INTELLIGENCE</span><h3>{t.deploymentProfile}</h3><p>{t.deploymentProfileMeta}</p></div>
        <strong className={`${styles.deploymentMode} ${styles[`mode${profile.mode}`] || ''}`}>
          <small>{t.deploymentMode}</small>{getDeploymentModeLabel(profile.mode, locale)}
        </strong>
      </div>

      <div className={styles.deploymentAxisGrid}>
        <DeploymentAxisCard
          label={t.baselineReliability}
          value={profile.baselineReliability}
          detail={`${formatPercentileShort(components.floorPercentile, locale)} ${t.competitiveFloor} · ${formatPercentileShort(components.consistencyPercentile, locale)} ${t.consistency}`}
          tone={profile.baselineReliability >= 65 ? 'Positive' : profile.baselineReliability < 50 ? 'Watch' : ''}
        />
        <DeploymentAxisCard
          label={t.pressureReadiness}
          value={profile.pressureReadiness}
          detail={`${formatPercentileShort(components.pressurePercentile, locale)} ${t.strongOpponentTest} · ${formatPercentileShort(components.stagePercentile, locale)} ${t.stageValidation}`}
          tone={profile.pressureReadiness >= 65 ? 'Positive' : profile.pressureReadiness < 50 ? 'Watch' : ''}
        />
        <DeploymentAxisCard
          label={t.contextPortability}
          value={profile.contextPortability}
          detail={`${formatPercentileShort(components.heroBreadthPercentile, locale)} ${t.effectivePool} · ${components.mapCoveragePct}% ${t.mapTypes} · ${formatPercentileShort(components.mapBalancePercentile, locale)} ${t.mapBalance}`}
          tone={profile.contextPortability >= 65 ? 'Positive' : profile.contextPortability < 50 ? 'Watch' : ''}
        />
      </div>

      <RecruitmentScenarioFit player={player} locale={locale} activeScenario={activeScenario} />

      <div className={styles.contextEvidenceGrid}>
        <article className={styles.contextPanel}>
          <header><span>01</span><div><h4>{t.mapTypeReadiness}</h4><p>{t.mapTypeReadinessMeta}</p></div></header>
          <div className={styles.contextRowList}>
            {mapTypes.map(group => (
              <div key={group.key} className={!group.eligible ? styles.contextInsufficient : ''}>
                <strong>{getMapTypeLabel(group.key, locale)}</strong>
                <b>{group.eligible ? formatPercentileShort(group.percentile, locale) : '—'}</b>
                <span>{group.maps} {t.maps} · {t.adjustedContextScore} {group.adjustedScore}</span>
                <small>{group.eligible ? `${t.retentionVsBaseline} ${group.retentionPct}% · ${t.contextConfidence} ${group.confidencePct}%` : t.insufficientTier}</small>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.contextPanel}>
          <header><span>02</span><div><h4>{t.opponentTierCurve}</h4><p>{t.opponentTierCurveMeta}</p></div></header>
          <div className={styles.opponentTierGrid}>
            {opponentTiers.map(tier => (
              <div key={tier.key} className={!tier.eligible ? styles.contextInsufficient : ''}>
                <span>{getOpponentTierLabel(tier.key, locale)}</span>
                <strong>{tier.eligible ? formatPercentileShort(tier.percentile, locale) : '—'}</strong>
                <p>{tier.maps} {t.maps} · {tier.matches} {t.matches} · {tier.opponents} {t.opponentsCount}</p>
                <b>{tier.eligible ? `${t.retentionVsBaseline} ${tier.retentionPct}%` : t.insufficientTier}</b>
                <i><em style={{ width: `${tier.confidencePct || 0}%` }} /></i>
                <small>{t.contextConfidence} {tier.confidencePct || 0}%</small>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.contextPanel}>
          <header><span>03</span><div><h4>{t.heroContextEvidence}</h4><p>{t.heroContextEvidenceMeta}</p></div></header>
          <div className={styles.contextRowList}>
            {heroContexts.map(group => (
              <div key={group.key}>
                <strong>{formatOwHeroName(group.key, locale)}</strong>
                <b>{group.retentionPct}%</b>
                <span>{group.maps} {t.maps} · {t.adjustedContextScore} {group.adjustedScore}</span>
                <small>{t.retentionVsBaseline} · {t.contextConfidence} {group.confidencePct}%</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <footer><b>{t.deploymentFormula}</b><p>{t.deploymentCaution}</p></footer>
    </section>
  )
}

function PlayerAnalysis({ player, locale, activeScenario, decision, onPrint }) {
  const t = getCopy(locale)
  const disclosure = getDisclosureCopy(locale)
  const riskItems = player.risks.length ? player.risks : []
  const isImpactTrend = player.trend.metricId === 'impact'
  const scenarioFit = getScenarioFit(player, activeScenario) || getScenarioFit(player, 'BALANCED')

  return (
    <section id="summary" className={styles.playerAnalysis}>
      <div className={styles.analysisHeader}>
        <div>
          <span>02 · PLAYER DOSSIER · {getCandidateStatusLabel(player, locale)}</span>
          <h2>{player.identity.displayName}</h2>
          <p>
            {getSubroleLabel(player.subrole, locale)} · {player.identity.teamShort} · {getPlacementLabel(player.teamPlacement, locale)} · {t.subroleFit} {player.subroleProfile.primarySharePct}%
            {player.subroleProfile.secondary ? ` / ${getSubroleLabel(player.subroleProfile.secondary, locale)} ${player.subroleProfile.secondarySharePct}%` : ''}
          </p>
          <div className={styles.identityMetadata}>
            <p className={styles.battleTag}><b>{t.battleTag}</b> · {player.identity.battleTag || '—'}</p>
            <p><b>{t.nationality}</b> · {getNationalityLabel(player.identity.nationality, locale)}</p>
          </div>
        </div>
        <div className={styles.analysisScore}>
          <strong>{scenarioFit?.score ?? player.selection.score}</strong><small>FIT</small>
          <em>{t.roleRank} {scenarioFit?.rank ?? player.highSampleSubroleRank} / {scenarioFit?.total ?? player.highSampleSubroleTotal} · {t.selectionScore} {player.selection.score} · OVR {player.summary.seasonOvr}</em>
        </div>
        <button type="button" className={styles.printButton} onClick={onPrint}>{t.printPdf}</button>
      </div>

      <PlayerDecisionBrief player={player} locale={locale} decision={decision} />
      <DecisionEvidenceLocator player={player} locale={locale} />
      <ShadowValidationPanel player={player} locale={locale} />
      <ProfessionalReferencePanel player={player} locale={locale} decision={decision} />
      <details className={styles.coachAuditDisclosure}>
        <summary><span>MODEL AUDIT</span><div><strong>{disclosure.auditTitle}</strong><small>{disclosure.auditMeta}</small></div><b aria-hidden="true">＋</b></summary>
        <PlayerDecisionTrail player={player} locale={locale} />
      </details>

      <div id="context" className={styles.anchorSection}>
        <DeploymentPlaybook player={player} locale={locale} />
        <DeploymentProfile player={player} locale={locale} activeScenario={activeScenario} />
        <AnalystWorkbench player={player} locale={locale} decision={decision} />
      </div>

      <div id="profile" className={`${styles.evidenceGrid} ${styles.anchorSection}`}>
        <article className={styles.evidenceCard}>
          <header><span>{t.evidence}</span><h3>{t.strengths}</h3></header>
          <ol>
            {player.strengths.map(item => (
              <li key={item.metricId}>
                <b>{formatPercentileShort(item.percentile, locale)}<small>{formatPercentileCode(item.percentile)} · #{item.subroleRank}/{item.subroleTotal}</small></b>
                <div><strong>{getMetricLabel(item.metricId, locale)}</strong><p>{getStrengthText(item, locale)}</p></div>
              </li>
            ))}
          </ol>
        </article>
        <article className={`${styles.evidenceCard} ${styles.riskCard}`}>
          <header><span>{t.analystRead}</span><h3>{t.risks}</h3></header>
          {!riskItems.length ? <p className={styles.noRisk}>{t.noAbsoluteWeakness}</p> : null}
          <ol>
            {riskItems.map((item, index) => (
              <li key={`${item.type}-${item.metricId || item.primaryHero || index}`}>
                <b>0{index + 1}</b>
                <div><strong>{item.type === 'metric_risk' ? t.risks : t.relativeWatch}</strong><p>{getRiskText(item, locale)}</p></div>
              </li>
            ))}
          </ol>
        </article>
      </div>

      <div className={styles.profileGrid}>
        <article id="evidence-role-metrics" className={styles.profileCard}>
          <header><h3>{t.roleProfile}</h3><p>{t.roleProfileMeta}</p></header>
          <div className={styles.fullMetricList}>
            {player.roleMetrics.map(metric => (
              <div key={metric.id} className={styles.fullMetricRow}>
                <span>{getMetricLabel(metric.id, locale)}</span>
                <b>{metric.valueLabel}</b>
                <div><i style={{ width: `${Math.max(3, metric.subrolePercentile ?? metric.percentile ?? 0)}%` }} /><em /></div>
                <strong>{formatPercentileShort(metric.subrolePercentile ?? metric.percentile, locale)}<small>{formatPercentileCode(metric.subrolePercentile ?? metric.percentile)} · #{metric.subroleRank || '—'}/{metric.subroleTotal || '—'}</small></strong>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.profileCard}>
          <header><h3>{t.heroPool}</h3><p>{t.heroPoolMeta}</p></header>
          <div className={styles.heroPoolList}>
            {player.heroPool.slice(0, 6).map(hero => (
              <div key={hero.hero} className={styles.heroPoolRow}>
                <HeroIcon hero={hero.hero} role={player.role} locale={locale} />
                <div><strong>{formatOwHeroName(hero.hero, locale)}</strong><span>{hero.maps} {t.maps} · {hero.timeLabel}</span></div>
                <div className={styles.heroUsage}><i style={{ width: `${Math.max(2, Math.round(hero.usagePct * 100))}%` }} /></div>
                <b>{hero.usageLabel}</b>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div id="matches" className={`${styles.profileGrid} ${styles.anchorSection}`}>
        <article id="evidence-recent-form" className={styles.profileCard}>
          <header><h3>{t.recentTrend}</h3><p>{t.recentTrendMeta}</p></header>
          <div className={styles.trendChart}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240} initialDimension={{ width: 640, height: 260 }}>
              <LineChart data={player.trend.rows} margin={{ top: 16, right: 12, bottom: 6, left: -20 }}>
                <CartesianGrid stroke="rgba(255,255,255,.07)" strokeDasharray="3 6" />
                <XAxis dataKey="order" tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 9 }} />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,.5)', fontSize: 9 }}
                  domain={isImpactTrend
                    ? [dataMin => Math.max(0, Math.floor(dataMin - 5)), dataMax => Math.ceil(dataMax + 5)]
                    : ['dataMin - 500', 'dataMax + 500']}
                />
                <Tooltip content={<TrendTooltip locale={locale} />} />
                <Line type="monotone" dataKey="value" stroke="#f4c320" strokeWidth={2} dot={{ r: 3, fill: '#f4c320', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.trendMetric}>{getMetricLabel(player.trend.metricId, locale)}{isImpactTrend ? '' : ` · ${t.per10}`}</div>
        </article>

        <article className={styles.profileCard}>
          <header><h3>{t.recentMatches}</h3><p>{t.evidence}</p></header>
          <div className={styles.matchList}>
            {player.recentMatches.slice(0, 4).map(match => (
              <div key={match.matchId} className={styles.matchRow}>
                <span className={`${styles.matchResult} ${styles[`result${match.result}`]}`}>{getResultLabel(match.result, t)}</span>
                <div><strong>{match.opponent.short}</strong><span>{match.dateLabel} · {match.heroLabel} · {match.mapsPlayed} {t.maps}</span><small>{match.displayName}</small></div>
                <b>{match.scoreLabel}</b>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function getComparisonColor(player) {
  const rankIndex = Math.max(0, (Number(player?.highSampleSubroleRank) || 1) - 1)
  return COMPARISON_PLAYER_COLORS[rankIndex % COMPARISON_PLAYER_COLORS.length]
}

function getComparisonMetrics(t, stage) {
  if (stage === 'playoffs') {
    return [
      { id: 'selection', label: t.selectionScore, value: player => player.selection.score },
      { id: 'playoffs', label: t.playoffsView, value: player => player.performanceSignals.stageValidation?.eligible ? player.performanceSignals.stageValidation.playoffPerformancePercentile : 50 },
      { id: 'stage', label: t.stageValidation, value: player => player.performanceSignals.stageValidation?.percentile },
      { id: 'pressure', label: t.strongOpponentTest, value: player => player.performanceSignals.opponentStrength?.pressureTest?.percentile },
      { id: 'evidence', label: t.evidenceQuality, value: player => player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct },
      { id: 'stability', label: t.selectionStability, value: player => player.selection.preferenceSensitivity?.relevantPct }
    ]
  }

  return [
    { id: 'selection', label: t.selectionScore, value: player => player.selection.score },
    { id: 'adjusted', label: t.contextAdjusted, value: player => player.performanceSignals.opponentStrength?.adjustedPercentile },
    { id: 'floor', label: t.competitiveFloor, value: player => player.performanceSignals.opponentStrength?.performanceEnvelope?.floorPercentile },
    { id: 'pressure', label: t.strongOpponentTest, value: player => player.performanceSignals.opponentStrength?.pressureTest?.percentile },
    { id: 'baseline', label: t.baselineReliability, value: player => player.performanceSignals.deploymentProfile?.baselineReliability },
    { id: 'portability', label: t.contextPortability, value: player => player.performanceSignals.deploymentProfile?.contextPortability }
  ]
}

function getComparisonValue(metric, player, fallback = 0) {
  const value = Number(metric.value(player))
  return Number.isFinite(value) ? value : fallback
}

function formatComparisonValue(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '—'
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(1)
}

function getComparisonFitScore(player, scenario) {
  return Number(getScenarioFit(player, scenario)?.score ?? player?.selection?.score ?? 0)
}

function getPairwiseBootstrapRead(pairwiseBootstrap, playerA, playerB) {
  const comparisons = Array.isArray(pairwiseBootstrap)
    ? pairwiseBootstrap
    : pairwiseBootstrap?.comparisons || []
  const comparison = comparisons.find(item => (
    (item.playerAId === playerA?.playerId && item.playerBId === playerB?.playerId) ||
    (item.playerAId === playerB?.playerId && item.playerBId === playerA?.playerId)
  ))
  if (!comparison) return null
  const direct = comparison.playerAId === playerA.playerId
  return {
    probabilityPct: direct
      ? Number(comparison.playerAWinProbabilityPct)
      : Number((100 - Number(comparison.playerAWinProbabilityPct)).toFixed(1)),
    deltaLow90: direct ? comparison.deltaLow90 : -Number(comparison.deltaHigh90),
    deltaHigh90: direct ? comparison.deltaHigh90 : -Number(comparison.deltaLow90),
    playerAMatches: direct ? comparison.playerAMatches : comparison.playerBMatches,
    playerBMatches: direct ? comparison.playerBMatches : comparison.playerAMatches,
    trials: pairwiseBootstrap?.trials || comparison.trials || 0
  }
}

function getComparisonDecisionConfidence(players, scenario, pairwiseBootstrap) {
  const ranked = [...players].sort((a, b) => getComparisonFitScore(b, scenario) - getComparisonFitScore(a, scenario))
  const leader = ranked[0]
  const alternate = ranked[1]
  if (!leader || !alternate) return null

  const lead = Number((getComparisonFitScore(leader, scenario) - getComparisonFitScore(alternate, scenario)).toFixed(1))
  const topPair = [leader, alternate]
  const evidenceFloor = Math.min(...topPair.map(player => Number(player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct) || 0))
  const stabilityFloor = Math.min(...topPair.map(player => Number(player.selection.preferenceSensitivity?.relevantPct) || 0))
  const robustnessSensitive = topPair.some(player => (
    ['SENSITIVE', 'FRAGILE'].includes(player.selection.robustness?.status) ||
    (Number(player.selection.robustness?.worstRankDrop) || 0) > 1
  ))
  const leaderRange = leader.performanceSignals.opponentStrength?.performanceEnvelope
  const alternateRange = alternate.performanceSignals.opponentStrength?.performanceEnvelope
  const rangeValues = [leaderRange?.rangeLow90, leaderRange?.rangeHigh90, alternateRange?.rangeLow90, alternateRange?.rangeHigh90].map(Number)
  const rangesOverlap = rangeValues.every(Number.isFinite)
    ? leaderRange.rangeLow90 <= alternateRange.rangeHigh90 && alternateRange.rangeLow90 <= leaderRange.rangeHigh90
    : null
  const bootstrap = getPairwiseBootstrapRead(pairwiseBootstrap, leader, alternate)
  const bootstrapProbability = Number(bootstrap?.probabilityPct)
  const bootstrapSensitive = Number.isFinite(bootstrapProbability) && bootstrapProbability < 55
  const status = robustnessSensitive || evidenceFloor < 55 || stabilityFloor < 60 || bootstrapSensitive
    ? 'SENSITIVE'
    : lead >= 6 && evidenceFloor >= 70 && stabilityFloor >= 75 && (!Number.isFinite(bootstrapProbability) || bootstrapProbability >= 70)
      ? 'CLEAR'
      : 'CONDITIONAL'

  return { ranked, leader, alternate, lead, evidenceFloor, stabilityFloor, rangesOverlap, bootstrap, status }
}

function getComparisonDecisionNarrative(confidence, scenarioCopy, locale) {
  const { leader, alternate, lead, evidenceFloor, stabilityFloor, rangesOverlap, bootstrap, status } = confidence
  const bootstrapClause = Number.isFinite(Number(bootstrap?.probabilityPct))
    ? locale === 'en-US'
      ? ` Match-clustered resampling gives the leader a ${bootstrap.probabilityPct}% adjusted-performance win probability.`
      : locale === 'ko-KR'
        ? ` 경기 클러스터 재표집에서 선두의 보정 경기력 우위 확률은 ${bootstrap.probabilityPct}%입니다.`
        : `按比赛聚类重采样后，首位的校正表现胜出概率为 ${bootstrap.probabilityPct}%。`
    : ''
  if (locale === 'en-US') {
    if (status === 'CLEAR') return `${leader.identity.displayName} leads ${alternate.identity.displayName} by ${lead} FIT under “${scenarioCopy.label}”. Evidence and ranking stability support the current FIT order${rangesOverlap === true ? ', while the 90% performance intervals still overlap' : ''}.${bootstrapClause}`
    if (status === 'SENSITIVE') return `${leader.identity.displayName} currently leads by ${lead} FIT, but the evidence floor (${evidenceFloor}%) or ranking stability (${stabilityFloor}%) makes the order provisional.${bootstrapClause}`
    return `${leader.identity.displayName} leads ${alternate.identity.displayName} by ${lead} FIT under “${scenarioCopy.label}”. The gap is decision-relevant but not large enough to ignore the club's specific need.${bootstrapClause}`
  }
  if (locale === 'ko-KR') {
    if (status === 'CLEAR') return `“${scenarioCopy.label}” 기준에서 ${leader.identity.displayName}이(가) ${alternate.identity.displayName}보다 ${lead} FIT 앞서며 근거와 순위 안정도는 현재 FIT 순서를 지지합니다${rangesOverlap === true ? '. 다만 90% 경기력 구간은 여전히 중첩됩니다' : ''}${bootstrapClause}`
    if (status === 'SENSITIVE') return `${leader.identity.displayName}이(가) ${lead} FIT 앞서지만 근거 하한(${evidenceFloor}%) 또는 순위 안정도(${stabilityFloor}%) 때문에 현재 순서는 잠정적입니다.${bootstrapClause}`
    return `“${scenarioCopy.label}” 기준에서 ${leader.identity.displayName}이(가) ${alternate.identity.displayName}보다 ${lead} FIT 앞서지만 구단의 구체적 요구를 무시할 만큼 큰 차이는 아닙니다.${bootstrapClause}`
  }
  if (status === 'CLEAR') return `在“${scenarioCopy.label}”侧重下，${leader.identity.displayName} 领先 ${alternate.identity.displayName} ${lead} 个 FIT；证据与顺位稳定度支持当前 FIT 顺序${rangesOverlap === true ? '，但两人的 90% 表现区间仍有重叠' : ''}。${bootstrapClause}`
  if (status === 'SENSITIVE') return `${leader.identity.displayName} 当前领先 ${lead} 个 FIT，但证据下限（${evidenceFloor}%）或顺位稳定度（${stabilityFloor}%）使这一顺序仍需谨慎复核。${bootstrapClause}`
  return `在“${scenarioCopy.label}”侧重下，${leader.identity.displayName} 领先 ${alternate.identity.displayName} ${lead} 个 FIT；差距足以形成顺序，但还不足以忽略俱乐部的具体需求。${bootstrapClause}`
}

function getManagerDecisionLensRows(players, t, copy) {
  const specifications = [
    {
      id: 'ready',
      label: copy.snapshotReady,
      meta: copy.snapshotReadyMeta,
      threshold: 4,
      value: player => player.performanceSignals.deploymentProfile?.baselineReliability
    },
    {
      id: 'ceiling',
      label: copy.snapshotCeiling,
      meta: copy.snapshotCeilingMeta,
      threshold: 5,
      value: player => player.performanceSignals.opponentStrength?.performanceEnvelope?.ceilingPercentile
    },
    {
      id: 'evidence',
      label: copy.snapshotEvidence,
      meta: copy.snapshotEvidenceMeta,
      threshold: 5,
      value: player => Math.min(
        Number(player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct) || 0,
        Number(player.selection.preferenceSensitivity?.relevantPct) || 0
      )
    }
  ]

  return specifications.map(specification => {
    const ranked = players
      .map(player => ({ player, value: getComparisonValue(specification, player) }))
      .sort((a, b) => b.value - a.value)
    const lead = Number((ranked[0].value - ranked[1].value).toFixed(1))
    return {
      ...specification,
      ranked,
      leaders: ranked.filter(row => row.value === ranked[0].value),
      lead,
      close: lead <= specification.threshold,
      scale: specification.id === 'ceiling' ? t.competitiveCeiling : copy.snapshotScale
    }
  })
}

function ManagerComparisonSnapshot({ players, locale, scenario, pairwiseBootstrap, getPlayerHref, returnTo }) {
  const t = getCopy(locale)
  const copy = getManagerComparisonCopy(locale)
  if (players.length < 2) return null

  const confidence = getComparisonDecisionConfidence(players, scenario, pairwiseBootstrap)
  const { leader, alternate, lead, evidenceFloor, stabilityFloor, bootstrap, status } = confidence
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const leaderFit = getComparisonFitScore(leader, scenario)
  const alternateFit = getComparisonFitScore(alternate, scenario)
  const narrative = getComparisonDecisionNarrative(confidence, scenarioCopy, locale)
  const statusLabel = status === 'CLEAR' ? copy.clear : status === 'SENSITIVE' ? copy.sensitive : copy.conditional
  const lenses = getManagerDecisionLensRows(players, t, copy)

  return (
    <section className={styles.managerComparisonSnapshot} data-decision-status={status} style={{ '--decision-color': getComparisonColor(leader) }} aria-labelledby="manager-snapshot-title">
      <header className={styles.managerSnapshotHeader}>
        <div>
          <span>{copy.snapshotEyebrow}</span>
          <h3 id="manager-snapshot-title">{copy.snapshotTitle}</h3>
          <p>{copy.snapshotMeta}</p>
        </div>
        <article className={styles.managerSnapshotPriority}>
          <span>{copy.snapshotPriority} · {scenarioCopy.label}</span>
          <div><strong>{leader.identity.displayName}</strong><b>{leaderFit}<small>FIT</small></b></div>
          <em>{statusLabel}</em>
        </article>
      </header>

      <div className={styles.managerSnapshotRead}>
        <div>
          <p>{narrative}</p>
          <span>{copy.snapshotRunner} · <strong>{alternate.identity.displayName}</strong> {alternateFit} FIT · −{lead}</span>
          <small>{copy.evidenceFloor} {evidenceFloor}% · {copy.stabilityFloor} {stabilityFloor}%{bootstrap ? ` · ${copy.bootstrapWin} ${bootstrap.probabilityPct}%` : ''}</small>
        </div>
        <nav>
          <Link
            to={getPlayerHref(leader.playerId)}
            state={{ returnTo }}
            onPointerEnter={() => preloadScoutingPlayer(leader.playerId)}
            onFocus={() => preloadScoutingPlayer(leader.playerId)}
          >{copy.snapshotDossier}<b aria-hidden="true">↗</b></Link>
          <a href="#manager-comparison-evidence">{copy.snapshotEvidenceLink}<b aria-hidden="true">↓</b></a>
        </nav>
      </div>

      <div className={styles.managerSnapshotLenses}>
        {lenses.map((lens, index) => {
          const winner = lens.ranked[0]
          const winnerLabel = lens.leaders.map(row => row.player.identity.displayName).join(' / ')
          return (
            <article key={lens.id} style={{ '--lens-color': getComparisonColor(winner.player) }}>
              <header><span>{String(index + 2).padStart(2, '0')}</span><div><strong>{lens.label}</strong><small>{lens.meta}</small></div></header>
              <div className={styles.managerSnapshotWinner}><strong title={winnerLabel}>{winnerLabel}</strong><b>{formatComparisonValue(winner.value)}<small>/100</small></b></div>
              <div className={styles.managerSnapshotBars} aria-label={`${lens.label} · ${lens.ranked.map(row => `${row.player.identity.displayName} ${formatComparisonValue(row.value)}`).join(' · ')}`}>
                {lens.ranked.map(row => (
                  <div key={row.player.playerId} style={{ '--compare-player-color': getComparisonColor(row.player) }}>
                    <span><i />{row.player.identity.displayName}</span>
                    <em><i style={{ width: `${Math.max(3, Math.min(100, row.value))}%` }} /></em>
                    <b>{formatComparisonValue(row.value)}</b>
                  </div>
                ))}
              </div>
              <footer data-close={lens.close ? 'true' : 'false'}><span>{lens.close ? copy.snapshotClose(lens.lead) : copy.snapshotLead(lens.lead)}</span><small>{lens.scale}</small></footer>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ComparisonDecisionBrief({ players, locale, stage, scenario = 'BALANCED', pairwiseBootstrap, metrics: providedMetrics }) {
  const t = getCopy(locale)
  const copy = getManagerComparisonCopy(locale)
  if (players.length < 2) return <p className={styles.comparisonNeedTwo}>{t.comparisonNeedTwo}</p>

  const confidence = getComparisonDecisionConfidence(players, scenario, pairwiseBootstrap)
  const { leader, alternate, lead, evidenceFloor, stabilityFloor, rangesOverlap, bootstrap, status } = confidence
  const leaderFit = getComparisonFitScore(leader, scenario)
  const alternateFit = getComparisonFitScore(alternate, scenario)
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const metrics = providedMetrics || getComparisonMetrics(t, stage)
  const largestEdge = metrics
    .map(metric => ({
      ...metric,
      leaderValue: getComparisonValue(metric, leader),
      alternateValue: getComparisonValue(metric, alternate)
    }))
    .sort((a, b) => Math.abs(b.leaderValue - b.alternateValue) - Math.abs(a.leaderValue - a.alternateValue))[0]
  const narrative = getComparisonDecisionNarrative(confidence, scenarioCopy, locale)
  const statusLabel = status === 'CLEAR' ? copy.clear : status === 'SENSITIVE' ? copy.sensitive : copy.conditional

  return (
    <section className={styles.comparisonDecisionBrief} data-decision-status={status} style={{ '--decision-color': getComparisonColor(leader) }}>
      <div className={styles.comparisonDecisionLead}>
        <span>DECISION READ · {scenarioCopy.label}<b>{statusLabel}</b></span>
        <div><h3>{leader.identity.displayName}</h3><strong>{leaderFit}<small>FIT</small></strong></div>
        <p>{narrative}</p>
      </div>
      <div className={styles.comparisonDecisionStats}>
        <article><span>{t.comparisonLeader}</span><strong>{leader.identity.displayName}</strong><small>{leaderFit} FIT · {t.emphasisRankShort} #{getScenarioFit(leader, scenario)?.rank ?? leader.highSampleSubroleRank}</small></article>
        <article><span>{t.comparisonAlternate}</span><strong>{alternate.identity.displayName}</strong><small>{alternateFit} FIT · −{lead}</small></article>
        <article><span>{t.comparisonLargestEdge}</span><strong>{largestEdge.label}</strong><small>{formatComparisonValue(largestEdge.leaderValue)} ↔ {formatComparisonValue(largestEdge.alternateValue)}</small></article>
        <article data-decision-status={status}><span>{copy.gapConfidence}</span><strong>{statusLabel}</strong><small>{copy.evidenceFloor} {evidenceFloor}% · {copy.stabilityFloor} {stabilityFloor}% · {rangesOverlap === null ? '—' : rangesOverlap ? copy.intervalOverlap : copy.intervalSeparated}</small>{bootstrap ? <em>{copy.bootstrapWin} {bootstrap.probabilityPct}% · Δ90% [{bootstrap.deltaLow90}, {bootstrap.deltaHigh90}] · {bootstrap.trials.toLocaleString()} {copy.bootstrapMeta}</em> : null}</article>
      </div>
    </section>
  )
}

function ComparisonDeploymentRead({ players, locale, scenario = 'BALANCED' }) {
  const t = getCopy(locale)
  if (players.length < 2) return null

  return (
    <article className={styles.comparisonDeploymentRead}>
      <header><span>DEPLOYMENT ROUTES</span><h3>{t.comparisonDeploymentRead}</h3><p>{t.comparisonDeploymentReadMeta}</p></header>
      <div>
        {players.map(player => {
          const playbook = player.performanceSignals.opponentStrength?.deploymentPlaybook
          const context = playbook?.recommendations?.primaryUse
          const fit = player.performanceSignals.recruitmentScenarios?.fits?.[scenario]?.score ?? player.selection.score
          return (
            <section key={player.playerId} style={{ '--compare-player-color': getComparisonColor(player) }}>
              <div className={styles.comparisonDeploymentIdentity}>
                {context ? <HeroIcon hero={context.hero} role={player.role} locale={locale} /> : null}
                <span><strong>{player.identity.displayName}</strong><small>{fit} FIT · {getCandidateStatusLabel(player, locale)}</small></span>
              </div>
              {context ? <>
                <p><b>{formatOwHeroName(context.hero, locale)}</b><span>{getMapTypeLabel(context.mapType, locale)}</span></p>
                <footer><span><strong>{context.retentionPct}%</strong><small>{t.contextRetention}</small></span><span><strong>{context.confidencePct}%</strong><small>{t.contextConfidence}</small></span></footer>
              </> : <p className={styles.playbookNoContext}>{t.insufficientDeploymentContext}</p>}
            </section>
          )
        })}
      </div>
    </article>
  )
}

function ComparisonFingerprint({ players, locale, stage, metrics: providedMetrics, eyebrow = '01 · METRIC COMPARISON', title, meta }) {
  const t = getCopy(locale)
  if (!players.length) return null
  const metrics = providedMetrics || getComparisonMetrics(t, stage)

  return (
    <article className={styles.comparisonProfilePanel}>
      <header><span>{eyebrow}</span><h3>{title || t.comparisonProfile}</h3><p>{meta || t.comparisonProfileMeta}</p></header>
      <div className={styles.comparisonProfileBody}>
        <div className={styles.comparisonPlayerLegend}>
          {players.map(player => <span key={player.playerId} style={{ '--compare-player-color': getComparisonColor(player) }}><i />{player.identity.displayName}</span>)}
        </div>
        <div className={styles.comparisonMetricMatrix}>
          {metrics.map(metric => (
            <div key={metric.id} className={styles.comparisonMetricRow}>
              <span>{metric.label}<small>{getPercentileScaleLabel(locale)}</small></span>
              <div className={styles.comparisonMetricRail} aria-label={players.map(player => `${player.identity.displayName} ${formatComparisonValue(getComparisonValue(metric, player))}`).join(', ')}>
                <i aria-hidden="true" />
                {players.map(player => {
                  const value = getComparisonValue(metric, player)
                  return <b key={player.playerId} style={{ '--compare-player-color': getComparisonColor(player), left: `${Math.max(1, Math.min(99, value))}%` }} title={`${player.identity.displayName} · ${formatComparisonValue(value)}`} />
                })}
              </div>
              <div className={styles.comparisonMetricValues}>
                {players.map(player => (
                  <span key={player.playerId} style={{ '--compare-player-color': getComparisonColor(player) }}>
                    <i /><b>{player.identity.displayName}</b><strong>{formatComparisonValue(getComparisonValue(metric, player))}</strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function ComparisonModelAudit({ players, locale }) {
  const t = getCopy(locale)
  if (!players.length) return null

  const buildDenseRanks = valueForPlayer => new Map(players.map(player => {
    const value = Number(valueForPlayer(player)) || 0
    const rank = 1 + new Set(players
      .map(valueForPlayer)
      .map(Number)
      .filter(peerValue => Number.isFinite(peerValue) && peerValue > value)).size
    return [player.playerId, rank]
  }))
  const rawRanks = buildDenseRanks(player => player.performanceSignals.opponentStrength?.rawPercentile)
  const adjustedRanks = buildDenseRanks(player => player.performanceSignals.opponentStrength?.adjustedPercentile)
  const rerankedCount = players.filter(player => rawRanks.get(player.playerId) !== adjustedRanks.get(player.playerId)).length
  const averageEvidence = Math.round(averageSignal(players.map(player => player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct)))
  const stabilityFloor = Math.min(...players.map(player => Number(player.selection.preferenceSensitivity?.relevantPct) || 0))
  const selectedOrder = [...players].sort((a, b) => b.selection.score - a.selection.score)
  const leaderRange = selectedOrder[0]?.performanceSignals.opponentStrength?.performanceEnvelope
  const alternateRange = selectedOrder[1]?.performanceSignals.opponentStrength?.performanceEnvelope
  const rangesOverlap = Boolean(
    leaderRange && alternateRange &&
    leaderRange.rangeLow90 <= alternateRange.rangeHigh90 &&
    alternateRange.rangeLow90 <= leaderRange.rangeHigh90
  )
  const rangeValues = players.flatMap(player => {
    const envelope = player.performanceSignals.opponentStrength?.performanceEnvelope
    return [Number(envelope?.rangeLow90), Number(envelope?.rangeHigh90)].filter(Number.isFinite)
  })
  const domainLow = Math.floor((rangeValues.length ? Math.min(...rangeValues) : 0) - 2)
  const domainHigh = Math.ceil((rangeValues.length ? Math.max(...rangeValues) : 100) + 2)
  const domainSpan = Math.max(1, domainHigh - domainLow)
  const rangePosition = value => `${Math.max(0, Math.min(100, ((Number(value) - domainLow) / domainSpan) * 100))}%`
  const percentilePosition = value => Math.max(1, Math.min(99, Number(value) || 0))

  return (
    <article className={styles.comparisonAuditPanel}>
      <header><span>02 · MODEL AUDIT</span><h3>{t.comparisonModelAudit}</h3><p>{t.comparisonModelAuditMeta}</p></header>
      <div className={styles.comparisonAuditKpis}>
        <div><span>{t.evidenceQuality}</span><strong>{averageEvidence}%</strong><small>{players.length} {t.player}</small></div>
        <div><span>{t.comparisonReranked}</span><strong>{rerankedCount}/{players.length}</strong><small>{t.rawContextScore} → {t.adjustedContextScore}</small></div>
        <div><span>{t.comparisonIntervalStatus}</span><strong>{players.length < 2 ? '—' : rangesOverlap ? t.comparisonIntervalOverlap : t.comparisonIntervalSeparated}</strong><small>90% · {t.modelRange}</small></div>
        <div><span>{t.selectionStability}</span><strong>{stabilityFloor}%</strong><small>{t.preferenceSensitivity}</small></div>
      </div>
      <section className={styles.comparisonAdjustmentBoard}>
        <div className={styles.comparisonAuditSubhead}><strong>{t.rawContextScore} → {t.adjustedContextScore}</strong><small>{getPercentileScaleTicks(locale)}</small></div>
        {players.map(player => {
          const signals = player.performanceSignals.opponentStrength
          const raw = Number(signals?.rawPercentile) || 0
          const adjusted = Number(signals?.adjustedPercentile) || 0
          const start = Math.min(raw, adjusted)
          const width = Math.abs(adjusted - raw)
          return (
            <div key={player.playerId} className={styles.comparisonAdjustmentRow} style={{ '--compare-player-color': getComparisonColor(player) }}>
              <div><strong>{player.identity.displayName}</strong><small>{t.opponentStrength} {formatPercentileShort(signals?.schedulePercentile, locale)}</small></div>
              <div className={styles.comparisonShiftRail} aria-label={`${player.identity.displayName}: ${formatPercentileRead(raw, locale)} to ${formatPercentileRead(adjusted, locale)}`}>
                <i />
                <em style={{ left: `${start}%`, width: `${width}%` }} />
                <span style={{ left: `${percentilePosition(raw)}%` }} title={`${t.rawContextScore} ${formatPercentileRead(raw, locale)}`} />
                <b style={{ left: `${percentilePosition(adjusted)}%` }} title={`${t.adjustedContextScore} ${formatPercentileRead(adjusted, locale)}`} />
              </div>
              <strong>{adjusted - raw > 0 ? '+' : ''}{adjusted - raw}<small>{getPercentilePointUnit(locale)}</small></strong>
            </div>
          )
        })}
      </section>
      <section className={styles.comparisonIntervalBoard}>
        <div className={styles.comparisonAuditSubhead}><strong>{t.modelRange}</strong><small>{domainLow}–{domainHigh} · {t.adjustedContextScore}</small></div>
        {players.map(player => {
          const envelope = player.performanceSignals.opponentStrength?.performanceEnvelope
          const low = Number(envelope?.rangeLow90)
          const high = Number(envelope?.rangeHigh90)
          const mean = Number(envelope?.mean)
          const hasRange = [low, high, mean].every(Number.isFinite)
          return (
            <div key={player.playerId} className={styles.comparisonIntervalRow} style={{ '--compare-player-color': getComparisonColor(player) }}>
              <strong>{player.identity.displayName}</strong>
              <div aria-label={hasRange ? `${player.identity.displayName}: ${low} to ${high}` : `${player.identity.displayName}: —`}>
                {hasRange ? <><i style={{ left: rangePosition(low), width: `${((high - low) / domainSpan) * 100}%` }} /><b style={{ left: rangePosition(mean) }} /></> : null}
              </div>
              <small>{hasRange ? `${low}–${high}` : '—'}</small>
            </div>
          )
        })}
      </section>
    </article>
  )
}

function ComparisonInsights({ players, locale, stage }) {
  const t = getCopy(locale)
  if (players.length < 2) return null

  const metrics = stage === 'playoffs'
    ? [
        { id: 'selection', label: t.selectionScore, threshold: 3, value: player => player.selection.score },
        { id: 'playoffs', label: t.playoffsView, threshold: 5, value: player => player.performanceSignals.stageValidation?.eligible ? player.performanceSignals.stageValidation.playoffPerformancePercentile : null },
        { id: 'stage', label: t.stageValidation, threshold: 5, value: player => player.performanceSignals.stageValidation?.percentile },
        { id: 'stability', label: t.selectionStability, threshold: 5, suffix: '%', value: player => player.selection.preferenceSensitivity?.relevantPct }
      ]
    : [
        { id: 'selection', label: t.selectionScore, threshold: 3, value: player => player.selection.score },
        { id: 'baseline', label: t.baselineReliability, threshold: 5, value: player => player.performanceSignals.deploymentProfile?.baselineReliability },
        { id: 'pressure', label: t.pressureReadiness, threshold: 5, value: player => player.performanceSignals.deploymentProfile?.pressureReadiness },
        { id: 'portability', label: t.contextPortability, threshold: 5, value: player => player.performanceSignals.deploymentProfile?.contextPortability },
        { id: 'stability', label: t.selectionStability, threshold: 5, suffix: '%', value: player => player.selection.preferenceSensitivity?.relevantPct }
      ]

  const insights = metrics.map(metric => {
    const rows = players
      .map(player => {
        const rawValue = metric.value(player)
        return { player, value: rawValue === null || rawValue === undefined ? Number.NaN : Number(rawValue) }
      })
      .filter(row => Number.isFinite(row.value))
      .sort((a, b) => b.value - a.value)
    if (rows.length < 2) return null
    const lead = Number((rows[0].value - rows[1].value).toFixed(1))
    const similar = lead <= metric.threshold
    const values = rows.map(row => `${row.player.identity.displayName} ${metric.prefix || ''}${row.value}${metric.suffix || ''}`).join(' · ')
    let read
    if (similar) {
      if (locale === 'en-US') read = `The top two are separated by ${lead}${metric.suffix || ''}; this metric does not produce a clear single-player lead.`
      else if (locale === 'ko-KR') read = `상위 두 선수의 차이는 ${lead}${metric.suffix || ''}로 이 지표에서는 한 명의 명확한 우위가 없습니다.`
      else read = `前两位差距 ${lead}${metric.suffix || ''}，本项不形成明确的单人领先。`
    } else if (locale === 'en-US') read = `${rows[0].player.identity.displayName} leads the next player by ${lead}${metric.suffix || ''}.`
    else if (locale === 'ko-KR') read = `${rows[0].player.identity.displayName}이(가) 다음 선수보다 ${lead}${metric.suffix || ''} 앞섭니다.`
    else read = `${rows[0].player.identity.displayName} 领先次位 ${lead}${metric.suffix || ''}。`

    return { ...metric, similar, values, read }
  }).filter(Boolean)

  return (
    <div className={styles.comparisonInsights} aria-label={t.comparisonRead}>
      {insights.map(insight => (
        <article key={insight.id} className={insight.similar ? styles.insightSimilar : styles.insightLead}>
          <span>{insight.label}</span>
          <strong>{insight.similar ? t.similarBand : t.clearModelLead}</strong>
          <p>{insight.read}</p>
          <small>{insight.values}</small>
        </article>
      ))}
    </div>
  )
}

function getManagerComparisonMetrics(t, scenario) {
  return [
    { id: 'fit', label: t.scenarioFitScore, value: player => getComparisonFitScore(player, scenario) },
    { id: 'baseline', label: t.baselineReliability, value: player => player.performanceSignals.deploymentProfile?.baselineReliability },
    { id: 'pressure', label: t.pressureReadiness, value: player => player.performanceSignals.deploymentProfile?.pressureReadiness },
    { id: 'portability', label: t.contextPortability, value: player => player.performanceSignals.deploymentProfile?.contextPortability },
    { id: 'strong', label: t.strongOpponentTest, value: player => player.performanceSignals.opponentStrength?.pressureTest?.percentile },
    { id: 'evidence', label: t.evidenceQuality, value: player => player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct }
  ]
}

function getComparisonFactorLabel(factor, t) {
  const labels = {
    selectionScore: t.selectionScore,
    baselineReliability: t.baselineReliability,
    pressureReadiness: t.pressureReadiness,
    contextPortability: t.contextPortability,
    evidenceConfidence: t.evidenceConfidence,
    selectionStability: t.selectionStability
  }
  return labels[factor] || factor
}

function getComparisonFactorRows(model, players, subrole, scenario, t) {
  const confidence = getComparisonDecisionConfidence(players, scenario, model.pairwiseBootstrap || model.pairwiseComparisons)
  if (!confidence) return null
  const fallbackWeights = {
    selectionScore: 0.25,
    baselineReliability: 0.25,
    pressureReadiness: 0.2,
    contextPortability: 0.15,
    evidenceConfidence: 0.1,
    selectionStability: 0.05
  }
  const weights = model.recruitmentScenarioWeights?.[subrole]?.[scenario] || fallbackWeights
  const inputsForPlayer = player => player.performanceSignals.recruitmentScenarios?.inputs || {
    selectionScore: Number(player.selection.score) || 50,
    baselineReliability: Number(player.performanceSignals.deploymentProfile?.baselineReliability) || 50,
    pressureReadiness: Number(player.performanceSignals.deploymentProfile?.pressureReadiness) || 50,
    contextPortability: Number(player.performanceSignals.deploymentProfile?.contextPortability) || 50,
    evidenceConfidence: Number(player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct) || 50,
    selectionStability: Number(player.selection.preferenceSensitivity?.relevantPct) || 50
  }
  const leaderInputs = inputsForPlayer(confidence.leader)
  const alternateInputs = inputsForPlayer(confidence.alternate)
  const rows = Object.entries(weights).map(([factor, weight]) => {
    const leaderValue = Number(leaderInputs[factor]) || 0
    const alternateValue = Number(alternateInputs[factor]) || 0
    const delta = Number(((leaderValue - alternateValue) * Number(weight)).toFixed(1))
    return {
      factor,
      label: getComparisonFactorLabel(factor, t),
      weight: Number(weight),
      leaderValue,
      alternateValue,
      delta
    }
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const maximum = Math.max(1, ...rows.map(row => Math.abs(row.delta)))
  return { ...confidence, rows, maximum }
}

function ManagerFactorDelta({ model, players, subrole, scenario, locale }) {
  const t = getCopy(locale)
  const copy = getManagerComparisonCopy(locale)
  const comparison = getComparisonFactorRows(model, players, subrole, scenario, t)
  if (!comparison) return null

  return (
    <article className={styles.managerFactorBoard}>
      <header>
        <div>
          <span>02 · WEIGHTED FIT DELTA</span><h3>{copy.factorTitle}</h3><p>{copy.factorMeta}</p>
          <div className={styles.managerFactorLegend}>
            <b data-side="leader"><i />{comparison.leader.identity.displayName}</b>
            <b data-side="alternate"><i />{comparison.alternate.identity.displayName}</b>
            <small>← {comparison.alternate.identity.displayName} · 0 · {comparison.leader.identity.displayName} →</small>
          </div>
        </div>
        <strong><small>{copy.factorTotal}</small>{comparison.lead}<b>FIT</b></strong>
      </header>
      <div className={styles.managerFactorRows}>
        {comparison.rows.map(row => {
          const direction = row.delta > 0 ? 'leader' : row.delta < 0 ? 'alternate' : 'even'
          const edgePlayer = row.delta >= 0 ? comparison.leader : comparison.alternate
          const width = `${Math.max(row.delta === 0 ? 0 : 4, (Math.abs(row.delta) / comparison.maximum) * 46)}%`
          return (
            <div key={row.factor} className={styles.managerFactorRow}>
              <span><strong>{row.label}</strong><small>{comparison.leader.identity.displayName} {formatComparisonValue(row.leaderValue)} ↔ {comparison.alternate.identity.displayName} {formatComparisonValue(row.alternateValue)} · {Math.round(row.weight * 100)}%</small></span>
              <div className={styles.managerFactorRail} aria-label={`${row.label}: ${row.delta > 0 ? comparison.leader.identity.displayName : comparison.alternate.identity.displayName} ${Math.abs(row.delta)} FIT`}>
                <i aria-hidden="true" />
                <em data-direction={direction} style={{ width }} />
              </div>
              <b data-direction={direction}>{row.delta === 0 ? '±0' : `${edgePlayer.identity.displayName} +${Math.abs(row.delta)}`}</b>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function ManagerScenarioChoices({ players, locale, activeScenario, onScenarioChange, getPlayerHref, returnTo }) {
  const t = getCopy(locale)
  const copy = getManagerComparisonCopy(locale)
  if (players.length < 2) return null

  return (
    <section className={styles.managerScenarioChoices}>
      <header><span>03 · REQUIREMENT ROUTES</span><h3>{copy.routesTitle}</h3><p>{copy.routesMeta}</p></header>
      <div>
        {RECRUITMENT_SCENARIO_ORDER.map((scenario, index) => {
          const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
          const ranked = [...players].sort((a, b) => getComparisonFitScore(b, scenario) - getComparisonFitScore(a, scenario))
          const leader = ranked[0]
          const alternate = ranked[1]
          const lead = Number((getComparisonFitScore(leader, scenario) - getComparisonFitScore(alternate, scenario)).toFixed(1))
          const joint = lead <= 2
          return (
            <article key={scenario} data-active={scenario === activeScenario}>
              <button type="button" aria-pressed={scenario === activeScenario} onClick={() => onScenarioChange(scenario)}>
                <span>{String(index + 1).padStart(2, '0')} · {scenarioCopy.label}</span>
                <div><strong>{joint ? `${leader.identity.displayName} / ${alternate.identity.displayName}` : leader.identity.displayName}</strong><b>{getComparisonFitScore(leader, scenario)}<small>FIT</small></b></div>
                <p>{joint ? copy.jointReview : `${t.marketTopGap} +${lead}`}</p>
              </button>
              <Link
                to={getPlayerHref(leader.playerId)}
                state={{ returnTo }}
                onPointerEnter={() => preloadScoutingPlayer(leader.playerId)}
                onFocus={() => preloadScoutingPlayer(leader.playerId)}
              >{copy.dossier}<b aria-hidden="true">↗</b></Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ManagerComparisonWorkbench({ model, locale, subrole, scenario, selectedPlayerIds = [], onSelectionChange, onScenarioChange, getPlayerHref, returnTo }) {
  const t = getCopy(locale)
  const copy = getManagerComparisonCopy(locale)
  const pickerCopy = getComparisonPickerCopy(locale)
  const [pickerFeedback, setPickerFeedback] = useState({ subrole: '', message: '' })
  const candidates = getScenarioRolePlayers(model, subrole, scenario)
  const requestedIds = selectedPlayerIds.filter(playerId => candidates.some(player => player.playerId === playerId)).slice(0, 3)
  const selectedIds = requestedIds.length >= 2 ? requestedIds : candidates.slice(0, 3).map(player => player.playerId)
  const selectedPlayers = candidates.filter(player => selectedIds.includes(player.playerId))
  const metrics = getManagerComparisonMetrics(t, scenario)
  const feedbackMessage = pickerFeedback.subrole === subrole ? pickerFeedback.message : ''
  const pickerStatusId = 'manager-comparison-picker-status'

  const togglePlayer = player => {
    const selected = selectedIds.includes(player.playerId)
    if (selected && selectedIds.length <= 2) {
      setPickerFeedback({ subrole, message: pickerCopy.minimumReached })
      return
    }
    if (!selected && selectedIds.length >= 3) {
      setPickerFeedback({ subrole, message: pickerCopy.limitReached })
      return
    }
    const next = selected
      ? selectedIds.filter(id => id !== player.playerId)
      : [...selectedIds, player.playerId]
    onSelectionChange(next)
    setPickerFeedback({ subrole, message: selected ? pickerCopy.removed(player.identity.displayName, next.length) : pickerCopy.added(player.identity.displayName, next.length) })
  }

  return (
    <section id="position-comparison" className={`${styles.comparisonSection} ${styles.managerComparisonSection} ${styles.anchorSection}`} style={{ '--slot-color': SUBROLE_COLORS[subrole] }} aria-labelledby="manager-comparison-title">
      <div className={styles.sectionHeading}>
        <div><span>{copy.eyebrow}</span><h2 id="manager-comparison-title">{copy.title}</h2><p>{copy.meta}</p></div>
        <button type="button" className={styles.managerComparisonPrintButton} onClick={() => window.print()}>{copy.print}</button>
      </div>

      <ManagerComparisonSnapshot
        players={selectedPlayers}
        locale={locale}
        scenario={scenario}
        pairwiseBootstrap={model.pairwiseBootstrap || model.pairwiseComparisons}
        getPlayerHref={getPlayerHref}
        returnTo={returnTo}
      />

      <div className={`${styles.comparePicker} ${styles.managerComparePicker}`}>
        <div className={styles.comparePlayers}>
          <span>{copy.picker}</span>
          <div className={styles.comparePlayerOptions}>
            {candidates.map(player => {
              const selected = selectedIds.includes(player.playerId)
              const blocked = selected ? selectedIds.length <= 2 ? 'minimum' : '' : selectedIds.length >= 3 ? 'limit' : ''
              return (
                <button
                  key={player.playerId}
                  type="button"
                  className={selected ? styles.comparePlayerActive : ''}
                  style={{ '--compare-player-color': getComparisonColor(player) }}
                  aria-pressed={selected}
                  aria-describedby={pickerStatusId}
                  data-blocked={blocked || undefined}
                  onClick={() => togglePlayer(player)}
                >
                  <i aria-hidden="true" /><b>{player.identity.displayName}</b><small title={t.shortlistRank}>{t.emphasisRankShort} #{getScenarioFit(player, scenario)?.rank || player.highSampleSubroleRank}</small>
                </button>
              )
            })}
          </div>
          <small>{selectedIds.length} / 3 {copy.selected}</small>
          <div id={pickerStatusId} className={styles.comparePickerFeedback} data-state={selectedIds.length >= 3 ? 'full' : 'ready'} role="status" aria-live="polite">
            <strong>{selectedIds.length >= 3 ? pickerCopy.full : pickerCopy.ready(3 - selectedIds.length)}</strong>
            <span>{feedbackMessage || (selectedIds.length >= 3 ? pickerCopy.fullHelp : pickerCopy.help)}</span>
          </div>
        </div>
        <nav className={styles.managerSelectedDossiers} aria-label={copy.dossier}>
          {selectedPlayers.map(player => (
            <Link key={player.playerId} to={getPlayerHref(player.playerId)} state={{ returnTo }} onPointerEnter={() => preloadScoutingPlayer(player.playerId)} onFocus={() => preloadScoutingPlayer(player.playerId)}>
              <span style={{ '--compare-player-color': getComparisonColor(player) }}><i />{player.identity.displayName}</span><b>{copy.dossier} ↗</b>
            </Link>
          ))}
        </nav>
      </div>

      <div id="manager-comparison-evidence" className={`${styles.managerComparisonVisualGrid} ${styles.anchorSection}`}>
        <ComparisonFingerprint players={selectedPlayers} locale={locale} stage="season" metrics={metrics} eyebrow="01 · DIRECT COMPARISON" title={copy.axisTitle} meta={copy.axisMeta} />
        <ManagerFactorDelta model={model} players={selectedPlayers} subrole={subrole} scenario={scenario} locale={locale} />
      </div>
      <ManagerScenarioChoices players={selectedPlayers} locale={locale} activeScenario={scenario} onScenarioChange={onScenarioChange} getPlayerHref={getPlayerHref} returnTo={returnTo} />
      <footer className={styles.managerComparisonBoundary}><span>TECHNICAL DECISION BOUNDARY</span><p>{copy.boundary}</p></footer>
    </section>
  )
}

function ComparisonTable({ players, locale, initialSubrole = 'TANK', selectedPlayerIds = [], onSubroleChange, onSelectionChange, getPlayerHref, returnTo, stage = 'season', scenario = 'BALANCED', id }) {
  const t = getCopy(locale)
  const pickerCopy = getComparisonPickerCopy(locale)
  const [pickerFeedback, setPickerFeedback] = useState('')
  const subrole = SUBROLE_ORDER.includes(initialSubrole) ? initialSubrole : 'TANK'
  const candidates = players.filter(player => player.subrole === subrole)
  const scenarioCandidates = [...candidates].sort((a, b) => (
    (b.performanceSignals.recruitmentScenarios?.fits?.[scenario]?.score ?? b.selection.score) -
    (a.performanceSignals.recruitmentScenarios?.fits?.[scenario]?.score ?? a.selection.score)
  ))
  const requestedIds = selectedPlayerIds.filter(playerId => candidates.some(player => player.playerId === playerId)).slice(0, 3)
  const selectedIds = requestedIds.length >= 2
    ? requestedIds
    : scenarioCandidates.slice(0, 3).map(player => player.playerId)
  const selectedPlayers = scenarioCandidates.filter(player => selectedIds.includes(player.playerId))
  const pickerStatusId = 'coach-comparison-picker-status'

  const chooseSubrole = nextSubrole => {
    onSubroleChange?.(nextSubrole)
  }

  const togglePlayer = player => {
    const selected = selectedIds.includes(player.playerId)
    if (selected && selectedIds.length <= 2) {
      setPickerFeedback(pickerCopy.minimumReached)
      return
    }
    if (!selected && selectedIds.length >= 3) {
      setPickerFeedback(pickerCopy.limitReached)
      return
    }
    const next = selected
      ? selectedIds.filter(id => id !== player.playerId)
      : [...selectedIds, player.playerId]
    onSelectionChange?.(next)
    setPickerFeedback(selected ? pickerCopy.removed(player.identity.displayName, next.length) : pickerCopy.added(player.identity.displayName, next.length))
  }

  return (
    <section id={id} className={`${styles.comparisonSection} ${id ? styles.anchorSection : ''}`}>
      <div className={styles.sectionHeading}><div><span>04 · COMPARISON</span><h2>{t.compare}</h2><p>{t.compareMeta}</p></div></div>
      <div className={styles.comparePicker}>
        <div className={styles.compareSubroles} aria-label={t.filterSubrole}>
          {SUBROLE_ORDER.map(item => (
            <button key={item} type="button" className={`${styles.subroleFilterButton} ${subrole === item ? styles.filterActive : ''}`} onClick={() => chooseSubrole(item)}>
              <SubroleButtonLabel subrole={item} locale={locale} />
            </button>
          ))}
        </div>
        <div className={styles.comparePlayers}>
          <span>{t.compareSelect}</span>
          <div className={styles.comparePlayerOptions}>
            {candidates.map(player => {
              const selected = selectedIds.includes(player.playerId)
              const blocked = selected ? selectedIds.length <= 2 ? 'minimum' : '' : selectedIds.length >= 3 ? 'limit' : ''
              return (
                <button
                  key={player.playerId}
                  type="button"
                  className={selected ? styles.comparePlayerActive : ''}
                  style={{ '--compare-player-color': getComparisonColor(player) }}
                  aria-pressed={selected}
                  aria-describedby={pickerStatusId}
                  data-blocked={blocked || undefined}
                  onClick={() => togglePlayer(player)}
                >
                  <i aria-hidden="true" />
                  <b>{player.identity.displayName}</b>
                  <small title={t.publicListOrder}>{t.publicListOrderShort} #{player.highSampleSubroleRank}</small>
                </button>
              )
            })}
          </div>
          <small>{t.selectedCountLabel} {selectedIds.length} / 3</small>
          <div id={pickerStatusId} className={styles.comparePickerFeedback} data-state={selectedIds.length >= 3 ? 'full' : 'ready'} role="status" aria-live="polite">
            <strong>{selectedIds.length >= 3 ? pickerCopy.full : pickerCopy.ready(3 - selectedIds.length)}</strong>
            <span>{pickerFeedback || (selectedIds.length >= 3 ? pickerCopy.fullHelp : pickerCopy.help)}</span>
          </div>
        </div>
      </div>
      <ComparisonDecisionBrief players={selectedPlayers} locale={locale} stage={stage} scenario={scenario} />
      <ComparisonDeploymentRead players={selectedPlayers} locale={locale} scenario={scenario} />
      <div className={styles.comparisonVisualGrid}>
        <ComparisonFingerprint players={selectedPlayers} locale={locale} stage={stage} />
        <ComparisonModelAudit players={selectedPlayers} locale={locale} />
      </div>
      <ComparisonInsights players={selectedPlayers} locale={locale} stage={stage} />
      <details className={styles.comparisonAuditTable}>
        <summary>
          <div><span>FULL AUDIT</span><strong>{t.comparisonAuditTable}</strong><small>{t.comparisonAuditTableMeta}</small></div>
          <b aria-hidden="true">+</b>
        </summary>
        <div className={styles.comparisonScroller}>
          <table>
          <thead>
            {stage === 'playoffs' ? (
              <tr><th>{t.player}</th><th>{t.subrole}</th><th>{t.playoffsView}</th><th>{t.stageDelta}</th><th>{t.stageConfidence}</th><th>{t.playoffMaps}</th><th>{t.selectionScore}</th><th>{t.selectionStability}</th><th>{t.rankingStressTest}</th><th>{t.roleRank}</th><th>{t.evidenceQuality}</th><th>{t.primaryHero}</th></tr>
            ) : (
              <tr><th>{t.player}</th><th>{t.subrole}</th><th>{t.selectionScore}</th><th>OVR</th><th>{t.selectionStability}</th><th>{t.rankingStressTest}</th><th>{t.baselineReliability}</th><th>{t.pressureReadiness}</th><th>{t.contextPortability}</th><th>{t.roleRank}</th><th>{t.opponentStrength}</th><th>{t.contextAdjusted}</th><th>{t.competitiveFloor}</th><th>{t.strongOpponentTest}</th><th>{t.evidenceQuality}</th><th>{t.stageValidation}</th><th>{t.sampleDepth}</th><th>{t.primaryHero}</th><th>{t.topStrength}</th><th>{t.watchpoint}</th></tr>
            )}
          </thead>
          <tbody>
            {selectedPlayers.map(player => (
              <tr key={player.playerId}>
                <td>
                  <Link
                    to={getPlayerHref(player.playerId)}
                    state={{ returnTo }}
                    onPointerEnter={() => preloadScoutingPlayer(player.playerId)}
                    onFocus={() => preloadScoutingPlayer(player.playerId)}
                  >
                    <strong>{player.identity.displayName}</strong>
                    <small>{player.identity.teamShort} · {getPlacementLabel(player.teamPlacement, locale)}</small>
                  </Link>
                </td>
                <td>{getSubroleLabel(player.subrole, locale)}<small>{getCandidateStatusLabel(player, locale)} · {t.subroleFit} {player.subroleProfile.primarySharePct}%</small></td>
                {stage === 'playoffs' ? (
                  <>
                    <td><b>{player.performanceSignals.stageValidation?.eligible ? formatPercentileShort(player.performanceSignals.stageValidation.playoffPerformancePercentile, locale) : '—'}</b></td>
                    <td>{player.performanceSignals.stageValidation?.eligible ? formatSignedPct(player.performanceSignals.stageValidation.adjustedDeltaPct) : '—'}</td>
                    <td>{player.performanceSignals.stageValidation?.confidencePct || 0}%</td>
                    <td>{player.performanceSignals.stageValidation?.playoffs?.maps || '—'}</td>
                    <td>{player.selection.score}</td>
                    <td>{player.selection.preferenceSensitivity?.relevantPct}% · {getStabilityLabel(player.selection.preferenceSensitivity?.status, locale)}</td>
                    <td>{getRobustnessLabel(player.selection.robustness?.status, t)} · R {player.selection.robustness?.worstRankDrop ? `−${player.selection.robustness.worstRankDrop}` : '±0'} · MODEL −{player.selection.robustness?.worstScoreDrop || 0}</td>
                    <td>{player.highSampleSubroleRank} / {player.highSampleSubroleTotal}</td>
                    <td>{player.performanceSignals.opponentStrength?.evidenceQuality?.grade} · {player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct}%</td>
                    <td>{formatOwHeroName(player.heroPool[0]?.hero, locale)}</td>
                  </>
                ) : (
                  <>
                    <td><b>{player.selection.score}</b></td>
                    <td>{player.summary.seasonOvr}</td>
                    <td>{player.selection.preferenceSensitivity?.relevantPct}% · {getStabilityLabel(player.selection.preferenceSensitivity?.status, locale)}</td>
                    <td>{getRobustnessLabel(player.selection.robustness?.status, t)} · R {player.selection.robustness?.worstRankDrop ? `−${player.selection.robustness.worstRankDrop}` : '±0'} · MODEL −{player.selection.robustness?.worstScoreDrop || 0}</td>
                    <td>{player.performanceSignals.deploymentProfile?.baselineReliability}</td>
                    <td>{player.performanceSignals.deploymentProfile?.pressureReadiness}</td>
                    <td>{player.performanceSignals.deploymentProfile?.contextPortability}</td>
                    <td>{player.highSampleSubroleRank} / {player.highSampleSubroleTotal}</td>
                    <td>{formatPercentileShort(player.performanceSignals.opponentStrength?.schedulePercentile, locale)}</td>
                    <td>{formatPercentileShort(player.performanceSignals.opponentStrength?.adjustedPercentile, locale)}</td>
                    <td>{formatPercentileShort(player.performanceSignals.opponentStrength?.performanceEnvelope?.floorPercentile, locale)}</td>
                    <td>{formatPercentileShort(player.performanceSignals.opponentStrength?.pressureTest?.percentile, locale)}</td>
                    <td>{player.performanceSignals.opponentStrength?.evidenceQuality?.grade} · {player.performanceSignals.opponentStrength?.evidenceQuality?.confidencePct}%</td>
                    <td>{formatPercentileShort(player.performanceSignals.stageValidation?.percentile, locale)}</td>
                    <td>{player.sampleDepth}</td>
                    <td>{formatOwHeroName(player.heroPool[0]?.hero, locale)}</td>
                    <td>{formatPercentileShort(player.strengths[0]?.percentile, locale)} {getMetricLabel(player.strengths[0]?.metricId, locale)}</td>
                    <td>{getRiskText(player.risks[0], locale)}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}

function getModelValidationCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'MODEL VALIDATION · NON-SCORING BACKTEST',
    title: 'Maintain the current formal weights',
    meta: 'Pairwise evidence broadly agrees with FIT, but chronological rank stability does not yet meet the threshold for adding these diagnostics to the formal model.',
    temporal: 'Temporal Top 3 retention',
    temporalMeta: 'Adjusted-performance rank · first half → second half',
    pairwise: 'FIT / bootstrap agreement',
    pairwiseMeta: 'Selected-pool pairs · 5,000 trials each',
    teamShare: 'Team-share correlation',
    teamShareMeta: 'Versus adjusted performance · diagnostic, not causation',
    weakest: 'Most mixed position',
    position: 'Position',
    time: 'Time holdout',
    pair: 'Pairwise agreement',
    shadow: 'Team-share ρ',
    belowGate: 'Below gate',
    singleGatePassed: 'Single gate passed',
    shadowOnly: 'Diagnostic only',
    reviewFirst: 'Review first',
    readKey: 'Bar = observed result · tick = promotion gate. ρ shows directional association, not causation.',
    gate: 'The inclusion threshold is not met: external replication is unavailable and temporal retention is below target. Candidate order and FIT weights remain unchanged.'
  }
  if (locale === 'ko-KR') return {
    eyebrow: 'MODEL VALIDATION · 비채점 백테스트',
    title: '현재 공식 가중치 유지',
    meta: '쌍별 근거는 FIT와 대체로 일치하지만 시간 순위 안정도는 진단 지표를 공식 모델에 포함할 기준에 아직 미치지 못합니다.',
    temporal: '시간 Top 3 유지율',
    temporalMeta: '보정 경기력 순위 · 전반부 → 후반부',
    pairwise: 'FIT / 부트스트랩 일치도',
    pairwiseMeta: '공개 후보 쌍 · 각 5,000회',
    teamShare: '팀 점유율 상관',
    teamShareMeta: '보정 경기력 대비 · 진단용, 인과 아님',
    weakest: '혼합도가 가장 큰 포지션',
    position: '포지션',
    time: '시간 홀드아웃',
    pair: '쌍별 일치도',
    shadow: '팀 점유율 ρ',
    belowGate: '기준 미달',
    singleGatePassed: '단일 기준 통과',
    shadowOnly: '진단 전용',
    reviewFirst: '우선 검토',
    readKey: '막대 = 관측 결과 · 눈금 = 편입 기준. ρ는 방향성 연관이며 인과가 아닙니다.',
    gate: '외부 재현 표본이 없고 시간 유지율도 목표 미달이므로 포함 기준을 충족하지 못했습니다. 후보 순위와 FIT 가중치는 변경하지 않습니다.'
  }
  return {
    eyebrow: 'MODEL VALIDATION · 非计分回测',
    title: '维持当前正式权重',
    meta: '两两证据与 FIT 整体方向基本一致，但时间顺位稳定度尚未达到将诊断指标纳入正式模型的门槛。',
    temporal: '时间 Top 3 保留率',
    temporalMeta: '校正表现顺位 · 前半程 → 后半程',
    pairwise: 'FIT / Bootstrap 一致度',
    pairwiseMeta: '公开候选两两比较 · 每组 5,000 次',
    teamShare: '队内占比相关性',
    teamShareMeta: '相对校正表现 · 仅诊断，不代表因果',
    weakest: '分歧最大位置',
    position: '位置',
    time: '时间留出',
    pair: '两两一致',
    shadow: '队内占比 ρ',
    belowGate: '未达门槛',
    singleGatePassed: '单项达标',
    shadowOnly: '仅作诊断',
    reviewFirst: '优先复核',
    readKey: '条形＝实际结果 · 刻度＝晋级门槛；ρ 只表示同向程度，不代表因果。',
    gate: '外部复现样本仍不可用，且时间保留率未达门槛；因此不改变候选顺位，也不调整 FIT 权重。'
  }
}

function ModelValidationBrief({ validation, locale }) {
  if (!validation) return null
  const copy = getModelValidationCopy(locale)
  const temporal = validation.temporal || {}
  const pairwise = validation.pairwise || {}
  const teamContribution = validation.teamContribution || {}
  const temporalTarget = validation.promotionGate?.temporalTopThreeRetentionTargetPct ?? 80
  const pairwiseTarget = validation.promotionGate?.pairwiseConcordanceTargetPct ?? 70
  const temporalPassed = temporal.averageTopThreeRetentionPct >= temporalTarget
  const pairwisePassed = pairwise.concordancePct >= pairwiseTarget
  const weakest = (pairwise.subroles || []).reduce((current, item) => (
    Number.isFinite(Number(item.concordancePct)) && (!current || item.concordancePct < current.concordancePct)
      ? item
      : current
  ), null)
  const roleRows = SUBROLE_ORDER.map(subrole => ({
    subrole,
    temporal: temporal.subroles?.find(item => item.subrole === subrole),
    pairwise: pairwise.subroles?.find(item => item.subrole === subrole),
    team: teamContribution.subroles?.find(item => item.subrole === subrole)
  }))

  return (
    <section className={styles.modelValidationBrief} data-verdict={validation.verdict} aria-label={copy.title}>
      <header>
        <div><span>{copy.eyebrow}</span><h3>{copy.title}</h3></div>
        <p>{copy.meta}</p>
      </header>
      <div className={styles.validationKpis}>
        <article data-status={temporal.status}>
          <div className={styles.validationKpiHeading}><span>{copy.temporal}</span><b data-state={temporalPassed ? 'passed' : 'review'}>{temporalPassed ? copy.singleGatePassed : copy.belowGate}</b></div>
          <strong>{temporal.averageTopThreeRetentionPct ?? '—'}%</strong>
          <small>{copy.temporalMeta}</small>
          <i aria-hidden="true"><em style={{ width: `${temporal.averageTopThreeRetentionPct || 0}%` }} /><b className={styles.validationGateMarker} style={{ left: `${temporalTarget}%` }} /></i>
        </article>
        <article data-status={pairwise.status}>
          <div className={styles.validationKpiHeading}><span>{copy.pairwise}</span><b data-state={pairwisePassed ? 'passed' : 'review'}>{pairwisePassed ? copy.singleGatePassed : copy.belowGate}</b></div>
          <strong>{pairwise.concordancePct ?? '—'}%</strong>
          <small>{copy.pairwiseMeta}</small>
          <i aria-hidden="true"><em style={{ width: `${pairwise.concordancePct || 0}%` }} /><b className={styles.validationGateMarker} style={{ left: `${pairwiseTarget}%` }} /></i>
        </article>
        <article><div className={styles.validationKpiHeading}><span>{copy.teamShare}</span><b data-state="shadow">{copy.shadowOnly}</b></div><strong>ρ {teamContribution.averageAdjustedPerformanceCorrelation ?? '—'}</strong><small>{copy.teamShareMeta}</small></article>
        <article><div className={styles.validationKpiHeading}><span>{copy.weakest}</span><b data-state="review">{copy.reviewFirst}</b></div><strong>{weakest ? getSubroleLabel(weakest.subrole, locale) : '—'}</strong><small>{weakest?.concordancePct ?? '—'}% · {copy.pair}</small></article>
      </div>
      <div className={styles.validationRoleMatrix}>
        <header><span>{copy.position}</span><span>{copy.time}</span><span>{copy.pair}</span><span>{copy.shadow}</span></header>
        {roleRows.map(row => (
          <div key={row.subrole}>
            <strong>{getSubroleLabel(row.subrole, locale)}</strong>
            <span><i aria-hidden="true"><em style={{ width: `${row.temporal?.topThreeRetentionPct || 0}%` }} /><b className={styles.validationGateMarker} style={{ left: `${temporalTarget}%` }} /></i><b>{row.temporal?.topThreeRetentionPct ?? '—'}%</b></span>
            <span><i aria-hidden="true"><em style={{ width: `${row.pairwise?.concordancePct || 0}%` }} /><b className={styles.validationGateMarker} style={{ left: `${pairwiseTarget}%` }} /></i><b>{row.pairwise?.concordancePct ?? '—'}%</b></span>
            <b>{Number.isFinite(Number(row.team?.adjustedPerformanceCorrelation)) ? `ρ ${row.team.adjustedPerformanceCorrelation}` : '—'}</b>
          </div>
        ))}
      </div>
      <footer><span>{copy.gate}</span><small>{copy.readKey}</small></footer>
    </section>
  )
}

function Methodology({ locale, id, validation }) {
  const t = getCopy(locale)
  return (
    <div id={id} className={`${styles.methodologyStack} ${id ? styles.anchorSection : ''}`}>
      <ModelValidationBrief validation={validation} locale={locale} />
      <section className={styles.methodology}>
        <div><span>06 · NOTES</span><h2>{t.methodology}</h2></div>
        <ol>{t.methodologyItems.map((item, index) => <li key={item}><b>{String(index + 1).padStart(2, '0')}</b><p>{item}</p></li>)}</ol>
      </section>
    </div>
  )
}

const DETAIL_SECTION_IDS = ['summary', 'professional-reference', 'context', 'profile', 'matches', 'method']

const DETAIL_EVIDENCE_SECTION = {
  'evidence-decision-profile': 'context',
  'evidence-strong-opponents': 'context',
  'evidence-role-metrics': 'profile',
  'evidence-recent-form': 'matches'
}

function getDossierNavigationCopy(locale) {
  if (locale === 'en-US') return {
    backOverview: 'Back to position overview',
    backRole: role => `Back to ${role} candidates`,
    currentRole: 'Current position',
    currentLens: 'Hiring priority',
    returnManager: 'Back to manager conclusion',
    roleSequence: 'Browse this position',
    previousInRole: 'Previous in position',
    nextInRole: 'Next in position'
  }
  if (locale === 'ko-KR') return {
    backOverview: '포지션 전체 보기로',
    backRole: role => `${role} 후보로 돌아가기`,
    currentRole: '현재 포지션',
    currentLens: '현재 선발 기준',
    returnManager: '매니저 결론으로 돌아가기',
    roleSequence: '같은 포지션 후보 탐색',
    previousInRole: '같은 포지션 이전 후보',
    nextInRole: '같은 포지션 다음 후보'
  }
  return {
    backOverview: '返回五位置总览',
    backRole: role => `返回${role}候选`,
    currentRole: '当前岗位',
    currentLens: '当前用人侧重',
    returnManager: '返回经理结论',
    roleSequence: '同位置候选浏览',
    previousInRole: '上一位同位置候选',
    nextInRole: '下一位同位置候选'
  }
}

function getDetailSectionItems(locale) {
  const t = getCopy(locale)
  return [
    ['summary', t.summaryNav],
    ['professional-reference', getProfessionalReferenceCopy(locale).managerTitle],
    ['context', t.contextNav],
    ['profile', t.profileNav],
    ['matches', t.matchesNav],
    ['method', t.methodNav]
  ]
}

function getSubroleFromHref(href) {
  const search = typeof href === 'string'
    ? href.includes('?') ? href.slice(href.indexOf('?')).split('#')[0] : ''
    : href?.search || ''
  const value = new URLSearchParams(search).get('role')
  return SUBROLE_ORDER.includes(value) ? value : null
}

function getSectionFromHash(hash) {
  const id = hash ? decodeURIComponent(hash.replace(/^#/, '')) : ''
  if (DETAIL_SECTION_IDS.includes(id)) return id
  return DETAIL_EVIDENCE_SECTION[id] || 'summary'
}

function useActiveDetailSection(enabled, hash, documentKey) {
  const [activeSection, setActiveSection] = useState(() => getSectionFromHash(hash))

  useEffect(() => {
    if (!enabled) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const stickyHeight = document.querySelector(`.${styles.detailContextNav}`)?.getBoundingClientRect().height || 0
      const threshold = stickyHeight + 24
      let nextSection = getSectionFromHash(hash)
      for (const id of DETAIL_SECTION_IDS) {
        const section = document.getElementById(id)
        if (!section) continue
        if (section.getBoundingClientRect().top <= threshold) nextSection = id
        else break
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12) nextSection = 'method'
      setActiveSection(current => current === nextSection ? current : nextSection)
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    scheduleUpdate()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [documentKey, enabled, hash])

  return activeSection
}

function DetailSectionNav({ locale, activeSection }) {
  const t = getCopy(locale)
  const navRef = useRef(null)
  const items = getDetailSectionItems(locale)

  useEffect(() => {
    const nav = navRef.current
    const activeLink = nav?.querySelector(`[data-section-id="${activeSection}"]`)
    if (!nav || !activeLink || nav.scrollWidth <= nav.clientWidth) return
    const left = activeLink.offsetLeft - ((nav.clientWidth - activeLink.offsetWidth) / 2)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nav.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [activeSection])

  return (
    <nav ref={navRef} className={styles.detailSectionNav} aria-label={t.decisionBrief}>
      {items.map(([id, label], index) => (
        <a
          key={id}
          href={`#${id}`}
          data-section-id={id}
          className={activeSection === id ? styles.detailSectionActive : ''}
          aria-current={activeSection === id ? 'location' : undefined}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>{label}
        </a>
      ))}
    </nav>
  )
}

function DossierContextNav({ locale, audience, subrole, scenario, returnTo, activeSection, onAudienceChange }) {
  const t = getCopy(locale)
  const copy = getDossierNavigationCopy(locale)
  const returnSubrole = getSubroleFromHref(returnTo)
  const backLabel = returnSubrole ? copy.backRole(getSubroleLabel(returnSubrole, locale)) : copy.backOverview
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)

  return (
    <aside className={styles.detailContextNav} data-audience={audience} aria-label={t.audienceMode}>
      <div className={styles.detailContextPrimary}>
        <Link className={styles.detailContextBack} to={returnTo}>← {backLabel}</Link>
        <div className={styles.detailContextIdentity}>
          <span>{copy.currentRole}</span>
          <strong>{getSubroleLabel(subrole, locale)}</strong>
          <small>{copy.currentLens} · {scenarioCopy.label}</small>
        </div>
        <div className={styles.detailContextActions}>
          <div className={styles.detailAudienceButtons}>
            <button type="button" aria-pressed={audience === 'manager'} data-active={audience === 'manager' ? 'true' : 'false'} data-return={audience === 'coach' ? 'true' : 'false'} onClick={() => onAudienceChange('manager')}>{audience === 'coach' ? `← ${copy.returnManager}` : t.managerView}</button>
            <button type="button" aria-pressed={audience === 'coach'} data-active={audience === 'coach' ? 'true' : 'false'} onClick={() => onAudienceChange('coach')}>{t.coachView}</button>
          </div>
        </div>
      </div>
      {audience === 'coach' ? <DetailSectionNav locale={locale} activeSection={activeSection} /> : null}
    </aside>
  )
}

const MANAGER_ROLE_SECTION_IDS = ['role-cockpit', 'position-comparison', 'role-ranking']
const COACH_ROLE_SECTION_IDS = ['role-cockpit', 'role-ranking', 'role-deployment', 'role-fit', 'role-dossiers', 'role-comparison', 'role-method']
const COACH_ROLE_TASK_IDS = ['decision', 'deployment', 'evidence', 'method']
const COACH_ROLE_TASK_BY_SECTION = {
  'role-cockpit': 'decision',
  'role-ranking': 'decision',
  'role-deployment': 'deployment',
  'role-fit': 'deployment',
  'role-dossiers': 'evidence',
  'role-comparison': 'evidence',
  'role-method': 'method'
}

function getRoleWorkspaceNavigationCopy(locale) {
  if (locale === 'en-US') return {
    label: 'Position assessment sections',
    back: 'Back to all positions',
    currentRole: 'Current position',
    currentLens: 'Hiring priority',
    tasks: {
      'role-cockpit': 'Position verdict',
      'position-comparison': 'Candidate comparison',
      'role-ranking': 'Rank pressure',
      'role-deployment': 'Deployment map',
      'role-fit': 'Requirement fit',
      'role-dossiers': 'Candidate dossiers',
      'role-comparison': 'Deep comparison',
      'role-method': 'Model & method'
    }
  }
  if (locale === 'ko-KR') return {
    label: '포지션 평가 목차',
    back: '전체 포지션으로',
    currentRole: '현재 포지션',
    currentLens: '현재 선발 기준',
    tasks: {
      'role-cockpit': '포지션 결론',
      'position-comparison': '후보 비교',
      'role-ranking': '순위 압박',
      'role-deployment': '기용 지도',
      'role-fit': '요구 적합도',
      'role-dossiers': '후보 파일',
      'role-comparison': '심층 비교',
      'role-method': '모델·방법'
    }
  }
  return {
    label: '岗位评估目录',
    back: '返回五位置总览',
    currentRole: '当前岗位',
    currentLens: '当前用人侧重',
    tasks: {
      'role-cockpit': '岗位结论',
      'position-comparison': '候选对比',
      'role-ranking': '顺位压力',
      'role-deployment': '部署地图',
      'role-fit': '需求适配',
      'role-dossiers': '候选档案',
      'role-comparison': '深度对比',
      'role-method': '模型方法'
    }
  }
}

function getCoachRoleTaskCopy(locale) {
  if (locale === 'en-US') return {
    eyebrow: 'COACH WORKFLOW',
    tasks: {
      decision: {
        label: 'Selection decision',
        description: 'Decide who merits priority review and whether the order holds under a different hiring emphasis.'
      },
      deployment: {
        label: 'Deployment fit',
        description: 'Read the hero, map and lineup environments in which each candidate is most likely to translate.'
      },
      evidence: {
        label: 'Evidence review',
        description: 'Open the five dossiers and audit opponent strength, sample confidence and model differences side by side.'
      },
      method: {
        label: 'Model appendix',
        description: 'Inspect scoring boundaries, validation gates and the methodology behind the recommendation.'
      }
    }
  }
  if (locale === 'ko-KR') return {
    eyebrow: '코치 워크플로',
    tasks: {
      decision: {
        label: '후보 결정',
        description: '우선 검토할 후보와 영입 기준 변화에도 순위가 유지되는지를 먼저 판단합니다.'
      },
      deployment: {
        label: '기용 적합',
        description: '각 후보가 강점을 전환하기 좋은 영웅, 전장, 조합 환경을 확인합니다.'
      },
      evidence: {
        label: '근거 검증',
        description: '5명 후보 파일을 열어 상대 강도, 표본 신뢰도, 모델 차이를 나란히 검증합니다.'
      },
      method: {
        label: '모델 부록',
        description: '추천을 만든 점수 경계, 검증 기준, 분석 방법을 확인합니다.'
      }
    }
  }
  return {
    eyebrow: '教练工作流',
    tasks: {
      decision: {
        label: '候选决策',
        description: '先判断谁值得优先考察，以及用人侧重变化后顺位是否仍然成立。'
      },
      deployment: {
        label: '部署适配',
        description: '查看每名候选更容易兑现优势的英雄、地图与阵容环境。'
      },
      evidence: {
        label: '证据核验',
        description: '打开五名候选档案，对照强敌表现、样本置信度与模型差异。'
      },
      method: {
        label: '模型附录',
        description: '检查推荐背后的评分边界、验证门槛与分析方法。'
      }
    }
  }
}

function getCoachRoleTaskFromLocation(searchParams, hash) {
  const requestedTask = searchParams.get('task')
  if (COACH_ROLE_TASK_IDS.includes(requestedTask)) return requestedTask
  const hashId = hash ? decodeURIComponent(hash.replace(/^#/, '')) : ''
  return COACH_ROLE_TASK_BY_SECTION[hashId] || 'decision'
}

function getRoleWorkspaceItems(locale, audience) {
  const copy = getRoleWorkspaceNavigationCopy(locale)
  if (audience === 'coach') {
    const taskCopy = getCoachRoleTaskCopy(locale)
    return COACH_ROLE_TASK_IDS.map(id => [id, taskCopy.tasks[id].label])
  }
  const ids = MANAGER_ROLE_SECTION_IDS
  return ids.map(id => [id, copy.tasks[id]])
}

function useActiveRoleSection(enabled, audience, hash, roleKey) {
  const ids = audience === 'coach' ? COACH_ROLE_SECTION_IDS : MANAGER_ROLE_SECTION_IDS
  const hashId = hash ? decodeURIComponent(hash.replace(/^#/, '')) : ''
  const [activeSection, setActiveSection] = useState(ids.includes(hashId) ? hashId : ids[0])

  useEffect(() => {
    if (!enabled) return undefined
    let frame = 0
    let settleFrame = 0
    let settleInnerFrame = 0
    const update = () => {
      frame = 0
      const stickyHeight = document.querySelector(`.${styles.roleWorkspaceNav}`)?.getBoundingClientRect().height || 0
      const threshold = stickyHeight + 24
      let nextSection = ids.includes(hashId) ? hashId : ids[0]
      for (const id of ids) {
        const section = document.getElementById(id)
        if (!section) continue
        const scrollMarginTop = Number.parseFloat(window.getComputedStyle(section).scrollMarginTop) || 0
        const sectionThreshold = Math.max(threshold, scrollMarginTop)
        if (section.getBoundingClientRect().top <= sectionThreshold + 1) nextSection = id
        else break
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12) nextSection = ids[ids.length - 1]
      setActiveSection(current => current === nextSection ? current : nextSection)
    }
    const scheduleUpdate = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    scheduleUpdate()
    // The report sections arrive after the model resolves, while a shared hash
    // is restored in a sibling effect. Recheck after that scroll has settled so
    // the highlighted task always matches the section visible on first load.
    settleFrame = window.requestAnimationFrame(() => {
      settleInnerFrame = window.requestAnimationFrame(scheduleUpdate)
    })
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (settleFrame) window.cancelAnimationFrame(settleFrame)
      if (settleInnerFrame) window.cancelAnimationFrame(settleInnerFrame)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [audience, enabled, hashId, ids, roleKey])

  return activeSection
}

function CoachTaskIntro({ locale, task }) {
  const copy = getCoachRoleTaskCopy(locale)
  const index = COACH_ROLE_TASK_IDS.indexOf(task)
  const item = copy.tasks[task]

  return (
    <header className={styles.coachTaskIntro}>
      <span>{String(index + 1).padStart(2, '0')} · {copy.eyebrow}</span>
      <div><h2>{item.label}</h2><p>{item.description}</p></div>
    </header>
  )
}

function RoleWorkspaceNav({ locale, audience, subrole, scenario, activeSection, activeTask, onRoleChange, onAudienceChange, onTaskChange }) {
  const t = getCopy(locale)
  const copy = getRoleWorkspaceNavigationCopy(locale)
  const items = getRoleWorkspaceItems(locale, audience)
  const scenarioCopy = getRecruitmentScenarioCopy(scenario, locale)
  const navRef = useRef(null)
  const activeNavigationId = audience === 'coach' ? activeTask : activeSection

  useEffect(() => {
    const nav = navRef.current
    const activeLink = nav?.querySelector(`[data-section-id="${activeNavigationId}"]`)
    if (!nav || !activeLink || nav.scrollWidth <= nav.clientWidth) return
    const left = activeLink.offsetLeft - ((nav.clientWidth - activeLink.offsetWidth) / 2)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nav.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [activeNavigationId])

  const openTaskSection = id => {
    const section = document.getElementById(id)
    if (section?.tagName === 'DETAILS') section.open = true
    window.requestAnimationFrame(() => section?.scrollIntoView({ block: 'start', behavior: 'instant' }))
  }

  return (
    <aside className={styles.roleWorkspaceNav} style={{ '--slot-color': SUBROLE_COLORS[subrole] }} data-audience={audience} aria-label={copy.label}>
      <div className={styles.roleWorkspacePrimary}>
        <button type="button" className={styles.roleWorkspaceBack} onClick={() => onRoleChange('ALL')}>← {copy.back}</button>
        <div className={styles.roleWorkspaceIdentity}>
          <span>{copy.currentRole}</span><strong>{getSubroleLabel(subrole, locale)}</strong><small>{copy.currentLens} · {scenarioCopy.label}</small>
        </div>
        <div className={styles.roleWorkspaceAudience}>
          <button type="button" aria-pressed={audience === 'manager'} data-active={audience === 'manager' ? 'true' : 'false'} onClick={() => onAudienceChange('manager')}>{t.managerView}</button>
          <button type="button" aria-pressed={audience === 'coach'} data-active={audience === 'coach' ? 'true' : 'false'} onClick={() => onAudienceChange('coach')}>{t.coachView}</button>
        </div>
      </div>
      <nav ref={navRef} className={styles.roleWorkspaceTasks} aria-label={copy.label} role={audience === 'coach' ? 'tablist' : undefined} style={{ '--task-count': items.length }}>
        {items.map(([id, label], index) => audience === 'coach' ? (
          <button
            key={id}
            id={`role-task-tab-${id}`}
            type="button"
            role="tab"
            data-section-id={id}
            className={activeTask === id ? styles.roleWorkspaceTaskActive : ''}
            aria-selected={activeTask === id}
            aria-controls={`role-task-${id}`}
            onClick={() => onTaskChange(id)}
          ><span>{String(index + 1).padStart(2, '0')}</span>{label}</button>
        ) : (
          <a
            key={id}
            href={`#${id}`}
            data-section-id={id}
            className={activeSection === id ? styles.roleWorkspaceTaskActive : ''}
            aria-current={activeSection === id ? 'location' : undefined}
            onClick={() => openTaskSection(id)}
          ><span>{String(index + 1).padStart(2, '0')}</span>{label}</a>
        ))}
      </nav>
    </aside>
  )
}

function AccessDenied({ locale }) {
  const t = getCopy(locale)
  return (
    <main className={styles.accessDenied}>
      <img src="/logos/fc_logo.svg" alt="Fries Cup" />
      <span>ACCESS CONTROL</span>
      <h1>{t.invalidTitle}</h1>
      <p>{t.invalidBody}</p>
    </main>
  )
}

function formatDataAsOf(value, locale) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)
}

function buildPlayerHref(shareKey, playerId, searchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete('player')
  next.delete('task')
  const search = next.toString()
  return {
    pathname: `/scouting/${encodeURIComponent(shareKey)}/players/${encodeURIComponent(playerId)}`,
    search: search ? `?${search}` : ''
  }
}

function buildOverviewHref(shareKey, searchParams) {
  const next = new URLSearchParams(searchParams)
  next.delete('player')
  const search = next.toString()
  return {
    pathname: `/scouting/${encodeURIComponent(shareKey)}`,
    search: search ? `?${search}` : ''
  }
}

function useScoutingIndex(enabled) {
  const [result, setResult] = useState(() => ({
    data: enabled ? getCachedScoutingIndex() : null,
    error: null
  }))

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    loadScoutingIndex()
      .then(data => {
        if (alive) setResult({ data, error: null })
      })
      .catch(error => {
        if (alive) setResult({ data: null, error })
      })
    return () => { alive = false }
  }, [enabled])

  return result
}

function useScoutingPlayerBundle(playerId, enabled) {
  const [result, setResult] = useState(() => ({
    playerId,
    index: enabled ? getCachedScoutingIndex() : null,
    player: enabled ? getCachedScoutingPlayer(playerId) : null,
    error: null
  }))

  useEffect(() => {
    if (!enabled) return undefined
    let alive = true
    Promise.all([loadScoutingIndex(), loadScoutingPlayer(playerId)])
      .then(([index, player]) => {
        if (alive) setResult({ playerId, index, player, error: null })
      })
      .catch(error => {
        if (alive) setResult({ playerId, index: null, player: null, error })
      })
    return () => { alive = false }
  }, [enabled, playerId])

  if (result.playerId !== playerId) return { index: null, player: null, error: null }
  return result
}

function ScoutingHeader({ accessRecord, locale, onLocaleChange }) {
  const t = getCopy(locale)
  return (
    <header className={styles.header}>
      <a className={styles.brand} href="https://fries-cup.com/" aria-label="Fries Cup">
        <img src="/logos/fc_logo.svg" alt="" />
        <span><b>FRIES CUP</b><small>PERFORMANCE INTELLIGENCE</small></span>
      </a>
      <div className={styles.headerMeta}>
        <span>{t.access}</span>
        <b>{accessRecord.label}</b>
      </div>
      <nav className={styles.languageSwitch} aria-label="Language">
        {REVIEW_LOCALES.map(item => (
          <button key={item.id} type="button" className={locale === item.id ? styles.languageActive : ''} onClick={() => onLocaleChange(item.id)}>
            {item.param.toUpperCase()}
          </button>
        ))}
      </nav>
    </header>
  )
}

function OverviewHero({ locale }) {
  const t = getCopy(locale)
  return (
    <section className={styles.hero}>
      <div>
        <span className={styles.confidential}>{t.confidential}</span>
        <h1 aria-label={t.title}>
          <span className={styles.heroTitleLead}>{t.titleLead}</span>{' '}
          <span className={styles.heroTitleReport}>{t.titleReport}</span>
        </h1>
        <p>{t.subtitle}</p>
      </div>
      <aside>
        <span>{t.sampleGate}</span>
        <strong>{t.sampleGateValue}</strong>
        <small>FCR 2026 · ROLE-RELATIVE</small>
      </aside>
    </section>
  )
}

function ScoutingLoading({ locale, detail = false }) {
  const t = getCopy(locale)
  return (
    <div className={styles.loading} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loadingContent}>
        <div className={styles.loadingHeading}>
          <span>{detail ? 'PLAYER DOSSIER' : 'PUBLISHED INDEX'}</span>
          <b>{detail ? t.loadingPlayer : t.loading}</b>
        </div>
        <div className={styles.loadingTrack} aria-hidden="true"><i /></div>
        <p>{detail ? t.loadingPlayerDetail : t.loadingDetail}</p>
      </div>
    </div>
  )
}

function formatModelVersion(modelVersion) {
  const value = String(modelVersion || '')
  const match = value.match(/^scouting-selection-(v[\d.]+)$/i)
  return match ? `Selection ${match[1]}` : value || 'Selection v2.7'
}

function ReportVersionStamp({ meta, locale }) {
  const t = getCopy(locale)
  return (
    <div className={styles.versionStamp}>
      <span><small>{t.reportVersion}</small><b>{meta?.reportVersion || 'FCR26 Scouting v2.4'}</b></span>
      <span><small>{t.modelVersion}</small><b>{formatModelVersion(meta?.modelVersion)}</b></span>
      <span><small>{t.dataAsOf}</small><b>{formatDataAsOf(meta?.dataAsOf, locale)}</b></span>
    </div>
  )
}

function AudienceModeSwitch({ locale, audience, onChange }) {
  const t = getCopy(locale)
  return (
    <section className={styles.audienceMode} aria-label={t.audienceMode}>
      <div><span>{t.audienceMode}</span><strong>{audience === 'coach' ? t.coachView : t.managerView}</strong><small>{audience === 'coach' ? t.coachViewMeta : t.managerViewMeta}</small></div>
      <div className={styles.audienceModeButtons}>
        <button type="button" aria-pressed={audience === 'manager'} className={audience === 'manager' ? styles.audienceModeActive : ''} onClick={() => onChange('manager')}><span>01</span><b>{t.managerView}</b></button>
        <button type="button" aria-pressed={audience === 'coach'} className={audience === 'coach' ? styles.audienceModeActive : ''} onClick={() => onChange('coach')}><span>02</span><b>{t.coachView}</b></button>
      </div>
    </section>
  )
}

function OverviewToolbar({ locale, roleFilter, stage, onRoleChange, onStageChange, showRole = true }) {
  const t = getCopy(locale)
  return (
    <section className={styles.overviewToolbar}>
      {showRole ? <div>
        <span>{t.filterSubrole}</span>
        <div className={styles.filterButtons} aria-label={t.filterSubrole}>
          <button type="button" className={`${styles.subroleFilterButton} ${roleFilter === 'ALL' ? styles.filterActive : ''}`} onClick={() => onRoleChange('ALL')}>
            <span className={styles.subroleButtonLabel}><b>{t.allRoles}</b>{locale !== 'en-US' ? <small>ALL POSITIONS</small> : null}</span>
          </button>
          {SUBROLE_ORDER.map(subrole => (
            <button key={subrole} type="button" className={`${styles.subroleFilterButton} ${roleFilter === subrole ? styles.filterActive : ''}`} onClick={() => onRoleChange(subrole)}>
              <SubroleButtonLabel subrole={subrole} locale={locale} />
            </button>
          ))}
        </div>
      </div> : null}
      <div>
        <span>{t.viewScope}</span>
        <div className={styles.filterButtons} aria-label={t.viewScope}>
          <button type="button" className={stage === 'season' ? styles.filterActive : ''} onClick={() => onStageChange('season')}>{t.seasonView}</button>
          <button type="button" className={stage === 'playoffs' ? styles.filterActive : ''} onClick={() => onStageChange('playoffs')}>{t.playoffsView}</button>
        </div>
      </div>
    </section>
  )
}

export default function ScoutingReportPage() {
  const { shareKey } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const locale = normalizeReviewLocale(searchParams.get('lang'))
  const scenario = normalizeRecruitmentScenario(searchParams.get('scenario'))
  const accessRecord = useMemo(() => getScoutingAccessRecord(shareKey), [shareKey])
  const { data: model, error } = useScoutingIndex(Boolean(accessRecord))
  const [printingRoleReport, setPrintingRoleReport] = useState(false)
  const roleFilter = SUBROLE_ORDER.includes(searchParams.get('role')) ? searchParams.get('role') : 'ALL'
  const stage = searchParams.get('stage') === 'playoffs' ? 'playoffs' : 'season'
  const audience = searchParams.get('view') === 'coach' ? 'coach' : 'manager'
  const coachTask = getCoachRoleTaskFromLocation(searchParams, location.hash)
  const comparePlayerIds = String(searchParams.get('compare') || '').split(',').map(value => value.trim()).filter(Boolean)
  const t = getCopy(locale)
  const disclosure = getDisclosureCopy(locale)
  const returnTo = { pathname: location.pathname, search: location.search }
  const previousRoleRef = useRef(roleFilter)
  const previousAudienceRef = useRef(audience)
  const previousCoachTaskRef = useRef(coachTask)
  const restoredLocationRef = useRef('')
  const activeRoleSection = useActiveRoleSection(Boolean(model) && roleFilter !== 'ALL' && audience === 'manager', 'manager', location.hash, roleFilter)

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = t.title
  }, [locale, t.title])

  useEffect(() => {
    const openAllTasksForPrint = () => {
      flushSync(() => setPrintingRoleReport(true))
    }
    const restoreActiveTask = () => setPrintingRoleReport(false)
    window.addEventListener('beforeprint', openAllTasksForPrint)
    window.addEventListener('afterprint', restoreActiveTask)
    return () => {
      window.removeEventListener('beforeprint', openAllTasksForPrint)
      window.removeEventListener('afterprint', restoreActiveTask)
    }
  }, [])

  useEffect(() => {
    const legacyPlayerId = searchParams.get('player')
    if (!accessRecord || !legacyPlayerId) return
    navigate(buildPlayerHref(shareKey, legacyPlayerId, searchParams), { replace: true })
  }, [accessRecord, navigate, searchParams, shareKey])

  useEffect(() => {
    if (!model) return undefined
    const locationKey = `${location.pathname}${location.search}`
    if (restoredLocationRef.current === locationKey) return undefined
    restoredLocationRef.current = locationKey
    let savedScroll = null
    try {
      savedScroll = window.sessionStorage.getItem(`scouting:return-scroll:${locationKey}`)
      if (savedScroll != null) window.sessionStorage.removeItem(`scouting:return-scroll:${locationKey}`)
    } catch {
      savedScroll = null
    }
    if (savedScroll == null) return undefined
    const top = Number(savedScroll)
    if (!Number.isFinite(top)) return undefined
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top, behavior: 'instant' }))
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, location.search, model])

  useEffect(() => {
    if (!model) return undefined
    const previousRole = previousRoleRef.current
    previousRoleRef.current = roleFilter
    if (previousRole === roleFilter) return undefined
    const frame = window.requestAnimationFrame(() => {
      if (roleFilter === 'ALL') {
        window.scrollTo({ top: 0, behavior: 'instant' })
        return
      }
      const target = document.getElementById('role-cockpit')
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [model, roleFilter])

  const updateQueries = (changes, options = {}) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key)
      else next.set(key, String(value))
    })
    if (options.clearHash) {
      const search = next.toString()
      navigate({ pathname: location.pathname, search: search ? `?${search}` : '', hash: '' }, { replace: true })
    } else {
      setSearchParams(next, { replace: true })
    }
  }
  const updateQuery = (key, value, defaultValue) => updateQueries({
    [key]: value === defaultValue ? null : value
  })
  const changeRole = value => updateQueries({
    role: value === 'ALL' ? null : value,
    compare: null,
    task: null
  }, { clearHash: true })

  const changeLocale = nextLocale => updateQuery('lang', getLocaleParam(nextLocale), 'zh')
  const changeAudience = value => updateQueries({
    view: value === 'manager' ? null : value,
    task: null
  }, { clearHash: roleFilter !== 'ALL' })
  const changeCoachTask = value => updateQueries({
    task: value === 'decision' ? null : value
  }, { clearHash: true })
  const visibleSubroles = roleFilter === 'ALL' ? SUBROLE_ORDER : [roleFilter]
  const getPlayerHref = playerId => buildPlayerHref(shareKey, playerId, searchParams)
  const coachRoleWorkspace = audience === 'coach' && roleFilter !== 'ALL'
  const rememberPlayerEntry = event => {
    const link = event.target.closest?.('a[href]')
    if (!link) return
    try {
      const target = new URL(link.href, window.location.href)
      const playerPath = `/scouting/${encodeURIComponent(shareKey)}/players/`
      if (target.origin !== window.location.origin || !target.pathname.startsWith(playerPath)) return
      const locationKey = `${location.pathname}${location.search}`
      window.sessionStorage.setItem(`scouting:return-scroll:${locationKey}`, String(window.scrollY))
    } catch {
      // Scroll restoration is a progressive enhancement; navigation still works without storage access.
    }
  }

  useEffect(() => {
    const previousAudience = previousAudienceRef.current
    previousAudienceRef.current = audience
    if (!model || roleFilter === 'ALL' || previousAudience === audience) return undefined
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById('role-cockpit')
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
      target?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [audience, model, roleFilter])

  useEffect(() => {
    const previousTask = previousCoachTaskRef.current
    previousCoachTaskRef.current = coachTask
    if (!model || !coachRoleWorkspace || previousTask === coachTask || location.hash) return undefined
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(`role-task-${coachTask}`)
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [coachRoleWorkspace, coachTask, location.hash, model])

  useEffect(() => {
    if (!model || roleFilter === 'ALL' || !location.hash) return undefined
    const targetId = decodeURIComponent(location.hash.slice(1))
    const validIds = audience === 'coach'
      ? COACH_ROLE_SECTION_IDS
      : [...MANAGER_ROLE_SECTION_IDS, 'manager-comparison-evidence']
    if (!validIds.includes(targetId)) return undefined
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      if (target?.tagName === 'DETAILS') target.open = true
      target?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [audience, location.hash, model, roleFilter])

  if (!accessRecord) return <AccessDenied locale={locale} />

  return (
    <div className={styles.page} data-locale={locale} data-audience={audience} data-role-focus={roleFilter !== 'ALL' ? 'true' : 'false'}>
      <ScoutingHeader accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} />
      <main className={styles.main} onClickCapture={rememberPlayerEntry}>
        {roleFilter === 'ALL' ? <OverviewHero locale={locale} /> : null}

        {!model && !error ? <ScoutingLoading locale={locale} /> : null}
        {error ? <div className={`${styles.loading} ${styles.loadingError}`} role="alert">{t.error}</div> : null}

        {model ? (
          <>
            {roleFilter === 'ALL' ? <div className={styles.reportControlRail}>
              <ReportVersionStamp meta={model.meta} locale={locale} />
              <AudienceModeSwitch locale={locale} audience={audience} onChange={changeAudience} />
            </div> : null}
            {roleFilter !== 'ALL' ? <RoleWorkspaceNav
              locale={locale}
              audience={audience}
              subrole={roleFilter}
              scenario={scenario}
              activeSection={activeRoleSection}
              activeTask={coachTask}
              onRoleChange={changeRole}
              onAudienceChange={changeAudience}
              onTaskChange={changeCoachTask}
            /> : null}
            {roleFilter === 'ALL' ? <section className={styles.reportStats}>
              <div><span>{t.publicDossiers}</span><strong>{model.selectedCount}</strong></div>
              <div><span>{t.priorityTier}</span><strong>{model.priorityCount}</strong></div>
              <div><span>{t.extendedTier}</span><strong>{model.extendedCount}</strong></div>
              <div><span>{t.watchTier}</span><strong>{model.watchCount}</strong></div>
            </section> : null}

            {roleFilter === 'ALL' ? (
              <ExecutiveCommandView
                model={model}
                locale={locale}
                audience={audience}
                scenario={scenario}
                onScenarioChange={value => updateQuery('scenario', RECRUITMENT_SCENARIO_PARAMS[value], 'balanced')}
                activeSubrole={roleFilter}
                onRoleChange={changeRole}
                getPlayerHref={getPlayerHref}
                returnTo={returnTo}
              />
            ) : audience === 'manager' ? (
              <RoleRecruitmentCockpit
                model={model}
                locale={locale}
                audience={audience}
                scenario={scenario}
                subrole={roleFilter}
                onScenarioChange={value => updateQuery('scenario', RECRUITMENT_SCENARIO_PARAMS[value], 'balanced')}
                onRoleChange={changeRole}
                getPlayerHref={getPlayerHref}
                returnTo={returnTo}
              />
            ) : null}
            {roleFilter !== 'ALL' && audience === 'manager' ? <ManagerComparisonWorkbench
              model={model}
              locale={locale}
              subrole={roleFilter}
              scenario={scenario}
              selectedPlayerIds={comparePlayerIds}
              onSelectionChange={value => updateQuery('compare', value.join(','), '')}
              onScenarioChange={value => updateQuery('scenario', RECRUITMENT_SCENARIO_PARAMS[value], 'balanced')}
              getPlayerHref={getPlayerHref}
              returnTo={returnTo}
            /> : null}
            {roleFilter !== 'ALL' && audience === 'manager' ? (
              <details id="role-ranking" className={`${styles.managerRankDisclosure} ${styles.anchorSection}`}>
                <summary><span>RANK SENSITIVITY</span><div><strong>{disclosure.rankTitle}</strong><small>{disclosure.rankMeta}</small></div><b aria-hidden="true">＋</b></summary>
                <MarketRankFlow
                  model={model}
                  locale={locale}
                  audience={audience}
                  activeSubrole={roleFilter}
                  activeScenario={scenario}
                  getPlayerHref={getPlayerHref}
                  returnTo={returnTo}
                />
              </details>
            ) : null}

            {coachRoleWorkspace ? <>
              {printingRoleReport || coachTask === 'decision' ? <div
                id="role-task-decision"
                className={styles.coachTaskPanel}
                role="tabpanel"
                aria-labelledby="role-task-tab-decision"
              >
                <CoachTaskIntro locale={locale} task="decision" />
                <RoleRecruitmentCockpit
                  model={model}
                  locale={locale}
                  audience={audience}
                  scenario={scenario}
                  subrole={roleFilter}
                  onScenarioChange={value => updateQuery('scenario', RECRUITMENT_SCENARIO_PARAMS[value], 'balanced')}
                  onRoleChange={changeRole}
                  getPlayerHref={getPlayerHref}
                  returnTo={returnTo}
                />
                <MarketRankFlow
                  id="role-ranking"
                  model={model}
                  locale={locale}
                  audience={audience}
                  activeSubrole={roleFilter}
                  activeScenario={scenario}
                  getPlayerHref={getPlayerHref}
                  returnTo={returnTo}
                />
              </div> : null}

              {printingRoleReport || coachTask === 'deployment' ? <div
                id="role-task-deployment"
                className={styles.coachTaskPanel}
                role="tabpanel"
                aria-labelledby="role-task-tab-deployment"
              >
                <CoachTaskIntro locale={locale} task="deployment" />
                <DeploymentMatrix id="role-deployment" model={model} locale={locale} activeSubrole={roleFilter} />
                <OverviewToolbar
                  locale={locale}
                  roleFilter={roleFilter}
                  stage={stage}
                  onRoleChange={changeRole}
                  onStageChange={value => updateQuery('stage', value, 'season')}
                  showRole={false}
                />
                <RecruitmentScenarioBoard
                  id="role-fit"
                  model={model}
                  locale={locale}
                  scenario={scenario}
                  subrole={roleFilter}
                  onScenarioChange={value => updateQuery('scenario', RECRUITMENT_SCENARIO_PARAMS[value], 'balanced')}
                  getPlayerHref={getPlayerHref}
                  returnTo={returnTo}
                />
              </div> : null}

              {printingRoleReport || coachTask === 'evidence' ? <div
                id="role-task-evidence"
                className={styles.coachTaskPanel}
                role="tabpanel"
                aria-labelledby="role-task-tab-evidence"
              >
                <CoachTaskIntro locale={locale} task="evidence" />
                <section id="role-dossiers" className={`${styles.playerDeck} ${styles.anchorSection}`}>
                  <div className={styles.sectionHeading}>
                    <div><span>03 · DOSSIERS</span><h2>{t.selectedDossiers}</h2><p>{t.prototypeNote}</p></div>
                  </div>
                  <div className={styles.playerGroups} aria-label={t.prototype}>
                    {visibleSubroles.map(subrole => {
                      const index = SUBROLE_ORDER.indexOf(subrole)
                      const groupPlayers = model.players.filter(player => player.subrole === subrole)
                      return (
                        <section key={subrole} className={styles.playerSubroleGroup} style={{ '--slot-color': SUBROLE_COLORS[subrole] }}>
                          <header>
                            <span>{String(index + 1).padStart(2, '0')}</span>
                            <h3>{getSubroleLabel(subrole, locale)}</h3>
                            <p>{groupPlayers.length} {t.slots}</p>
                          </header>
                          <div className={styles.playerGrid}>
                            {groupPlayers.map(player => (
                              <PlayerCard
                                key={player.playerId}
                                player={player}
                                locale={locale}
                                stage={stage}
                                scenario={scenario}
                                to={getPlayerHref(player.playerId)}
                                returnTo={returnTo}
                              />
                            ))}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                </section>
                <ComparisonTable
                  id="role-comparison"
                  key={roleFilter}
                  players={model.players}
                  locale={locale}
                  stage={stage}
                  scenario={scenario}
                  initialSubrole={roleFilter}
                  selectedPlayerIds={comparePlayerIds}
                  onSubroleChange={changeRole}
                  onSelectionChange={value => updateQuery('compare', value.join(','), '')}
                  getPlayerHref={getPlayerHref}
                  returnTo={returnTo}
                />
              </div> : null}

              {printingRoleReport || coachTask === 'method' ? <div
                id="role-task-method"
                className={styles.coachTaskPanel}
                role="tabpanel"
                aria-labelledby="role-task-tab-method"
              >
                <CoachTaskIntro locale={locale} task="method" />
                <SelectionFramework id="role-method" model={model} locale={locale} />
                <Methodology locale={locale} validation={model.validationAudit} />
              </div> : null}
            </> : null}
            <p className={styles.prototypeNote}>{t.prototypeNote}</p>
          </>
        ) : null}
      </main>
    </div>
  )
}

export function ScoutingPlayerPage() {
  const { shareKey, playerId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const locale = normalizeReviewLocale(searchParams.get('lang'))
  const scenario = normalizeRecruitmentScenario(searchParams.get('scenario'))
  const audience = searchParams.get('view') === 'coach' ? 'coach' : 'manager'
  const [printMode, setPrintMode] = useState(() => searchParams.get('print') === 'trial' ? 'trial' : 'full')
  const accessRecord = useMemo(() => getScoutingAccessRecord(shareKey), [shareKey])
  const { index, player, error } = useScoutingPlayerBundle(playerId, Boolean(accessRecord))
  const t = getCopy(locale)
  const requestedSubrole = SUBROLE_ORDER.includes(searchParams.get('role')) ? searchParams.get('role') : null
  const fallbackParams = new URLSearchParams(searchParams)
  if (player?.subrole && requestedSubrole !== player.subrole) fallbackParams.set('role', player.subrole)
  const overviewHref = buildOverviewHref(shareKey, fallbackParams)
  const comparisonHref = { ...overviewHref, hash: '#position-comparison' }
  const returnTo = location.state?.returnTo || overviewHref
  const comparisonIds = [...new Set(String(searchParams.get('compare') || '').split(',').map(value => value.trim()).filter(Boolean))].slice(0, 3)
  const comparisonGroup = player && index
    ? comparisonIds
        .map(id => index.players.find(candidate => candidate.playerId === id))
        .filter(candidate => candidate?.subrole === player.subrole)
    : []
  const comparisonPeers = comparisonGroup.length >= 2 && comparisonGroup.some(candidate => candidate.playerId === playerId)
    ? comparisonGroup.filter(candidate => candidate.playerId !== playerId)
    : []
  const rosterIndex = index?.players.findIndex(item => item.playerId === playerId) ?? -1
  const contextSubrole = requestedSubrole === player?.subrole ? requestedSubrole : player?.subrole
  const scopedRoster = index?.players.filter(item => item.subrole === contextSubrole) || []
  const scopedRosterIndex = scopedRoster.findIndex(item => item.playerId === playerId)
  const previous = scopedRosterIndex > 0 ? scopedRoster[scopedRosterIndex - 1] : null
  const next = scopedRosterIndex >= 0 && scopedRosterIndex < scopedRoster.length - 1 ? scopedRoster[scopedRosterIndex + 1] : null
  const previousPlayerId = previous?.playerId || ''
  const nextPlayerId = next?.playerId || ''
  const playerLoaded = Boolean(player)
  const invalidPlayer = Boolean(error?.message?.includes('404') || error?.message?.includes('SCOUTING_PLAYER_ID_INVALID') || (index && rosterIndex < 0))
  const activeSection = useActiveDetailSection(audience === 'coach' && Boolean(player), location.hash, playerId)
  const dossierNavigationCopy = getDossierNavigationCopy(locale)
  const decision = useMemo(() => (
    player && index
      ? buildPlayerDecisionContract(player, locale, scenario, index.recruitmentScenarioWeights, index.professionalReference)
      : null
  ), [index, locale, player, scenario])

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = player ? `${player.identity.displayName} · ${t.title}` : t.title
  }, [locale, player, t.title])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [playerId])

  useEffect(() => {
    const adjacentPlayerIds = [previousPlayerId, nextPlayerId].filter(Boolean)
    if (!playerLoaded || !adjacentPlayerIds.length) return undefined

    const prefetchAdjacent = () => adjacentPlayerIds.forEach(preloadScoutingPlayer)
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(prefetchAdjacent, { timeout: 1200 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = window.setTimeout(prefetchAdjacent, 120)
    return () => window.clearTimeout(timeoutId)
  }, [nextPlayerId, playerLoaded, previousPlayerId])

  useEffect(() => {
    if (!player || !location.hash) return undefined
    const targetId = decodeURIComponent(location.hash.slice(1))
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [audience, location.hash, player])

  useEffect(() => {
    const resetPrintMode = () => setPrintMode('full')
    window.addEventListener('afterprint', resetPrintMode)
    return () => window.removeEventListener('afterprint', resetPrintMode)
  }, [])

  const changeLocale = nextLocale => {
    const nextParams = new URLSearchParams(searchParams)
    const value = getLocaleParam(nextLocale)
    if (value === 'zh') nextParams.delete('lang')
    else nextParams.set('lang', value)
    setSearchParams(nextParams, { replace: true })
  }

  const changeAudience = value => {
    const nextParams = new URLSearchParams(searchParams)
    if (value === 'manager') nextParams.delete('view')
    else nextParams.set('view', value)
    navigate({
      ...buildPlayerHref(shareKey, playerId, nextParams),
      hash: ''
    }, { replace: true, state: location.state })
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  }

  const getCoachEvidenceHref = anchor => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', 'coach')
    return {
      ...buildPlayerHref(shareKey, playerId, nextParams),
      hash: anchor ? `#${anchor}` : ''
    }
  }

  const printDossier = (mode = 'full') => {
    flushSync(() => setPrintMode(mode))
    window.requestAnimationFrame(() => window.print())
  }

  if (!accessRecord) return <AccessDenied locale={locale} />

  return (
    <div className={`${styles.page} ${styles.detailPage}`} data-locale={locale} data-audience={audience} data-print-mode={printMode}>
      <ScoutingHeader accessRecord={accessRecord} locale={locale} onLocaleChange={changeLocale} />
      <main className={`${styles.main} ${styles.detailMain}`}>
        <nav className={styles.detailNavigation} aria-label={t.selectedDossiers}>
          <div className={styles.detailRoleSequence}>
            <span>{dossierNavigationCopy.roleSequence}</span>
            <strong>{getSubroleLabel(contextSubrole, locale)} · {scopedRosterIndex + 1}/{scopedRoster.length}</strong>
          </div>
          <div className={styles.adjacentPlayers}>
            {previous ? (
              <Link to={buildPlayerHref(shareKey, previous.playerId, searchParams)} state={{ returnTo }} onPointerEnter={() => preloadScoutingPlayer(previous.playerId)} onFocus={() => preloadScoutingPlayer(previous.playerId)}>
                <small>{dossierNavigationCopy.previousInRole}</small><b>{previous.identity.displayName}</b>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={buildPlayerHref(shareKey, next.playerId, searchParams)} state={{ returnTo }} onPointerEnter={() => preloadScoutingPlayer(next.playerId)} onFocus={() => preloadScoutingPlayer(next.playerId)}>
                <small>{dossierNavigationCopy.nextInRole}</small><b>{next.identity.displayName}</b>
              </Link>
            ) : <span />}
          </div>
        </nav>

        {!player && !error ? <ScoutingLoading locale={locale} detail /> : null}
        {error || invalidPlayer ? (
          <div className={`${styles.loading} ${styles.loadingError}`} role="alert">
            {invalidPlayer ? t.invalidPlayer : t.error}
          </div>
        ) : null}

        {player && index && rosterIndex >= 0 ? (
          <>
            <DossierContextNav
              locale={locale}
              audience={audience}
              subrole={contextSubrole}
              scenario={scenario}
              returnTo={returnTo}
              activeSection={activeSection}
              onAudienceChange={changeAudience}
            />
            {audience === 'manager' ? (
              <ManagerPlayerAnalysis
                player={player}
                locale={locale}
                activeScenario={scenario}
                decision={decision}
                coachHref={getCoachEvidenceHref}
                comparisonPeers={comparisonPeers}
                comparisonHref={comparisonHref}
                getPlayerHref={candidatePlayerId => buildPlayerHref(shareKey, candidatePlayerId, searchParams)}
                onPrint={() => printDossier('full')}
                onPrintTrial={() => printDossier('trial')}
              />
            ) : (
              <>
                <PlayerAnalysis player={player} locale={locale} activeScenario={scenario} decision={decision} onPrint={() => printDossier('full')} />
                <Methodology id="method" locale={locale} validation={index.validationAudit} />
              </>
            )}
            <div className={styles.detailVersionFooter}>
              <ReportVersionStamp meta={index.meta} locale={locale} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}
