/**
 * dsh-turn-rail-pin — 宿主侧。
 *
 * 「始终显示目录条」写在本插件的 Config 里。条目 id 是 `turn-rail-pin`，
 * 浏览器侧用 configForms.get('turn-rail-pin') 读写。
 *
 * @module dsh-turn-rail-pin
 */
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-turn-rail-pin'
export const SETTINGS_NAMESPACE = 'turn-rail-pin'
export const PINNED_FIELD = 'pinned'
export const DEFAULT_PINNED = true

export const Config = z.object({
  [PINNED_FIELD]: z.boolean().default(DEFAULT_PINNED).volatile(),
})

function apply() {}

export { apply }
