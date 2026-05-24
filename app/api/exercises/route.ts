import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/exercises - 获取练习题
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const materialId = searchParams.get('material_id')
  const subject = searchParams.get('subject')
  const difficulty = searchParams.get('difficulty')
  const limit = parseInt(searchParams.get('limit') || '10')

  let query = supabase.from('exercises').select('*, materials!inner(subject)')

  if (materialId) query = query.eq('material_id', materialId)
  if (subject) query = query.eq('materials.subject', subject)
  if (difficulty) query = query.eq('difficulty', difficulty)

  const { data, error } = await query.limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/exercises - 创建练习题
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('exercises')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
