/**
 * 等待音效 — 精灵思考时播放轻快的叮咚声
 *
 * 使用 Web Audio API 合成，零依赖、零网络请求
 * 音色：柔和的钢片琴/音乐盒风格，适合儿童
 */

let audioCtx: AudioContext | null = null
let isPlaying = false
let timeoutId: ReturnType<typeof setTimeout> | null = null

// C 大调五声音阶（do re mi sol la），适合欢快感
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.00] // C5 D5 E5 G5 A5
const NOTE_DURATION = 0.15  // 每个音符持续时间（秒）
const GAP = 0.12             // 音符间隔（秒）
const PATTERN_GAP = 1.2      // 一组音符播完后的间隔（秒）
const VOLUME = 0.08          // 音量（很轻柔，不抢 TTS）

/**
 * 播放一组叮咚音符
 */
function playPattern() {
  if (!isPlaying || !audioCtx) return

  // 随机选 2-3 个音符组成一小段旋律
  const count = 2 + Math.floor(Math.random() * 2)
  const now = audioCtx.currentTime

  for (let i = 0; i < count; i++) {
    const noteIdx = Math.floor(Math.random() * NOTES.length)
    const freq = NOTES[noteIdx]
    const startTime = now + i * (NOTE_DURATION + GAP)

    // 振荡器：正弦波（最柔和）
    const osc = audioCtx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq

    // 增益包络：快起慢落，像音乐盒
    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(VOLUME, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + NOTE_DURATION)

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    osc.start(startTime)
    osc.stop(startTime + NOTE_DURATION + 0.05)
  }

  // 一组播完后等一会儿再播下一组
  const totalDuration = count * (NOTE_DURATION + GAP) + PATTERN_GAP
  timeoutId = setTimeout(playPattern, totalDuration * 1000)
}

/**
 * 开始播放等待音效（精灵思考时调用）
 * 安全：重复调用不会叠加
 */
export function startWaitingSound() {
  if (isPlaying) return
  if (typeof window === 'undefined') return

  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    // 如果 AudioContext 被浏览器暂停（用户未交互），尝试恢复
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }

    isPlaying = true
    // 延迟 0.8 秒再开始，避免太快的响应也响
    timeoutId = setTimeout(playPattern, 800)
  } catch {
    // Web Audio API 不可用，静默降级
  }
}

/**
 * 停止等待音效（AI 开始回复时调用）
 */
export function stopWaitingSound() {
  isPlaying = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}
