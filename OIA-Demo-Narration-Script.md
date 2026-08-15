# OIA RFQ 5302 Demo — 讲解文稿（AI 配音用）

**用途：** 配合录屏逐段配音  
**建议语速：** 每分钟 130–150 字（中文）  
**总时长：** 约 9–11 分钟  
**在线 Demo：** https://oia-rfq-5302.surge.sh  

---

> **配音提示：**  
> - 方括号【】内为画面操作说明，不读出来  
> - 「停 N 秒」处留空白给画面展示  
> - 英文界面词可按原样读，或读中文释义（括号内）  

---

## 一、开场 · 价值主张（约 45 秒）

【画面：打开 Landing 页，展示标题与四支柱】

您好。接下来为您演示 OIA 人工智能招聘助手原型，对应 RFQ 5302 技术方案中的端到端评估旅程。

这是一个可点击的垂直切片原型，用于展示核心流程、人在回路控制，以及完整审计能力。

请注意两个关键设计：第一，候选人门户与 HR 门户完全分离，双方 never 共享同一工作界面；第二，系统支持主权部署与离线推理，面试环节可切断外网，在本地完成推理。

【画面：指向四支柱卡片——数据主权、离线面试、双语、HR 终审】

我们强调四点：数据主权，推理在阿曼本地完成；离线面试，Avatar 环节禁用外网出口；双语能力，评估与面试支持英语和阿拉伯语；以及 HR 终审，AI 只提供建议，录用决定权始终在人工。

【停 2 秒】

---

## 二、S0 · 网络状态演示（约 25 秒）

【画面：点击 Landing 页顶部网络状态灯，Connected 变为 Offline】

在正式部署中，候选人进入面试环节时，系统会切换为离线模式，所有推理在本地 GPU 上运行，数据不出境。

【画面：点击状态灯，Offline 切回 Connected】

演示时，您可以通过顶栏状态灯模拟「拔线」镜头：Connected 表示 OIA 内网连通，Offline 表示本地推理模式。候选人侧与 HR 侧共享同一网络状态，口径一致。

【停 1 秒】

---

## 三、候选人门户 · C1 申请与解析（约 1 分钟）

【画面：点击 Candidate portal → Enter application】

现在进入候选人门户。候选人通过 Jadarah 一次性令牌登录，这是生产环境中与 Jadarah 集成的模拟标注。

【画面：C1 上传 CV 样本】

第一步，上传简历。系统支持多种格式，包括英文 Word 文档和阿拉伯语扫描 PDF。上传后，AI 自动解析结构化字段。

【画面：展示 parsed / needs review / missing 状态】

每个字段都有解析状态：已解析、待复核、或缺失。点击 Evidence 可下钻到简历原文证据，满足可解释性与审计要求。

【画面：点击 Confirm all fields → Submit profile】

候选人确认所有字段后，点击 Submit profile，数据写回 Jadarah——此处为模拟标注。

【停 1 秒】

---

## 四、S2 · C2 差分更新（约 30 秒）

【画面：C2 差分对比表，红删绿增】

当候选人上传更新版简历时，系统展示差分视图：左侧是 Jadarah 原有数据，右侧是新 CV 解析结果。变更字段高亮标注，新增字段单独标记。

没有任何字段会被静默覆盖。候选人必须明确点击 Accept，才会进入下一步。

【停 1 秒】

---

## 五、S5 · C3 双语测评（约 45 秒）

【画面：C3 双语 MCQ 题目，英文 + 阿拉伯语题干】

第三步，角色专项测评。每道题同时展示英语和阿拉伯语题干，选项为英文。这对应 RFQ 中对双语评估能力的要求。

【画面：答完四题 → Submit exam → 展示分数与逐题 breakdown】

提交后，系统自动判分，并展示总分与逐题正误明细。候选人可以看到自己的表现，但看不到其他申请者信息。

【停 1 秒】

---

## 六、S6 · C4 AI Avatar 面试（约 1 分 15 秒）

【画面：C4 步骤条 + Avatar 照片 + Start interview】

第四步，也是演示的高潮环节——AI Avatar 双语面试。

【画面：Start → 英文回答 → Continue to Arabic → 阿拉伯语回答 → Submit】

流程分三步：第一，英语问答，Avatar 会根据回答生成动态追问；第二，阿拉伯语环节，Mandatory for this role；第三，Submit interview，录音保存供 HR 单独审阅。

【画面：指向 Avatar 照片与字幕条】

左侧是 Avatar 面试官形象与实时字幕。生产环境将替换为 ASR、TTS 与口型同步；当前原型使用静态形象加字幕条，用于验证交互流程。

候选人永远看不到匹配分数、其他申请者或录用决定。

【停 2 秒】

---

## 七、C5 / C6 · 分数与状态（约 20 秒）

【画面：C5 匹配分与改进建议 → C6 申请状态追踪】

面试完成后，候选人查看个人匹配分数与改进建议，以及申请进度：资料已提交、测评完成、面试完成、等待 HR 审核。

候选人无法在此门户做出任何录用决定。

【画面：Exit portal 回到 Landing】

【停 1 秒】

---

## 八、HR 门户 · H1 匹配仪表盘（约 1 分钟）

【画面：点击 HR portal，进入 H1】

现在切换到 HR 与招聘官门户，对应 OIA SSO 加 MFA 登录，与候选人流程完全独立。

【画面：KPI 卡片、排名表、维度进度条】

