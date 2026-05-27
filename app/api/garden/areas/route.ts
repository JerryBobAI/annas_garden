import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GARDEN_AREAS, checkAreaUnlockStatus } from '@/lib/garden/areas'

/**
 * GET /api/garden/areas
 * 获取花园区域及解锁状态
 * 如果是新用户，自动初始化默认区域
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  // 获取该孩子的植物统计（按学科分组）
  const { data: plants } = await supabase
    .from('garden_plants')
    .select('id, subject, plant_type')
    .eq('child_id', user.id)

  const allPlants = plants || []
  const plantsBySubject: Record<string, number> = {}
  let totalBlooming = 0

  for (const p of allPlants) {
    if (p.subject) {
      plantsBySubject[p.subject] = (plantsBySubject[p.subject] || 0) + 1
    }
    if (p.plant_type === 'blooming') totalBlooming++
  }

  // 计算解锁状态
  const unlockStatuses = checkAreaUnlockStatus(plantsBySubject, totalBlooming)

  // 查数据库中的已有区域记录
  const { data: existingAreas } = await supabase
    .from('garden_areas')
    .select('*')
    .eq('child_id', user.id)

  const existingMap = new Map(
    (existingAreas || []).map((a: { area_name: string; is_unlocked: boolean }) => [a.area_name, a])
  )

  // 合并：配置 + 数据库记录 + 动态解锁状态
  const areas = GARDEN_AREAS.map(config => {
    const status = unlockStatuses.find(s => s.area_name === config.area_name)
    const dbRecord = existingMap.get(config.area_name)

    // 如果数据库记录已解锁，保持解锁（不会反锁）
    const dbUnlocked = dbRecord?.is_unlocked
    const shouldUnlock = status?.is_unlocked || dbUnlocked

    // 如果需要解锁但数据库未记录，写入
    if (shouldUnlock && !dbUnlocked && config.area_type === 'unlockable') {
      // 异步写入，不阻塞响应
      void supabase.from('garden_areas').upsert({
        child_id: user.id,
        area_name: config.area_name,
        area_type: config.area_type,
        subject: config.subject,
        is_unlocked: true,
        unlock_condition: config.unlockCondition,
        position_x: config.bounds.x,
        position_y: config.bounds.y,
        width: config.bounds.w,
        height: config.bounds.h,
      }, { onConflict: 'child_id,area_name' })
    }

    return {
      area_name: config.area_name,
      label: config.label,
      emoji: config.emoji,
      subject: config.subject,
      bounds: config.bounds,
      bgColor: config.bgColor,
      is_unlocked: shouldUnlock,
      unlock_progress: status?.progress ?? 1,
      unlock_current: status?.current ?? 0,
      unlock_required: status?.required ?? 0,
      unlock_description: config.unlockDescription,
    }
  })

  return NextResponse.json({ areas })
}
