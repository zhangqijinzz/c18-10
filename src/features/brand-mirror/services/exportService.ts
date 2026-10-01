import type { BrandMirrorSnapshot } from '../models/brandMirrorModels'

export interface BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildBrandGuidelinesMarkdown(snapshot: BrandMirrorSnapshot, exportedAt: Date = new Date()): string {
  const { tokens } = snapshot
  const versions = snapshot.versions.length === 0 ? '- 暂无保存版本' : snapshot.versions.map((version) => `- ${version.label} · ${formatLocalDate(new Date(version.createdAt))} · 主色 ${version.tokens.primary} · 辅助色 ${version.tokens.secondary}`).join('\n')
  return `# BrandMirror 品牌规范\n\n> 导出时间：${formatLocalDate(exportedAt)}\n> 当前主题：${snapshot.theme}\n\n## 品牌色\n\n| 令牌 | 值 |\n| --- | --- |\n| 主色 \`primary\` | \`${tokens.primary}\` |\n| 辅助色 \`secondary\` | \`${tokens.secondary}\` |\n| 对比度 | ${snapshot.contrastRatio.toFixed(1)}:1 |\n\n## 圆角尺度\n\n${tokens.radiusScale.map((value, index) => `- \`radius.${index + 1}\`: ${value}px`).join('\n')}\n\n## 间距体系\n\n${tokens.spacingScale.map((value, index) => `- \`spacing.${index + 1}\`: ${value}px`).join('\n')}\n\n## 字体比例\n\n${tokens.typeScale.map((value, index) => `- \`type.${index + 1}\`: ${value}px`).join('\n')}\n\n## 保存版本\n\n${versions}\n\n---\n由 BrandMirror 品牌视觉实验室生成。\n`
}

// 留给浏览器把 Blob 交给下载管理器的时间，过早回收会取消或中断下载
const REVOKE_OBJECT_URL_DELAY_MS = 1000

export class BrowserBrandGuidelinesExporter implements BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void {
    const exportedAt = new Date()
    const content = buildBrandGuidelinesMarkdown(snapshot, exportedAt)
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BrandMirror-Brand-Guidelines-${formatLocalDate(exportedAt)}.md`
    // Firefox/Safari 只响应已挂载到文档中的链接
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      URL.revokeObjectURL(url)
      link.remove()
    }, REVOKE_OBJECT_URL_DELAY_MS)
  }
}
