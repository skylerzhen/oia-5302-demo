/** @type {import('./narration-segments.js').NarrationSegment[]} */
export const NARRATION = [
  {
    id: '01-open',
    title: 'Opening',
    text:
      '您好。接下来为您演示 OIA 人工智能招聘助手原型，对应 RFQ 5302 技术方案中的端到端评估旅程。' +
      '这是一个可点击的垂直切片原型，用于展示核心流程、人在回路控制，以及完整审计能力。' +
      '请注意两个关键设计：第一，候选人门户与 HR 门户完全分离；第二，系统支持主权部署与离线推理，面试环节可切断外网，在本地完成推理。' +
      '我们强调四点：数据主权，推理在阿曼本地完成；离线面试，Avatar 环节禁用外网出口；双语能力；以及 HR 终审，AI 只提供建议，录用决定权始终在人工。',
    pauseAfter: 2,
  },
  {
    id: '02-s0',
    title: 'S0 Network',
    text:
      '在正式部署中，候选人进入面试环节时，系统会切换为离线模式，所有推理在本地运行，数据不出境。' +
      '演示时，您可以通过顶栏状态灯模拟拔线镜头：Connected 表示 OIA 内网连通，Offline 表示本地推理模式。候选人侧与 HR 侧共享同一网络状态。',
    pauseAfter: 1,
  },
  {
    id: '03-c1',
    title: 'C1 Apply',
    text:
      '现在进入候选人门户。候选人通过 Jadarah 一次性令牌登录。第一步，上传简历，AI 自动解析结构化字段。' +
      '每个字段都有解析状态，并可下钻到简历原文证据。确认所有字段后，提交至 Jadarah。',
    pauseAfter: 1,
  },
  {
    id: '04-c2',
    title: 'C2 Diff',
    text:
      '当候选人上传更新版简历时，系统展示差分视图：原有数据与新解析结果 side by side，变更高亮标注。' +
      '没有任何字段会被静默覆盖，候选人必须明确接受才会进入下一步。',
    pauseAfter: 1,
  },
  {
    id: '05-c3',
    title: 'C3 Assessment',
    text:
      '角色专项测评：每道题同时展示英语和阿拉伯语题干，提交后自动判分，并展示总分与逐题正误明细。',
    pauseAfter: 1,
  },
  {
    id: '06-c4',
    title: 'C4 Interview',
    text:
      '第四步，AI Avatar 双语面试。流程分三步：英语问答与动态追问，阿拉伯语环节，以及提交录音。' +
      '左侧是 Avatar 面试官与实时字幕。候选人永远看不到匹配分数或其他申请者信息。',
    pauseAfter: 2,
  },
  {
    id: '07-h1',
    title: 'H1 Dashboard',
    text:
      '现在切换到 HR 门户。匹配仪表盘展示六人候选池、排名、维度分解与证据下钻，支持筛选与 CSV 导出。' +
      'Sara Al-Hinai 以 98% 位居第一，每一分的来源都可解释。',
    pauseAfter: 1,
  },
  {
    id: '08-h2',
    title: 'H2 Shortlist',
    text: 'Human Gate 一：短名单或淘汰，必须填写书面理由。AI 提供建议，决策权在招聘官。',
    pauseAfter: 1,
  },
  {
    id: '09-h3',
    title: 'H3 Review',
    text:
      'H3 是 HR 专属面试回放：Avatar 形象与字幕同步，支持 Play recording 与双语 transcript 逐条跳转。',
    pauseAfter: 2,
  },
  {
    id: '10-h4',
    title: 'H4 Decision',
    text:
      'H4 最终人工决定：AI 推荐录用，但招聘官必须选择 Hire 或 Reject，填写理由并确认。AI 不会自动录用任何人。',
    pauseAfter: 1,
  },
  {
    id: '11-h5',
    title: 'H5 Audit',
    text:
      'H5 完整审计报告：时间戳、步骤、角色、动作与详情，支持 CSV 导出。底部总结五项核心能力。',
    pauseAfter: 2,
  },
  {
    id: '12-close',
    title: 'Closing',
    text:
      '以上即为 OIA RFQ 5302 人工智能招聘助手的评估演示原型。生产系统将接入 live Jadarah、本地大模型与生产级 Avatar。感谢您的观看。',
    pauseAfter: 0,
  },
]

export const DEMO_URL = 'https://oia-rfq-5302.surge.sh'
