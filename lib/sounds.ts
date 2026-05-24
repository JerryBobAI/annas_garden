let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(freq: number, type: OscillatorType, duration: number, volume: number, delay = 0) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = type
  osc.frequency.value = freq
  gain.gain.value = volume

  osc.connect(gain)
  gain.connect(ctx.destination)

  const start = ctx.currentTime + delay
  osc.start(start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.stop(start + duration)
}

/** 答对 — 上行双音 C5→E5，正弦波 */
export function playCorrect() {
  playTone(523.25, 'sine', 0.15, 0.2, 0)
  playTone(659.25, 'sine', 0.2, 0.2, 0.1)
}

/** 答错 — 下行双音 E4→C4，三角波 */
export function playWrong() {
  playTone(329.63, 'triangle', 0.2, 0.15, 0)
  playTone(261.63, 'triangle', 0.3, 0.15, 0.15)
}

/** 按钮点击 — 短促单音 C5 */
export function playTap() {
  playTone(523.25, 'sine', 0.08, 0.1, 0)
}

/** 成就/完成 — 上行三音 C5→E5→G5 */
export function playSuccess() {
  playTone(523.25, 'sine', 0.15, 0.2, 0)
  playTone(659.25, 'sine', 0.15, 0.2, 0.12)
  playTone(783.99, 'sine', 0.25, 0.2, 0.24)
}

/** 页面切换 — 极短柔音 G4 */
export function playNavigate() {
  playTone(392.00, 'sine', 0.1, 0.08, 0)
}
