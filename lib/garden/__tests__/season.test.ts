import { getSeason, getSeasonTheme } from '../season'
import type { Season } from '../season'

describe('Garden Season', () => {
  describe('getSeason', () => {
    it('returns spring for March-May', () => {
      expect(getSeason(3)).toBe('spring')
      expect(getSeason(4)).toBe('spring')
      expect(getSeason(5)).toBe('spring')
    })

    it('returns summer for June-August', () => {
      expect(getSeason(6)).toBe('summer')
      expect(getSeason(7)).toBe('summer')
      expect(getSeason(8)).toBe('summer')
    })

    it('returns autumn for September-November', () => {
      expect(getSeason(9)).toBe('autumn')
      expect(getSeason(10)).toBe('autumn')
      expect(getSeason(11)).toBe('autumn')
    })

    it('returns winter for December-February', () => {
      expect(getSeason(12)).toBe('winter')
      expect(getSeason(1)).toBe('winter')
      expect(getSeason(2)).toBe('winter')
    })

    it('uses current month when no arg provided', () => {
      const result = getSeason()
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(result)
    })
  })

  describe('getSeasonTheme', () => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter']

    it.each(seasons)('returns valid theme for %s', (season) => {
      const theme = getSeasonTheme(season)
      expect(theme.season).toBe(season)
      expect(theme.label).toBeTruthy()
      expect(theme.skyGradient).toMatch(/linear-gradient/)
      expect(theme.celestial).toBeTruthy()
      expect(theme.grassColor).toMatch(/^#/)
      expect(theme.mood).toBeTruthy()
      expect(theme.decorations).toBeInstanceOf(Array)
      expect(theme.decorations.length).toBeGreaterThan(0)
    })

    it('each season has unique celestial emoji', () => {
      const celestials = seasons.map(s => getSeasonTheme(s).celestial)
      expect(new Set(celestials).size).toBe(4)
    })

    it('defaults to current season when no arg', () => {
      const theme = getSeasonTheme()
      expect(seasons).toContain(theme.season)
    })
  })
})
