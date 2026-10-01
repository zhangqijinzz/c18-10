// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserBrandGuidelinesExporter, buildBrandGuidelinesMarkdown, formatLocalDate } from '../services/exportService'
import { INITIAL_TOKENS, type BrandMirrorSnapshot } from '../models/brandMirrorModels'

// 用东八区验证：本地凌晨时 UTC 仍是前一天，日期必须按本地时间计算
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Shanghai')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function makeSnapshot(overrides: Partial<BrandMirrorSnapshot> = {}): BrandMirrorSnapshot {
  return { status: 'ready', tokens: INITIAL_TOKENS, theme: 'studio', versions: [], compareMode: false, activeVersionId: null, contrastRatio: 4.5, contrastWarning: false, message: '', ...overrides }
}

describe('formatLocalDate', () => {
  it('formats the date in local time with zero padding', () => {
    expect(formatLocalDate(new Date(2026, 0, 5, 2, 30))).toBe('2026-01-05')
    expect(formatLocalDate(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('buildBrandGuidelinesMarkdown', () => {
  it('writes the export date in local time even when UTC is still on the previous day', () => {
    const markdown = buildBrandGuidelinesMarkdown(makeSnapshot(), new Date(2026, 0, 5, 2, 30))
    expect(markdown).toContain('> 导出时间：2026-01-05')
  })

  it('converts saved version dates to local time', () => {
    const snapshot = makeSnapshot({ versions: [{ id: 'v1', label: 'Version A', tokens: INITIAL_TOKENS, createdAt: '2026-01-04T18:30:00.000Z' }] })
    expect(buildBrandGuidelinesMarkdown(snapshot, new Date(2026, 0, 5))).toContain('Version A · 2026-01-05')
  })
})

describe('BrowserBrandGuidelinesExporter', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>
  let clickedWhileConnected: boolean
  let exportedContent: string

  beforeEach(() => {
    const exportedAt = new Date(2026, 0, 5, 2, 30)
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] })
    vi.setSystemTime(exportedAt)
    clickedWhileConnected = false
    exportedContent = ''
    createObjectURL = vi.fn(() => 'blob:brand-guidelines')
    revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedWhileConnected = this.isConnected
    })
    const NativeBlob = globalThis.Blob
    vi.stubGlobal('Blob', class extends NativeBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        exportedContent = (parts ?? []).map(String).join('')
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('clicks a link that is attached to the document so every browser starts the download', () => {
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(clickedWhileConnected).toBe(true)
    expect(document.body.querySelector('a')).not.toBeNull()
  })

  it('uses the same local date in the file name and the document', () => {
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(document.body.querySelector<HTMLAnchorElement>('a')?.download).toBe('BrandMirror-Brand-Guidelines-2026-01-05.md')
    expect(exportedContent).toContain('> 导出时间：2026-01-05')
  })

  it('releases the object url only after the download has started', () => {
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5000)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:brand-guidelines')
    expect(document.body.querySelector('a')).toBeNull()
  })
})
