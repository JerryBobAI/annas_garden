'use client'

import { useState, useRef } from 'react'
import { BackIconLink } from '@/components/shared/back-icon-link'
import type { ContentImport } from '@/types'

type ImportTab = 'text' | 'pdf'

/**
 * 家长内容导入页面
 *
 * 功能：
 * 1. 粘贴/输入课本内容（文本模式）
 * 2. 上传 PDF 文件（PDF 模式）
 * 3. AI 自动提取知识点
 * 4. 查看提取结果
 */
export default function ContentImportPage() {
  const [tab, setTab] = useState<ImportTab>('text')
  const [content, setContent] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<(ContentImport & { pdf_info?: { pages: number; text_length: number; filename: string } }) | null>(null)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const subjectLabels: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
  }

  // 文本导入
  async function handleTextImport() {
    if (!content.trim()) return
    setImporting(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '导入失败')
        return
      }

      const data = await res.json()
      setResult(data)
      setContent('')
    } catch {
      setError('网络错误，请重试')
    } finally {
      setImporting(false)
    }
  }

  // PDF 上传导入
  async function handlePdfImport() {
    if (!selectedFile) return
    setImporting(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await fetch('/api/imports/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'PDF 导入失败')
        return
      }

      const data = await res.json()
      setResult(data)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch {
      setError('网络错误，请重试')
    } finally {
      setImporting(false)
    }
  }

  function handleImport() {
    if (tab === 'text') handleTextImport()
    else handlePdfImport()
  }

  return (
    <main className="min-h-screen watercolor-bg">
      <div className="container mx-auto px-4 py-8 max-w-lg">
        {/* 导航 */}
        <div className="card rounded-soft p-4 mb-8">
          <div className="flex items-center justify-between content-z">
            <BackIconLink href="/parent/dashboard" label="返回学习报告" />
            <div className="text-center">
              <h1 className="text-lg font-bold" style={{ color: '#3A2E2C' }}>📥 导入学习内容</h1>
              <p className="text-xs" style={{ color: '#8B7355' }}>AI 自动提取知识点</p>
            </div>
            <div className="w-10" />
          </div>
        </div>

        {/* 导入模式切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab('text')}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === 'text' ? '#FFB300' : 'rgba(255,179,0,0.1)',
              color: tab === 'text' ? '#fff' : '#8B7355',
            }}
          >
            📝 文本输入
          </button>
          <button
            onClick={() => setTab('pdf')}
            className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: tab === 'pdf' ? '#FFB300' : 'rgba(255,179,0,0.1)',
              color: tab === 'pdf' ? '#fff' : '#8B7355',
            }}
          >
            📄 PDF 上传
          </button>
        </div>

        {/* 输入区 */}
        <div className="card rounded-soft p-6 mb-6">
          <div className="content-z">
            {tab === 'text' ? (
              <>
                <h2 className="text-sm font-bold mb-3" style={{ color: '#3A2E2C' }}>
                  粘贴课本内容或学习要求
                </h2>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="例如：一年级下册第三单元，学习20以内的退位减法，包括：15-8、13-6、12-5等..."
                  className="w-full h-40 p-4 rounded-xl text-sm resize-none border-soft focus:outline-none"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    color: '#3A2E2C',
                    border: '1px solid rgba(139,115,85,0.2)',
                  }}
                />
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs" style={{ color: '#8B7355' }}>
                    {content.length} 字
                  </span>
                  <button
                    onClick={handleImport}
                    disabled={!content.trim() || importing}
                    className="px-6 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: content.trim() && !importing ? '#FFB300' : '#e5e5e5',
                      color: content.trim() && !importing ? '#3A2E2C' : '#999',
                    }}
                  >
                    {importing ? '分析中...' : '\u2728 AI 分析'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold mb-3" style={{ color: '#3A2E2C' }}>
                  上传 PDF 课本
                </h2>
                {/* 文件选择区 */}
                <div
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-amber-50/50"
                  style={{ borderColor: selectedFile ? '#FFB300' : 'rgba(139,115,85,0.2)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                  {selectedFile ? (
                    <div>
                      <span className="text-3xl block mb-2">{'\u{1F4C4}'}</span>
                      <p className="text-sm font-medium" style={{ color: '#3A2E2C' }}>{selectedFile.name}</p>
                      <p className="text-xs mt-1" style={{ color: '#8B7355' }}>
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-3xl block mb-2">{'\u{1F4E4}'}</span>
                      <p className="text-sm" style={{ color: '#8B7355' }}>点击选择 PDF 文件</p>
                      <p className="text-xs mt-1" style={{ color: '#BDBDBD' }}>最大 5MB</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleImport}
                    disabled={!selectedFile || importing}
                    className="px-6 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: selectedFile && !importing ? '#FFB300' : '#e5e5e5',
                      color: selectedFile && !importing ? '#3A2E2C' : '#999',
                    }}
                  >
                    {importing ? '解析中...' : '\u2728 AI 分析 PDF'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="card rounded-soft p-4 mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
            <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {/* 提取结果 */}
        {result && result.extracted_knowledge && (
          <div className="card rounded-soft p-6 mb-6 animate-card-enter">
            <div className="content-z">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">✅</span>
                <h2 className="text-sm font-bold" style={{ color: '#3A2E2C' }}>
                  AI 提取结果
                </h2>
              </div>

              {/* 学科 */}
              <div className="mb-3">
                <span className="text-xs" style={{ color: '#8B7355' }}>识别学科：</span>
                <span className="text-sm font-medium ml-1" style={{ color: '#3A2E2C' }}>
                  {subjectLabels[result.extracted_knowledge.subject] || result.extracted_knowledge.subject}
                </span>
              </div>

              {/* 知识点 */}
              <div className="mb-3">
                <span className="text-xs block mb-2" style={{ color: '#8B7355' }}>提取的知识点：</span>
                <div className="flex flex-wrap gap-2">
                  {result.extracted_knowledge.knowledge_points.map((kp: string) => (
                    <span
                      key={kp}
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                    >
                      {kp}
                    </span>
                  ))}
                </div>
              </div>

              {/* 建议目标 */}
              {result.extracted_knowledge.suggested_goals.length > 0 && (
                <div>
                  <span className="text-xs block mb-2" style={{ color: '#8B7355' }}>建议学习目标：</span>
                  <div className="space-y-1.5">
                    {result.extracted_knowledge.suggested_goals.map((goal: string, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">🎯</span>
                        <p className="text-xs" style={{ color: '#3A2E2C' }}>{goal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PDF 信息（如果有） */}
        {result?.pdf_info && (
          <div className="card rounded-soft p-4 mb-6 animate-card-enter">
            <div className="content-z flex items-center gap-3">
              <span className="text-2xl">{'\u{1F4C4}'}</span>
              <div>
                <p className="text-sm font-medium" style={{ color: '#3A2E2C' }}>{result.pdf_info.filename}</p>
                <p className="text-xs" style={{ color: '#8B7355' }}>
                  {result.pdf_info.pages} 页 · {result.pdf_info.text_length.toLocaleString()} 字
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="card rounded-soft p-4">
          <div className="content-z">
            <h3 className="text-xs font-bold mb-2" style={{ color: '#3A2E2C' }}>{'\u{1F4A1}'} 使用提示</h3>
            <ul className="text-xs space-y-1" style={{ color: '#8B7355' }}>
              <li>{'\u00B7'} 文本模式：粘贴课本目录、练习题或学习要求</li>
              <li>{'\u00B7'} PDF 模式：上传课本 PDF，AI 自动提取文字内容</li>
              <li>{'\u00B7'} AI 会自动识别学科并提取关键知识点</li>
              <li>{'\u00B7'} 提取的知识点会加入孩子的学习路径</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
