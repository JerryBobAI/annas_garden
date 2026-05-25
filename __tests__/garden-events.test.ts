import { applyGardenEvent, type GardenSupabaseClient } from '@/lib/garden/events'

class FakeGardenBuilder {
  private values: Record<string, unknown> | null = null

  insert(values: Record<string, unknown>) {
    this.values = values
    return this
  }

  update() { return this }
  select() { return this }
  eq() { return this }
  in() { return this }
  overlaps() { return this }
  order() { return this }
  limit() { return this }

  async single() {
    return {
      data: {
        id: 'plant-1',
        created_at: '2026-05-26T00:00:00.000Z',
        last_watered_at: null,
        ...this.values,
      },
      error: null,
    }
  }

  then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(onfulfilled?.({ data: [], error: null }) as TResult1)
  }
}

describe('applyGardenEvent', () => {
  it('seed_planted 会创建带随机安全位置的新植物', async () => {
    const builder = new FakeGardenBuilder()
    const supabase = { from: () => builder } as unknown as GardenSupabaseClient

    const result = await applyGardenEvent({
      supabase,
      childId: 'child-1',
      event: 'seed_planted',
      conversationId: 'conv-1',
      knowledgeTags: ['加法'],
      subject: 'math',
    })

    expect(result.action).toBe('created')
    expect(result.plant?.child_id).toBe('child-1')
    expect(result.plant?.plant_type).toBe('seed')
    expect(result.plant?.position_x).toBeGreaterThanOrEqual(10)
    expect(result.plant?.position_x).toBeLessThanOrEqual(90)
  })
})
