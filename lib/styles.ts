// 样式常量 - 避免内联样式导致的水合错误
// 使用固定的对象引用确保服务端和客户端渲染一致

export const styles = {
  // 文字颜色
  textPrimary: { color: 'oklch(0.32 0.04 45)' }, // 深棕 #3A2E2C
  textSecondary: { color: 'oklch(0.38 0.04 45)' }, // 浅棕 #5D4E4A
  textMuted: { color: 'oklch(0.48 0.03 55)' }, // 墨绿偏棕 #8B7355
  textAmber: { color: 'oklch(0.75 0.15 70)' }, // 琥珀黄 #FFB300
  textSky: { color: 'oklch(0.65 0.08 200)' }, // 淡天蓝 #87CEEB
  textForest: { color: 'oklch(0.45 0.08 120)' }, // 森绿 #556B2F
  textSuccess: { color: 'oklch(0.55 0.12 120)' }, // 嫩绿 #7CB342

  // 背景颜色
  bgGlass: { backgroundColor: 'rgba(255, 255, 255, 0.75)' },
  bgSuccess: { backgroundColor: 'rgba(124, 179, 66, 0.2)' },
  bgAmber: { backgroundColor: 'rgba(255, 179, 0, 0.1)' },
  bgWarning: { backgroundColor: 'rgba(255, 183, 77, 0.15)' },
  bgError: { backgroundColor: 'rgba(229, 115, 115, 0.15)' },

  // 边框颜色
  border: { borderColor: 'rgba(58, 46, 44, 0.08)' },
  borderAmber: { borderColor: 'rgba(255, 179, 0, 0.5)' },
  borderActive: { borderColor: 'rgba(58, 46, 44, 0.2)' },

  // 渐变
  gradientAmber: {
    background: 'linear-gradient(90deg, oklch(0.75 0.15 70) 0%, oklch(0.70 0.16 70) 100%)'
  },
  gradientButton: {
    background: 'linear-gradient(135deg, oklch(0.75 0.15 70) 0%, oklch(0.70 0.16 70) 100%)'
  },

  // 进度条背景
  progressBg: {
    backgroundColor: 'rgba(58, 46, 44, 0.1)'
  },

  // 其他常用样式
  fullWidth: { width: '100%' }
} as const

// 颜色值的字符串版本（用于 className 拼接）
export const colors = {
  primary: '#3A2E2C',
  secondary: '#5D4E4A',
  muted: '#8B7355',
  amber: '#FFB300',
  sky: '#87CEEB',
  forest: '#556B2F',
  success: '#7CB342',
  error: '#E57373'
} as const
