/**
 * 音频播放工具单元测试
 */
import { getVoiceSettings, saveVoiceSettings } from '@/lib/audio-player'

describe('VoiceSettings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('返回默认设置', () => {
    const settings = getVoiceSettings()
    expect(settings.autoPlay).toBe(true)
    expect(settings.volume).toBe(1.0)
    expect(settings.speed).toBe(1.0)
  })

  it('保存并读取设置', () => {
    saveVoiceSettings({ autoPlay: false, volume: 0.5 })
    const settings = getVoiceSettings()
    expect(settings.autoPlay).toBe(false)
    expect(settings.volume).toBe(0.5)
    expect(settings.speed).toBe(1.0) // 未修改的保持默认
  })

  it('部分更新不覆盖其他设置', () => {
    saveVoiceSettings({ speed: 1.5 })
    saveVoiceSettings({ volume: 0.8 })
    const settings = getVoiceSettings()
    expect(settings.speed).toBe(1.5)
    expect(settings.volume).toBe(0.8)
    expect(settings.autoPlay).toBe(true)
  })
})
