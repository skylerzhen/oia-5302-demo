const PROVIDERS = {
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    defaultFastModel: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    label: 'DeepSeek',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    defaultFastModel: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
    label: 'OpenAI',
  },
}

function resolveProviderName() {
  const configured = process.env.LLM_PROVIDER?.trim().toLowerCase()
  if (configured && PROVIDERS[configured]) return configured
  if (process.env.DEEPSEEK_API_KEY?.trim()) return 'deepseek'
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai'
  return 'deepseek'
}

export function getLlmConfig() {
  const providerName = resolveProviderName()
  const provider = PROVIDERS[providerName]
  const apiKey = process.env[provider.apiKeyEnv]?.trim()
  const baseUrl = process.env.LLM_BASE_URL?.trim() || provider.baseUrl

  return {
    provider: providerName,
    label: provider.label,
    apiKey,
    baseUrl,
    model: process.env.LLM_MODEL?.trim() || provider.defaultModel,
    fastModel: process.env.LLM_MODEL_FAST?.trim() || provider.defaultFastModel,
    available: Boolean(apiKey),
  }
}

async function chatCompletion({ system, user, model, temperature, json = false }) {
  const config = getLlmConfig()
  if (!config.apiKey) {
    throw new Error(`${config.label} API key is not configured`)
  }

  const body = {
    model: model ?? config.model,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }

  if (json) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${config.label} request failed (${response.status}): ${detail}`)
  }

  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error(`${config.label} returned an empty response`)
  return content
}

export async function chatJson({ system, user, model, temperature = 0.2 }) {
  const content = await chatCompletion({
    system,
    user,
    model: model ?? getLlmConfig().model,
    temperature,
    json: true,
  })
  return JSON.parse(content)
}

export async function chatText({ system, user, model, temperature = 0.4 }) {
  const content = await chatCompletion({
    system,
    user,
    model: model ?? getLlmConfig().fastModel,
    temperature,
    json: false,
  })
  return content.trim()
}
