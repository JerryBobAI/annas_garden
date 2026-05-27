import { checkAreaUnlockStatus, assignPlantToArea, GARDEN_AREAS } from '../areas'

describe('Garden Areas', () => {
  describe('GARDEN_AREAS config', () => {
    it('has 4 areas', () => {
      expect(GARDEN_AREAS).toHaveLength(4)
    })

    it('has one default area', () => {
      const defaults = GARDEN_AREAS.filter(a => a.area_type === 'default')
      expect(defaults).toHaveLength(1)
      expect(defaults[0].area_name).toBe('综合花园')
    })

    it('has three unlockable subject areas', () => {
      const unlockable = GARDEN_AREAS.filter(a => a.area_type === 'unlockable')
      expect(unlockable).toHaveLength(3)
      const subjects = unlockable.map(a => a.subject).sort()
      expect(subjects).toEqual(['chinese', 'english', 'math'])
    })

    it('all areas have valid bounds (0-100%)', () => {
      for (const area of GARDEN_AREAS) {
        expect(area.bounds.x).toBeGreaterThanOrEqual(0)
        expect(area.bounds.y).toBeGreaterThanOrEqual(0)
        expect(area.bounds.x + area.bounds.w).toBeLessThanOrEqual(100)
        expect(area.bounds.y + area.bounds.h).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('checkAreaUnlockStatus', () => {
    it('default area is always unlocked', () => {
      const statuses = checkAreaUnlockStatus({}, 0)
      const defaultArea = statuses.find(s => s.area_name === '综合花园')
      expect(defaultArea?.is_unlocked).toBe(true)
    })

    it('subject area locked when no plants', () => {
      const statuses = checkAreaUnlockStatus({}, 0)
      const mathArea = statuses.find(s => s.area_name === '数学花田')
      expect(mathArea?.is_unlocked).toBe(false)
      expect(mathArea?.progress).toBe(0)
    })

    it('subject area partially progressed', () => {
      const statuses = checkAreaUnlockStatus({ math: 2 }, 0)
      const mathArea = statuses.find(s => s.area_name === '数学花田')
      expect(mathArea?.is_unlocked).toBe(false)
      expect(mathArea?.progress).toBeCloseTo(2 / 3)
      expect(mathArea?.current).toBe(2)
      expect(mathArea?.required).toBe(3)
    })

    it('subject area unlocked when condition met', () => {
      const statuses = checkAreaUnlockStatus({ math: 3 }, 0)
      const mathArea = statuses.find(s => s.area_name === '数学花田')
      expect(mathArea?.is_unlocked).toBe(true)
      expect(mathArea?.progress).toBe(1)
    })

    it('exceeding condition still unlocked', () => {
      const statuses = checkAreaUnlockStatus({ chinese: 10 }, 0)
      const chineseArea = statuses.find(s => s.area_name === '语文花园')
      expect(chineseArea?.is_unlocked).toBe(true)
    })

    it('multiple areas can be unlocked independently', () => {
      const statuses = checkAreaUnlockStatus({ math: 3, chinese: 3, english: 1 }, 2)
      expect(statuses.find(s => s.area_name === '数学花田')?.is_unlocked).toBe(true)
      expect(statuses.find(s => s.area_name === '语文花园')?.is_unlocked).toBe(true)
      expect(statuses.find(s => s.area_name === '英语花坊')?.is_unlocked).toBe(false)
    })
  })

  describe('assignPlantToArea', () => {
    const allUnlocked = () => true
    const noneUnlocked = (s: string | null) => s === null  // 只有综合花园解锁

    it('assigns plant to subject area when unlocked', () => {
      const pos = assignPlantToArea('math', allUnlocked)
      const mathArea = GARDEN_AREAS.find(a => a.subject === 'math')!
      expect(pos.x).toBeGreaterThanOrEqual(mathArea.bounds.x)
      expect(pos.x).toBeLessThanOrEqual(mathArea.bounds.x + mathArea.bounds.w)
    })

    it('falls back to default when subject area locked', () => {
      const pos = assignPlantToArea('math', noneUnlocked)
      const defaultArea = GARDEN_AREAS[0]
      expect(pos.x).toBeGreaterThanOrEqual(defaultArea.bounds.x)
      expect(pos.x).toBeLessThanOrEqual(defaultArea.bounds.x + defaultArea.bounds.w)
    })

    it('null subject goes to default area', () => {
      const pos = assignPlantToArea(null, allUnlocked)
      const defaultArea = GARDEN_AREAS[0]
      expect(pos.x).toBeGreaterThanOrEqual(defaultArea.bounds.x)
      expect(pos.x).toBeLessThanOrEqual(defaultArea.bounds.x + defaultArea.bounds.w)
    })
  })
})
