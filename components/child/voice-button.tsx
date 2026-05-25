'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { springBouncy } from '@/lib/animations'
import { isBrowserSTTSupported, startBrowserSTT } from '@/lib/voice/browser-speech'

interface VoiceButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void
  onTextResult?: (text: string) => void
  useBrowserSTT?: boolean
  disabled?: boolean
  maxDuration?: number // 最长录音秒数，默认 60
}

type VoiceStatus = 'idle' | 'recording' | 'processing'

/**
 * 语音录音按钮
 * 交互：按住录音 → 松开发送 → 滑出取消
 * 使用 Web Audio API 获取实时波形，MediaRecorder 录音
 */
export default function VoiceButton({
  onRecordingComplete,
  onTextResult,
  useBrowserSTT = false,
  disabled = false,
  maxDuration = 60,
}: VoiceButtonProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [amplitude, setAmplitude] = useState(0)
  const [isCancelled, setIsCancelled] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const browserStopRef = useRef<(() => void) | null>(null)
  const browserTranscriptRef = useRef('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 安全关闭 AudioContext（防止重复关闭报错）
  const closeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => { /* ignore */ })
    }
    audioContextRef.current = null
  }, [])

  // 清理资源
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    closeAudioContext()
    mediaRecorderRef.current = null
    browserStopRef.current = null
    browserTranscriptRef.current = ''
    analyserRef.current = null
    chunksRef.current = []
    timerRef.current = null
    animFrameRef.current = null
  }, [closeAudioContext])

  // 波形振幅实时更新（用函数声明避免循环引用问题）
  function updateAmplitude() {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length
    setAmplitude(avg / 255) // 归一化到 0-1
    animFrameRef.current = requestAnimationFrame(updateAmplitude)
  }

  // 开始录音
  async function startRecording() {
    if (disabled) return

    try {
      if (useBrowserSTT) {
        if (!isBrowserSTTSupported()) {
          console.error('浏览器不支持语音识别')
          return
        }

        browserTranscriptRef.current = ''
        const stop = startBrowserSTT({
          lang: 'zh-CN',
          continuous: false,
          onResult: (text) => {
            browserTranscriptRef.current = text
          },
          onError: (error) => {
            console.error('浏览器语音识别失败:', error)
          },
        })

        if (!stop) return
        browserStopRef.current = stop
        setStatus('recording')
        setDuration(0)
        setIsCancelled(false)
        timerRef.current = setInterval(() => {
          setDuration(prev => {
            if (prev >= maxDuration - 1) {
              stopRecording(false)
              return prev
            }
            return prev + 1
          })
        }, 1000)
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // 设置 AudioContext 用于波形
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(100) // 每 100ms 收集一次数据
      setStatus('recording')
      setDuration(0)
      setIsCancelled(false)

      // 计时
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration - 1) {
            stopRecording(false)
            return prev
          }
          return prev + 1
        })
      }, 1000)

      // 波形动画
      updateAmplitude()
    } catch {
      // 权限被拒或不支持
      console.error('无法获取麦克风权限')
    }
  }

  // 停止录音
  function stopRecording(cancelled: boolean) {
    if (status !== 'recording') return

    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    if (useBrowserSTT) {
      browserStopRef.current?.()
      const text = browserTranscriptRef.current.trim()
      cleanup()
      setStatus('idle')
      setAmplitude(0)
      if (!cancelled && text) {
        onTextResult?.(text)
      }
      return
    }

    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording') {
      cleanup()
      setStatus('idle')
      return
    }

    if (cancelled) {
      recorder.stop()
      cleanup()
      setStatus('idle')
      setAmplitude(0)
      return
    }

    // 正常结束 → 收集数据
    setStatus('processing')
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      })
      if (blob.size > 0 && duration >= 1) {
        onRecordingComplete(blob)
      }
      cleanup()
      setAmplitude(0)
      setTimeout(() => setStatus('idle'), 2000)
    }
    recorder.stop()
    closeAudioContext()
  }

  // 手指/鼠标滑出检测
  function handlePointerMove(e: PointerEvent) {
    if (status !== 'recording' || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const outOfBounds =
      e.clientX < rect.left - 50 ||
      e.clientX > rect.right + 50 ||
      e.clientY < rect.top - 50 ||
      e.clientY > rect.bottom + 50

    setIsCancelled(outOfBounds)
  }

  // 全局事件监听（录音中）
  useEffect(() => {
    if (status === 'recording') {
      const handleUp = () => stopRecording(isCancelled)
      const handleMove = (e: PointerEvent) => handlePointerMove(e)
      window.addEventListener('pointerup', handleUp)
      window.addEventListener('pointermove', handleMove)
      return () => {
        window.removeEventListener('pointerup', handleUp)
        window.removeEventListener('pointermove', handleMove)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isCancelled])

  // 格式化时间
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="relative flex flex-col items-center">
      {/* 录音中提示 */}
      <AnimatePresence>
        {status === 'recording' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 text-center whitespace-nowrap"
          >
            <span className="text-sm font-medium" style={{ color: isCancelled ? '#EF5350' : '#5D4E4A' }}>
              {isCancelled ? '松开取消' : `${formatTime(duration)} 松开发送`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 处理中提示 */}
      <AnimatePresence>
        {status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute -top-12 text-center whitespace-nowrap"
          >
            <span className="text-sm font-medium text-muted-brown">精灵在听...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 脉冲环（录音中） */}
      <AnimatePresence>
        {status === 'recording' && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 80,
              height: 80,
              border: '2px solid rgba(239, 83, 80, 0.3)',
            }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: [1, 1.3 + amplitude * 0.4, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>

      {/* 主按钮 */}
      <motion.button
        ref={buttonRef}
        className="relative flex items-center justify-center rounded-full touch-target select-none"
        style={{
          width: status === 'recording' ? 80 : 56,
          height: status === 'recording' ? 80 : 56,
          backgroundColor: status === 'recording'
            ? (isCancelled ? '#9E9E9E' : '#EF5350')
            : status === 'processing'
              ? '#FFB300'
              : '#FFB300',
          boxShadow: '0 4px 12px rgba(255,179,0,0.3)',
        }}
        animate={{
          scale: status === 'recording' ? 1.1 : 1,
          width: status === 'recording' ? 80 : 56,
          height: status === 'recording' ? 80 : 56,
        }}
        transition={springBouncy}
        whileTap={status === 'idle' ? { scale: 0.95 } : undefined}
        onPointerDown={(e) => {
          e.preventDefault()
          if (status === 'idle') startRecording()
        }}
        disabled={disabled || status === 'processing'}
        aria-label={status === 'recording' ? '松开发送' : '按住录音'}
      >
        {status === 'idle' && <span className="text-2xl">🎤</span>}
        {status === 'recording' && (
          <motion.div
            className="flex gap-0.5 items-end h-6"
            animate={{ opacity: 1 }}
          >
            {/* 简单波形条 */}
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-white"
                animate={{
                  height: 8 + amplitude * 16 * (1 + Math.sin(i * 1.2)),
                }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </motion.div>
        )}
        {status === 'processing' && (
          <motion.span
            className="text-xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⏳
          </motion.span>
        )}
      </motion.button>
    </div>
  )
}
