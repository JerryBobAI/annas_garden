import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/garden/stats
 * 花园统计：植物总数、各阶段分布、学科分布
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { data: plants, error } = await supabase
    .from('garden_plants')
    .select('id, plant_type, subject, growth_stage')
    .eq('child_id', user.id)

  if (error) {
    console.error('Garden stats error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }

  const allPlants = plants || []

  // 各阶段分布
  const stages = {
    seed: allPlants.filter(p => p.plant_type === 'seed').length,
    sprout: allPlants.filter(p => p.plant_type === 'sprout').length,
    growing: allPlants.filter(p => p.plant_type === 'growing').length,
    blooming: allPlants.filter(p => p.plant_type === 'blooming').length,
    withered: allPlants.filter(p => p.plant_type === 'withered').length,
  }

  // 学科分布
  const subjects = {
    math: allPlants.filter(p => p.subject === 'math').length,
    chinese: allPlants.filter(p => p.subject === 'chinese').length,
    english: allPlants.filter(p => p.subject === 'english').length,
  }

  return NextResponse.json({
    total: allPlants.length,
    stages,
    subjects,
  })
}
