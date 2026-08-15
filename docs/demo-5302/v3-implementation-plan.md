# OIA 5302 Demo v3 实施计划

**交付日期：8/17（周一）**  
**当前时间：8/15 晚 11:29 PM**  
**剩余时间：~40 小时**

## 核心要求（UIS Must-have）

1. ✅ **Voice 交互** - avatar 语音念题、候选人语音回答、系统真实识别
2. ✅ **可见 lip-sync** - TTS viseme 时间戳实时驱动 2D 嘴型
3. ✅ **CV 真实解析** - 已完成（当前使用 mock LLM）
4. ✅ **AI 面试官真实追问** - 基于回答生成追问与评估

## 关键技术决策（v3.1）

- ❌ **废弃**：VRoid/预渲染路线（与实时追问物理互斥）
- ✅ **采用**：2D 插画 + TTS viseme 时间戳实时驱动（5-7 张嘴型图）
- ✅ **技术栈**：云端 TTS（带 viseme）+ Web Speech/云 STT + 云端 LLM

## 当前状态

### 已完成
- ✅ S0-S8 原型完整可演示（mock AI 版）
- ✅ 2D avatar 基础框架（`AvatarPanel.tsx`）
- ✅ Viseme 类型定义和 CSS 样式
- ✅ ASR/TTS API 接口占位（`src/lib/localAi.ts`）
- ✅ CV 解析功能（mock 实现）

### 待完成（阻塞项）
- 🔴 云端 API keys（TTS + viseme、STT、LLM）
- 🔴 2D 嘴型素材（5-7 张嘴型图 + 表情）
- 🔴 真实 voice 交互实现
- 🔴 TTS viseme 时间戳驱动 lip-sync
- 🔴 断网模式演示文案

## 实施步骤

### Phase 1: API 准备（立即开始）
**目标时间：8/15 深夜 - 8/16 凌晨 2:00**

1. **选型决策**
   - [ ] TTS 服务选型（Azure TTS viseme 或 AWS Polly speech marks）
   - [ ] STT 服务选型（Web Speech API 或 Azure/AWS STT）
   - [ ] LLM 服务选型（OpenAI/Azure OpenAI/AWS Bedrock）

2. **API Keys 获取**
   - [ ] 申请/配置 TTS API key（必须支持 viseme/speech-mark）
   - [ ] 申请/配置 STT API key（或使用浏览器 Web Speech API）
   - [ ] 申请/配置 LLM API key

3. **环境配置**
   - [ ] 创建 `.env.local` 文件存储 API keys
   - [ ] 配置 API 请求代理（避免 CORS 问题）

### Phase 2: 嘴型素材准备（并行）
**目标时间：8/15 深夜 - 8/16 凌晨 2:00**

1. **2D 嘴型图片**
   - [ ] 准备 7 张嘴型 PNG：rest, A, E, I, O, U, M（透明背景）
   - [ ] 准备 3-4 种表情状态：neutral, supportive, curious
   - [ ] 放置到 `public/avatar/mouth/` 目录

2. **更新 AvatarPanel**
   - [ ] 修改 SVG avatar 为图片拼接方式
   - [ ] 或者保持 SVG，但准备好可快速切换的图片方案

### Phase 3: TTS + Viseme 实现（核心）
**目标时间：8/16 凌晨 2:00 - 上午 6:00**

1. **后端 API 实现**
   - [ ] 创建 `/api/tts/synthesize` 端点
   - [ ] 接入云端 TTS（Azure TTS 或 AWS Polly）
   - [ ] 解析 viseme 事件/speech marks
   - [ ] 返回 audio URL + viseme 时间戳数组

2. **前端 Viseme 播放器**
   - [ ] 创建 `VoicePlayer` 组件
   - [ ] Audio 播放 + viseme 时间戳同步
   - [ ] 实时更新 `currentViseme` 状态
   - [ ] 传递给 `AvatarPanel` 驱动口型

3. **AvatarPanel 改造**
   - [ ] 移除定时器模拟逻辑
   - [ ] 接收 `currentViseme` prop
   - [ ] 根据 viseme 实时更新嘴型

### Phase 4: STT 实现
**目标时间：8/16 上午 6:00 - 上午 9:00**

1. **语音识别**
   - [ ] Web Speech API 或云端 STT
   - [ ] 实时转写显示（字幕）
   - [ ] 语音结束检测（VAD）
   - [ ] 返回完整转写文本

2. **候选人语音输入**
   - [ ] 麦克风权限申请
   - [ ] 录音 UI（录音中状态）
   - [ ] 停止录音并转写

### Phase 5: LLM 实时追问
**目标时间：8/16 上午 9:00 - 上午 11:00**

1. **后端 LLM API**
   - [ ] 创建 `/api/llm/generate-question` 端点
   - [ ] 基于 JD + 候选人档案生成开场问题
   - [ ] 创建 `/api/llm/generate-followup` 端点
   - [ ] 基于候选人回答生成追问
   - [ ] 创建 `/api/llm/generate-assessment` 端点
   - [ ] 基于转写生成评估

2. **S6 场景重构**
   - [ ] 移除 mock 问题列表
   - [ ] LLM 实时生成问题
   - [ ] 显示问题 → TTS 播放 + lip-sync
   - [ ] 候选人语音回答 → STT 转写
   - [ ] LLM 生成追问 → 循环

### Phase 6: S7 评估改造
**目标时间：8/16 上午 11:00 - 中午 12:00**

1. **实时评估生成**
   - [ ] 移除预置评估结果
   - [ ] LLM 基于 S6 转写生成评估
   - [ ] 引用转写原文
   - [ ] 生成改进建议

### Phase 7: 全流程彩排
**目标时间：8/16 中午 12:00 - 下午 3:00**

