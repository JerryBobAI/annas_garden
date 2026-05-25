import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  processGardenEvent,
  stageToType,
  generatePlantName,
  type GardenEventType,
  type Subject,
} from '@/lib/garden/growth'

/**
 * POST /api/garden/event
 * 处理来自 AI 对话的花园事件
 * Body: { event, conversationId, knowledgeTags, subject }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const body = await request.json()
  const {
    event,
    conversationId,
    knowledgeTags = [],
    subject,
  } = body as {
    event: GardenEventType
    conversationId?: string
    knowledgeTags?: string[]
    subject?: Subject
  }

  if (!event) {
    return NextResponse.json({ error: '缺少事件类型' }, { status: 400 })
  }

  const action = processGardenEvent(event, conversationId || '', knowledgeTags, subject)

  try {
    if (action.type === 'create') {
      // 创建新植物
      const name = generatePlantName(knowledgeTags, subject)
      const { data: plant, error } = await supabase
        .from('garden_plants')
        .insert({
          child_id: user.id,
          name,
          ...action.plant,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        action: 'created',
        plant,
        message: `🌱 新种子「${name}」种下了！`,
      })
    }

    if (action.type === 'upgrade' && action.match) {
      // 查找匹配的植物
      let query = supabase
        .from('garden_plants')
        .select('*')
        .eq('child_id', user.id)

      if (action.match.plant_type) {
        query = query.in('plant_type', action.match.plant_type)
      }

      // 按知识标签匹配
      if (action.match.knowledge_tags.length > 0) {
        query = query.overlaps('knowledge_tags', action.match.knowledge_tags)
      }

      const { data: candidates } = await query.order('created_at', { ascending: false }).limit(1)

      if (candidates && candidates.length > 0) {
        const target = candidates[0]
        let newStage = target.growth_stage

        if (action.upgrade?.growth_stage !== undefined) {
          newStage = action.upgrade.growth_stage
        } else if (action.upgrade?.growth_stage_increment) {
          newStage = Math.min(100, target.growth_stage + action.upgrade.growth_stage_increment)
        }

        const newType = action.upgrade?.plant_type || stageToType(newStage)

        const { data: updated, error } = await supabase
          .from('garden_plants')
          .update({
            growth_stage: newStage,
            plant_type: newType,
            last_watered_at: new Date().toISOString(),
          })
          .eq('id', target.id)
          .select()
          .single()

        if (error) throw error

        const emoji = newType === 'blooming' ? '🌸' : newType === 'growing' ? '🌿' : '🌱'
        return NextResponse.json({
          action: 'upgraded',
          plant: updated,
          message: `${emoji}「${target.name}」长大了！(${newStage}%)`,
        })
      }

      // 没有匹配的植物 → 自动种一颗新的
      const name = generatePlantName(knowledgeTags, subject)
      const { data: plant, error } = await supabase
        .from('garden_plants')
        .insert({
          child_id: user.id,
          name,
          plant_type: 'seed',
          growth_stage: 0,
          subject: subject || null,
          knowledge_tags: knowledgeTags,
          source_conversation_id: conversationId || null,
          position_x: Math.random() * 80 + 10,
          position_y: Math.random() * 60 + 20,
        })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        action: 'created',
        plant,
        message: `🌱 新种子「${name}」种下了！`,
      })
    }

    return NextResponse.json({ action: 'none', message: '没有变化' })
  } catch (error) {
    console.error('Garden event error:', error)
    return NextResponse.json({ error: '花园更新失败' }, { status: 500 })
  }
}
