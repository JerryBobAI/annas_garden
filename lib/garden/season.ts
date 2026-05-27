/**
 * 花园季节效果
 * 根据当前月份返回季节主题配置（背景渐变、装饰元素、氛围）
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export interface SeasonTheme {
  season: Season
  label: string
  /** CSS 线性渐变（天空→草地） */
  skyGradient: string
  /** 装饰 emoji 列表 */
  decorations: { emoji: string; className: string }[]
  /** 太阳/月亮 emoji */
  celestial: string
  /** 草地颜色 */
  grassColor: string
  /** 氛围文字 */
  mood: string
}

/**
 * 根据月份判断季节
 */
export function getSeason(month?: number): Season {
  const m = month ?? new Date().getMonth() + 1  // 1-12
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

/**
 * 获取季节主题配置
 */
export function getSeasonTheme(season?: Season): SeasonTheme {
  const s = season ?? getSeason()

  switch (s) {
    case 'spring':
      return {
        season: 'spring',
        label: '春天',
        skyGradient: 'linear-gradient(180deg, #87CEEB 0%, #E8F5E9 25%, #B5E8CC 50%, #7CB342 70%, #558B2F 100%)',
        decorations: [
          { emoji: '🌸', className: 'top-16 left-[5%] text-lg opacity-60' },
          { emoji: '🦋', className: 'top-12 right-[25%] text-base opacity-50' },
          { emoji: '🌸', className: 'top-20 right-[8%] text-sm opacity-40' },
        ],
        celestial: '☀️',
        grassColor: '#7CB342',
        mood: '万物复苏，花园生机勃勃！',
      }

    case 'summer':
      return {
        season: 'summer',
        label: '夏天',
        skyGradient: 'linear-gradient(180deg, #4FC3F7 0%, #81D4FA 20%, #C8E6C9 45%, #66BB6A 70%, #388E3C 100%)',
        decorations: [
          { emoji: '🌈', className: 'top-4 left-[15%] text-2xl opacity-40' },
          { emoji: '🐝', className: 'top-16 right-[20%] text-base opacity-50' },
          { emoji: '🦗', className: 'top-24 left-[8%] text-sm opacity-30' },
        ],
        celestial: '🌤️',
        grassColor: '#66BB6A',
        mood: '阳光灿烂，植物们快速成长！',
      }

    case 'autumn':
      return {
        season: 'autumn',
        label: '秋天',
        skyGradient: 'linear-gradient(180deg, #FFB74D 0%, #FFCC80 20%, #FFE0B2 40%, #A5D6A7 65%, #795548 100%)',
        decorations: [
          { emoji: '🍂', className: 'top-10 left-[12%] text-lg opacity-60' },
          { emoji: '🍁', className: 'top-18 right-[18%] text-base opacity-50' },
          { emoji: '🍂', className: 'top-24 left-[35%] text-sm opacity-40' },
        ],
        celestial: '🌅',
        grassColor: '#A1887F',
        mood: '丰收的季节，硕果累累！',
      }

    case 'winter':
      return {
        season: 'winter',
        label: '冬天',
        skyGradient: 'linear-gradient(180deg, #B0BEC5 0%, #CFD8DC 25%, #E0E0E0 45%, #A5D6A7 70%, #4E342E 100%)',
        decorations: [
          { emoji: '❄️', className: 'top-8 left-[10%] text-lg opacity-50' },
          { emoji: '⛄', className: 'top-20 right-[12%] text-xl opacity-40' },
          { emoji: '❄️', className: 'top-14 left-[40%] text-sm opacity-30' },
        ],
        celestial: '🌙',
        grassColor: '#8D6E63',
        mood: '冬眠时光，知识的种子在静静积蓄力量...',
      }
  }
}
