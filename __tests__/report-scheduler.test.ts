import { checkReportSchedule } from '@/lib/engine/report-scheduler'

describe('Report Scheduler', () => {
  const now = new Date('2026-06-01T10:00:00Z')

  it('generates first report when no previous report exists', () => {
    const result = checkReportSchedule(null, now)
    expect(result.shouldGenerate).toBe(true)
    expect(result.reportType).toBe('weekly')
    expect(result.reason).toContain('首次')
    expect(result.periodStart).toBe('2026-05-25')
    expect(result.periodEnd).toBe('2026-06-01')
  })

  it('skips when last report was 3 days ago', () => {
    const result = checkReportSchedule('2026-05-29T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(false)
    expect(result.reason).toContain('3 天')
  })

  it('skips when last report was today', () => {
    const result = checkReportSchedule('2026-06-01T08:00:00Z', now)
    expect(result.shouldGenerate).toBe(false)
  })

  it('generates weekly report when 7 days have passed', () => {
    const result = checkReportSchedule('2026-05-25T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(true)
    expect(result.reportType).toBe('weekly')
    expect(result.reason).toContain('7 天')
  })

  it('generates weekly report when 14 days have passed', () => {
    const result = checkReportSchedule('2026-05-18T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(true)
    expect(result.reportType).toBe('weekly')
  })

  it('generates monthly report when 30+ days have passed', () => {
    const result = checkReportSchedule('2026-05-01T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(true)
    expect(result.reportType).toBe('monthly')
    expect(result.reason).toContain('月度')
  })

  it('generates monthly report when 60 days have passed', () => {
    const result = checkReportSchedule('2026-04-01T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(true)
    expect(result.reportType).toBe('monthly')
  })

  it('boundary: exactly 6 days should not generate', () => {
    const result = checkReportSchedule('2026-05-26T10:00:00Z', now)
    expect(result.shouldGenerate).toBe(false)
  })

  it('boundary: exactly 7 days should generate', () => {
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const result = checkReportSchedule(sevenDaysAgo.toISOString(), now)
    expect(result.shouldGenerate).toBe(true)
  })
})