1. **完整演示测试**
   - [ ] S0-S8 完整流程走通
   - [ ] Voice 问答测试（至少 3 轮）
   - [ ] 识别误差处理测试
   - [ ] Lip-sync 对齐检查（打点 5 处）
   - [ ] 两版 take 对照（不同回答 → 不同追问）

2. **录屏制作**
   - [ ] 全流程录屏（20 分钟主线）
   - [ ] 各场景 fallback 录屏
   - [ ] 备用演示视频

3. **Fallback 准备**
   - [ ] 文本输入兜底功能
   - [ ] API 失效降级方案
   - [ ] 网络断线处理

### Phase 8: 内部验收
**目标时间：8/16 下午 3:00 - 下午 5:00**

1. **Gate 验收**
   - [ ] Voice 真实识别验证（Ella + 技术 DRI）
   - [ ] Lip-sync 可见性验证（打点表，Ella）
   - [ ] CV 解析真实性验证（技术 DRI，Ella 抽核）
   - [ ] AI 追问真实性验证（两版对照，Ella）
   - [ ] S7 评估真实性验证（两版对照，Ella）
   - [ ] Simulated 标注检查（Ella）
   - [ ] 承诺一致性检查（Ella 否决权）
   - [ ] Fallback 就绪检查（内部验收会）
   - [ ] API 备用方案演练（技术 DRI）

2. **Go/No-Go 决策**
   - [ ] 薛天天拍板
   - [ ] 如果 No-Go：启动降级预案

### Phase 9: 最终交付
**目标时间：8/17（周一）**

1. **交付物准备**
   - [ ] Live 演示（20 分钟主线）
   - [ ] 全片录屏 + fallback 录屏
   - [ ] 分镜脚本（英文主讲）
   - [ ] 口径脚本（含 mock 追问 3 个标准 Q&A）
   - [ ] S6 真实 voice 问答录像
   - [ ] Lip-sync 打点时间戳表
   - [ ] 解析结果与 CV 原文对照
   - [ ] 追问与回答对应记录
   - [ ] 场景×承诺一致性核对表（Ella 签署）

2. **复现说明**
   - [ ] 原型地址
   - [ ] 数据包（`deliverables/demo-5302/`）
   - [ ] 云端 API 配置说明

## 技术栈选型建议

### 推荐方案 A：Azure
- **TTS**: Azure Speech Service（支持 viseme 事件）
- **STT**: Web Speech API（浏览器内置）或 Azure Speech
- **LLM**: Azure OpenAI GPT-4

### 推荐方案 B：AWS
- **TTS**: AWS Polly（支持 speech marks）
- **STT**: AWS Transcribe 或 Web Speech API
- **LLM**: AWS Bedrock Claude

### 推荐方案 C：混合
- **TTS**: Azure Speech（viseme 支持最好）
- **STT**: Web Speech API（免费，延迟低）
- **LLM**: OpenAI GPT-4（直接 API，最简单）

## 风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| TTS viseme 不准确 | 中 | 高 | 打点时间戳表手动验证，关键帧手动调整 |
| STT 识别率低 | 中 | 高 | 文本输入兜底，演示时选择清晰发音 |
| API 配额/限流 | 中 | 高 | 准备备用 key，降级到录屏 |
| 嘴型素材未就绪 | 中 | 中 | 保持当前 SVG ellipse 方案 |
| 时间不够 | 高 | 高 | 优先 S6 voice 核心场景，其他可 mock |

## 明确不做

- ❌ 本地模型实时推理
- ❌ 预渲染/播片冒充实时
- ❌ 把预置内容冒充真实 AI
- ❌ 把 demo 形象宣称为最终设计
- ❌ 情绪/人格识别标签
- ❌ 写实生成式口型
- ❌ 真实候选人数据（全合成）

## 人员分工（待确认）

- **语音链路**（TTS + viseme / STT）：UIS 1-2 人支援
- **LLM 面试逻辑与评估**：UIS 1-2 人支援
- **界面集成**：本地团队
- **彩排与验收**：Ella（否决权）+ 技术 DRI
- **主讲**：薛天天（英文）+ 甄云霄（操作）

## 检查清单

- [ ] 云端 API keys 到位（8/15 当天）
- [ ] TTS 支持 viseme/speech-mark（8/15 当天定型）
- [ ] 2D 嘴型素材（8/15 晚出，或静态图兜底）
- [ ] UIS 支援确认（8/15 当天回复）
- [ ] VRoid 建模停止（立即）
- [ ] 阿语降为 nice-to-have（已确认）
- [ ] Demo 走云端、生产 on-prem 口径统一（已确认）
- [ ] 8/16 内部验收会排期（待确认）

## 时间表汇总

| 时间段 | 任务 | 责任人 | 状态 |
|--------|------|--------|------|
| 8/15 深夜 - 8/16 凌晨 2:00 | API 准备 + 嘴型素材 | 技术 DRI | 待开始 |
| 8/16 凌晨 2:00 - 上午 6:00 | TTS + Viseme 实现 | 技术 DRI | 待开始 |
| 8/16 上午 6:00 - 上午 9:00 | STT 实现 | 技术 DRI | 待开始 |
| 8/16 上午 9:00 - 上午 11:00 | LLM 实时追问 | 技术 DRI | 待开始 |
| 8/16 上午 11:00 - 中午 12:00 | S7 评估改造 | 技术 DRI | 待开始 |
| 8/16 中午 12:00 - 下午 3:00 | 全流程彩排 + 录屏 | 全员 | 待开始 |
| 8/16 下午 3:00 - 下午 5:00 | 内部验收 Go/No-Go | Ella + 薛天天 | 待开始 |
| 8/17 | 向 OIA 交付 | 全员 | 待开始 |