H1 是匹配仪表盘：六人候选池、qualified 人数、平均匹配分。排名表展示每位候选人的匹配百分比与维度命中数。

【画面：点击维度条 → Evidence 弹窗 → Export CSV】

点击任意维度，可下钻到 CV 证据原文。支持技能、年限、学历筛选，以及 CSV 导出。Sara Al-Hinai 以 98% 位居第一，每一分的来源都可解释，不是黑盒。

【停 1 秒】

---

## 九、H2 短名单 / 淘汰（约 30 秒）

【画面：H2 填写 shortlist 理由 → Shortlist candidate】

第二个 Human Gate：短名单或淘汰，必须填写书面理由。AI 提供排序与建议，决策权在招聘官。

【停 1 秒】

---

## 十、S6 · H3 面试回放（约 45 秒）

【画面：H3 Avatar 回放 + Play recording + 点击 transcript turn】

H3 是 HR 专属视图，候选人无法访问。左侧 Avatar 形象与字幕条同步展示选中回合；点击 Play recording 可顺序播放完整录音；右侧是双语 transcript，支持逐条跳转。

【画面：展示 Assessment 75%、Shortlisted 状态 KPI】

上方 KPI 展示测评分数、面试轮次与短名单状态。

【停 2 秒】

---

## 十一、S8 · H4 终审决定（约 40 秒）

【画面：H4 AI 推荐卡 + Hire / Reject 双选 + 填写理由 → Confirm】

H4 是最终人工决定环节，也是 S8 的核心画面。

AI 推荐卡显示：基于 98% 匹配、75% 测评与双语面试表现，建议录用。但招聘官必须主动选择 Recommend hire 或 Reject，填写 mandatory reason，并点击 Confirm final decision。

AI 不会自动录用任何人。Human holds final authority.

【停 1 秒】

---

## 十二、S8 · H5 审计报告与收束（约 50 秒）

【画面：H5 全页审计表，滚动展示】

H5 展示完整审计报告：时间戳、步骤编号、操作角色、动作类型与详细说明。从 CV 上传、字段确认、测评提交、面试完成，到短名单与终审，每一步都有记录。

【画面：Export audit CSV → 收束总结帧】

支持导出 CSV 供合规审查。底部收束页总结本次演示覆盖的五项能力：双 portal 分离、证据链 AI、人在回路、双语面试、完整审计。

【停 2 秒】

---

## 十三、结束语（约 30 秒）

【画面：回到 Landing 或停留在 H5 收束页】

以上即为 OIA RFQ 5302 人工智能招聘助手的评估演示原型。

本原型覆盖 S0 到 S8 的核心交互与 Human Gate。生产系统将在此基础上接入 live Jadarah、本地大模型、生产级 ASR/TTS，以及口型同步 Avatar，全部在阿曼本地部署。

感谢您的观看。

【结束】

---

## 附录 A：分镜速查（剪辑用）

| 序号 | 时间参考 | 画面 | 配音段落 |
|------|----------|------|----------|
| 1 | 0:00 | Landing 价值页 | 一、开场 |
| 2 | 0:45 | 状态灯切换 | 二、S0 |
| 3 | 1:10 | C1 上传+确认+提交 | 三、C1 |
| 4 | 2:10 | C2 diff | 四、C2 |
| 5 | 2:40 | C3 测评+分数 | 五、C3 |
| 6 | 3:25 | C4 Avatar 三步 | 六、C4 |
| 7 | 4:40 | C5/C6 | 七 |
| 8 | 5:00 | H1 dashboard | 八、H1 |
| 9 | 6:00 | H2 shortlist | 九、H2 |
| 10 | 6:30 | H3 回放 | 十、H3 |
| 11 | 7:15 | H4 终审 | 十一、H4 |
| 12 | 7:55 | H5 审计+收束 | 十二、H5 |
| 13 | 8:45 | 结束 | 十三 |

---

## 附录 B：英文版（如需英文 AI 配音，读此版）

<details>
<summary>English narration (expand)</summary>

**Opening**

Welcome. This is a clickable prototype of the OIA AI Recruitment Assistant, built against RFQ 5302. Two key design choices: separate Candidate and HR portals, and offline-capable local inference for the interview segment.

**S0 Network**

Click the status lamp to simulate unplugging: Connected means OIA intranet; Offline means local inference with egress disabled. Both portals share the same state.

**C1 Apply**

Upload CV, review parsed fields with evidence links, confirm all fields, submit to Jadarah.

**C2 Diff**

Side-by-side diff with highlighted changes. Candidate must accept before overwrite.

**C3 Assessment**

Bilingual MCQ, auto-scored with per-question breakdown.

**C4 Interview**

Three steps: English Q&A, Arabic segment, Submit. Avatar image with captions. Recording saved for HR only.

**H1 Dashboard**

Six candidates, ranked scores, dimension bars, evidence drill-down, CSV export.

**H2 Shortlist**

Mandatory written reason. Human gate one.

**H3 Review**

Avatar replay with bilingual transcript. HR-only view.

**H4 Final Decision**

AI recommends hire; recruiter selects Hire or Reject, enters reason, confirms. No auto-hire.

**H5 Audit**

Full timestamp × actor × action table, CSV export, closing summary.

**Closing**

Prototype covers S0–S8 with human-in-the-loop. Production adds live Jadarah, on-prem models, and production avatar TTS. Thank you.

</details>

---

*Generated for oia-5302-demo · sync with surge.sh deployment*
