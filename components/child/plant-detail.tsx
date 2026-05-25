'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { springBouncy } from '@/lib/animations'
import { getPlantEmoji } from '@/lib/garden/growth'
import type { GardenPlant } from '@/lib/garden/growth'
import Link from 'next/link'

interface PlantDetailProps {
  plant: GardenPlant | null
  onClose: () => void
}

/**
 * 植物详情弹窗
 * 点击花园中的植物弹出：名称、学科、知识点、成长历程、来源对话
 */
export default function PlantDetail({ plant, onClose }: PlantDetailProps) {
  if (!plant) return null

  const emoji = getPlantEmoji(plant.plant_type, plant.subject)
  const subjectNames: Record<string, string> = {
    math: '数学',
    chinese: '语文',
    english: '英语',
  }

  // 成长历程（基于 growth_stage 推算）
  const stages = [
    { emoji: '🌰', label: '种下', reached: plant.growth_stage >= 0 },
    { emoji: '🌱', label: '发芽', reached: plant.growth_stage >= 25 },
    { emoji: '🌿', label: '成长', reached: plant.growth_stage >= 50 },
    { emoji: getPlantEmoji('blooming', plant.subject), label: '开花', reached: plant.growth_stage >= 100 },
  ]

  return (
    <AnimatePresence>
      {plant && (
        <>
          {/* 遮罩 */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* 弹窗 */}
          <motion.div
            className="fixed inset-x-4 bottom-8 z-50 max-w-md mx-auto"
            initial={{ y: 100, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.9 }}
            transition={springBouncy}
          >
            <div className="card rounded-soft p-6">
              {/* 头部 */}
              <div className="text-center mb-4">
                <span className="text-5xl">{emoji}</span>
                <h3 className="text-lg font-bold mt-2" style={{ color: '#3A2E2C' }}>
                  {plant.name || '未命名植物'}
                </h3>
                <p className="text-sm text-muted-brown">
                  {plant.subject ? subjectNames[plant.subject] : '综合'}
                  {plant.knowledge_tags?.length > 0 && ` · ${plant.knowledge_tags[0]}`}
                </p>
              </div>

              {/* 成长进度 */}
              <div className="mb-4">
                <div className="h-2 rounded-full bg-progress-track overflow-hidden">
                  <motion.div
                    className="h-full bg-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${plant.growth_stage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-brown mt-1 text-right">{plant.growth_stage}%</p>
              </div>

              {/* 成长历程 */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2" style={{ color: '#5D4E4A' }}>📈 成长历程</h4>
                <div className="flex justify-between">
                  {stages.map((s, i) => (
                    <div key={i} className={`flex flex-col items-center gap-1 ${s.reached ? '' : 'opacity-30'}`}>
                      <span className="text-2xl">{s.emoji}</span>
                      <span className="text-xs text-muted-brown">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 知识点 */}
              {plant.knowledge_tags?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: '#5D4E4A' }}>📝 关联知识点</h4>
                  <div className="flex flex-wrap gap-2">
                    {plant.knowledge_tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: 'rgba(255,179,0,0.12)', color: '#8B7355' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 来源对话 */}
              {plant.source_conversation_id && (
                <Link
                  href={`/child/chat?conversationId=${plant.source_conversation_id}`}
                  className="block text-center text-sm py-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255,179,0,0.1)', color: '#FFB300' }}
                >
                  💬 查看对话
                </Link>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className="w-full mt-4 py-3 text-center text-sm font-medium text-muted-brown touch-target"
              >
                关闭
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
