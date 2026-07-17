# chat/src/config/
> L2 | 父级: ../../CLAUDE.md

成员清单
env.ts: zod 校验 PORT、ALLOWED_ORIGINS、DEEPSEEK_API_KEY、DEFAULT_MODEL、MAX_STEPS、MAX_OUTPUT_TOKENS、SUPABASE_*
models.ts: MODEL_WHITELIST、resolveModel、toMastraModelConfig（{ url, id, apiKey }）

法则: API key 只从环境变量读，禁止硬编码

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
