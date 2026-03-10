ConflictLens — 完成总结
项目结构
conflictlens/
├── server/                      # Python FastAPI 后端
│   ├── main.py                  # FastAPI 入口 + CORS
│   ├── config.py                # 环境变量 (LLM_API_KEY, MODEL)
│   ├── llm.py                   # OpenAI SDK 封装 (text + JSON mode)
│   ├── prompts.py               # 四步 LLM prompt 模板
│   ├── .env.example             # 环境变量模板
│   └── routes/
│       ├── assessment.py        # POST /api/assess
│       ├── dialogue.py          # POST /api/dialogue/generate, /reflect
│       ├── practice.py          # POST /api/practice/rewrite, /hint
│       └── summary.py           # POST /api/summary
├── src/                         # React 前端
│   ├── index.css                # 完整深色主题设计系统
│   ├── main.jsx                 # React 入口
│   ├── App.jsx                  # 步骤导航 + 动画
│   ├── context/AppContext.jsx   # 全局状态管理
│   ├── api/client.js            # API 请求封装
│   └── components/
│       ├── LandingHero.jsx      # 首页
│       ├── StepProgress.jsx     # 进度条
│       ├── ScenarioInput.jsx    # Step 1: 场景 + TKI 问卷
│       ├── ReflectiveDialogue.jsx # Step 2: 模拟对话反思
│       ├── PracticeMode.jsx     # Step 3: NVC 改写练习
│       └── SummaryReport.jsx    # Step 4: 个性化总结
├── index.html
├── package.json
└── vite.config.js               # Vite + API proxy → :8000
启动方式
bash
# 1. 配置 API Key
cp server/.env.example server/.env
# 编辑 server/.env，填入你的 OpenAI API Key
# 2. 启动后端
source ~/miniconda3/bin/activate
uvicorn server.main:app --port 8000
# 3. 启动前端 (另一个终端)
npm run dev
# 访问 http://localhost:5173
四步闭环流程
步骤	功能	LLM 能力
识别	描述冲突 + 10题 TKI 问卷	分析双方冲突风格、优势、盲点
反思	阅读 AI 生成的模拟对话	生成带四骑士标注的冲突对话 + 反思反馈
练习	改写负面表达	实时 NVC 评分 + 改写建议 + 提示
总结	查看个性化报告	冲突档案 + 行为模式 + 行动建议 + 沟通锦囊
验证结果
✅ npm run build — 前端构建成功
✅ FastAPI 启动成功, /api/health 返回 {"status":"ok"}
✅ 前端 dev server 运行正常 (:5173)
⚠️ 需要配置 server/.env 中的 LLM_API_KEY 才能使用 LLM 功能