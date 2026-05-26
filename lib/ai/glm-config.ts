/** 智谱 GLM OpenAI 兼容端点（与 generate route 一致） */
export function getGlmBaseUrl(): string {
  return (process.env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/paas')
    .replace(/\/v4\/chat\/completions\/?$/, '')
    .replace(/\/v4\/?$/, '')
}

export function getGlmOpenAiBaseUrl(): string {
  return `${getGlmBaseUrl()}/v4`
}
