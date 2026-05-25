import {
  generatePlantName,
  processGardenEvent,
  stageToType,
  type GardenEventType,
  type GardenPlant,
  type Subject,
} from '@/lib/garden/growth'

type QueryResult<T> = Promise<{ data: T | null; error?: unknown; count?: number | null }>

interface GardenQueryBuilder<T = unknown> {
  insert(values: Record<string, unknown> | Record<string, unknown>[]): GardenQueryBuilder<T>
  update(values: Record<string, unknown>): GardenQueryBuilder<T>
  select(columns?: string, options?: Record<string, unknown>): GardenQueryBuilder<T>
  eq(column: string, value: unknown): GardenQueryBuilder<T>
  in(column: string, values: unknown[]): GardenQueryBuilder<T>
  overlaps(column: string, values: unknown[]): GardenQueryBuilder<T>
  order(column: string, options?: Record<string, unknown>): GardenQueryBuilder<T>
  limit(count: number): GardenQueryBuilder<T>
  single(): QueryResult<T>
  then<TResult1 = { data: T | null; error?: unknown; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T | null; error?: unknown; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>
}

export interface GardenSupabaseClient {
  from<T = unknown>(table: string): GardenQueryBuilder<T>
}

export interface ApplyGardenEventInput {
  supabase: GardenSupabaseClient
  childId: string
  event: GardenEventType
  conversationId?: string
  knowledgeTags?: string[]
  subject?: Subject
}

export interface ApplyGardenEventResult {
  action: 'created' | 'upgraded' | 'none'
  plant?: GardenPlant
  message: string
}

export async function applyGardenEvent({
  supabase,
  childId,
  event,
  conversationId,
  knowledgeTags = [],
  subject,
}: ApplyGardenEventInput): Promise<ApplyGardenEventResult> {
  const action = processGardenEvent(event, conversationId || '', knowledgeTags, subject)

  if (action.type === 'create') {
    const name = generatePlantName(knowledgeTags, subject)
    const { data: plant, error } = await supabase
      .from<GardenPlant>('garden_plants')
      .insert({
        child_id: childId,
        name,
        ...action.plant,
      })
      .select()
      .single()

    if (error) throw error
    if (!plant) return { action: 'none', message: '没有变化' }

    return {
      action: 'created',
      plant,
      message: `🌱 新种子「${name}」种下了！`,
    }
  }

  if (action.type === 'upgrade' && action.match) {
    let query = supabase
      .from<GardenPlant[]>('garden_plants')
      .select('*')
      .eq('child_id', childId)

    if (action.match.plant_type) {
      query = query.in('plant_type', action.match.plant_type)
    }

    if (action.match.knowledge_tags.length > 0) {
      query = query.overlaps('knowledge_tags', action.match.knowledge_tags)
    }

    const { data: candidates } = await query.order('created_at', { ascending: false }).limit(1)

    if (!candidates || candidates.length === 0) {
      return createFallbackSeed(supabase, childId, conversationId, knowledgeTags, subject)
    }

    const target = candidates[0]
    const newStage = action.upgrade?.growth_stage !== undefined
      ? action.upgrade.growth_stage
      : Math.min(100, target.growth_stage + (action.upgrade?.growth_stage_increment || 0))
    const newType = action.upgrade?.plant_type || stageToType(newStage)

    const { data: updated, error } = await supabase
      .from<GardenPlant>('garden_plants')
      .update({
        growth_stage: newStage,
        plant_type: newType,
        last_watered_at: new Date().toISOString(),
      })
      .eq('id', target.id)
      .select()
      .single()

    if (error) throw error
    if (!updated) return { action: 'none', message: '没有变化' }

    const emoji = newType === 'blooming' ? '🌸' : newType === 'growing' ? '🌿' : '🌱'
    return {
      action: 'upgraded',
      plant: updated,
      message: `${emoji}「${target.name}」长大了！(${newStage}%)`,
    }
  }

  return { action: 'none', message: '没有变化' }
}

async function createFallbackSeed(
  supabase: GardenSupabaseClient,
  childId: string,
  conversationId: string | undefined,
  knowledgeTags: string[],
  subject: Subject | undefined,
): Promise<ApplyGardenEventResult> {
  const name = generatePlantName(knowledgeTags, subject)
  const { data: plant, error } = await supabase
    .from<GardenPlant>('garden_plants')
    .insert({
      child_id: childId,
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
  if (!plant) return { action: 'none', message: '没有变化' }

  return {
    action: 'created',
    plant,
    message: `🌱 新种子「${name}」种下了！`,
  }
}
