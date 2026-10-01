// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserBrandGuidelinesExporter, buildBrandGuidelinesMarkdown, formatLocalDate } from '../services/exportService'
import { INITIAL_TOKENS, type BrandMirrorSnapshot } from '../models/brandMirrorModels'

function makeSnapshot(overrides: Partial<BrandMirrorSnapshot> = {}): BrandMirrorSnapshot {
  return {
    status: 'ready',
    tokens: INITIAL_TOKENS,
    theme: 'studio',
    versions: [],
    compareMode: false,
    activeVersionId: null,
    contrastRatio: 12.5,
    contrastWarning: false,
    message: '',
    ...overrides,
  }
}

describe('formatLocalDate', () => {
  it('formats the date from local time components', () => {
    expect(formatLocalDate(new Date(2026, 9, 1, 2, 30))).toBe('2026-10-01')
    expect(formatLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('buildBrandGuidelinesMarkdown', () => {
  it('renders the export date in local time', () => {
    const markdown = buildBrandGuidelinesMarkdown(makeSnapshot(), new Date(2026, 9, 1, 7, 30))
    expect(markdown).toContain('> 导出时间：2026-10-01')
  })

  it('renders saved version dates in local time', () => {
    const createdAt = '2026-09-30T18:30:00.000Z'
    const snapshot = makeSnapshot({ versions: [{ id: 'v1', label: 'Version A', tokens: INITIAL_TOKENS, createdAt }] })
    const markdown = buildBrandGuidelinesMarkdown(snapshot, new Date(2026, 9, 1))
    expect(markdown).toContain(`Version A · ${formatLocalDate(new Date(createdAt))}`)
  })
})

describe('BrowserBrandGuidelinesExporter', () => {
  let createObjectURL: ReturnType<typeof vi.fn>
  let revokeObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURL = vi.fn().mockReturnValue('blob:brandmirror-mock')
    revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(URL, 'createObjectURL')
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  })

  it('clicks an anchor that is attached to the document and cleans it up', () => {
    let attachedWhenClicked = false
    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(function (this: HTMLElement) {
      attachedWhenClicked = document.body.contains(this)
    })
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(attachedWhenClicked).toBe(true)
    expect(document.body.querySelector('a')).toBeNull()
  })

  it('revokes the object URL only after the download has started', () => {
    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(() => {})
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:brandmirror-mock')
  })

  it('uses the same local date in the file name and the document', () => {
    vi.setSystemTime(new Date(2026, 9, 1, 7, 30))
    let downloadName = ''
    vi.spyOn(HTMLElement.prototype, 'click').mockImplementation(function (this: HTMLElement) {
      downloadName = (this as HTMLAnchorElement).download
    })
    let exportedContent = ''
    const NativeBlob = Blob
    vi.stubGlobal('Blob', class extends NativeBlob {
      constructor(...args: ConstructorParameters<typeof Blob>) {
        super(...args)
        exportedContent = String(args[0]?.[0] ?? '')
      }
    })
    new BrowserBrandGuidelinesExporter().export(makeSnapshot())
    expect(downloadName).toBe('BrandMirror-Brand-Guidelines-2026-10-01.md')
    expect(exportedContent).toContain('> 导出时间：2026-10-01')
  })
})
