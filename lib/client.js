/**
 * dsh-turn-rail-pin — 浏览器侧 bundle（单文件，经 __ModuleLoader__ 加载）。
 *
 * 作用：让会话视图右侧的「目录条」（TurnNavigator，数据来自 turnOutline 投影 +
 * 会话 turn 导航项）在窄窗口 / 高浏览器缩放下仍然显示。
 *
 * 背景：宿主 dsh-client-ui-chat 里有一条容器查询
 *   @container (width<=900px){ .eGxaPq_slot{display:none} }
 * 查询容器是聊天滚动区（container-type:inline-size，内容盒 = 元素宽度 - 64px
 * 内边距），所以窗口 CSS 像素宽度低于约 964px 时目录条就被隐藏。浏览器放大后
 * CSS 像素宽度变小，就会命中这条规则。
 *
 * 做法：注入一段带 !important 的覆盖样式，把 display 拉回 block。开关状态由
 * 宿主设置命名空间 `turn-rail-pin.pinned` 持久化，默认开。
 *
 * 入口：
 *   - 会话头部右上角工具区一个图钉按钮（rail 消失时它仍在，可随时叫回来）
 *   - 设置 → 通用 里一行同名开关
 */

window.__ModuleLoader__.load({
  id: 'dsh-turn-rail-pin',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { useState, useEffect, useRef } = React
    const el = React.createElement

    // ── 常量 ────────────────────────────────────────────────────────────────

    const NS = 'turn-rail-pin'
    const SETTINGS_NAMESPACE = 'turn-rail-pin'
    const PINNED_FIELD = 'pinned'
    const DEFAULT_PINNED = true
    const CSS_TAG_ID = 'dsh-turn-rail-pin/override.css'
    const ROOT_CLASS = 'dsh-turn-rail-pinned'

    const zh = {
      'header.pin': '目录条常显',
      'header.pinned': '目录条：常显中（点击恢复自动隐藏）',
      'header.unpinned': '目录条：自动隐藏（点击改为常显）',
      'settings.title': '目录条常显',
      'settings.description': '窗口变窄或浏览器放大时，仍显示会话右侧的目录条。窗口过窄时它会压住正文，可随时用会话头部的图钉按钮关闭。',
      'settings.on': '开',
      'settings.off': '关',
    }
    const en = {
      'header.pin': 'Pin rail',
      'header.pinned': 'Rail: always visible (click to restore auto-hide)',
      'header.unpinned': 'Rail: auto-hide (click to keep visible)',
      'settings.title': 'Always show the turn rail',
      'settings.description': 'Keep the conversation turn rail visible when the window is narrow or the browser is zoomed in. It can overlap the transcript at very narrow widths; turn it off with the pin button in the session header.',
      'settings.on': 'On',
      'settings.off': 'Off',
    }

    // ── 样式 ────────────────────────────────────────────────────────────────

    /** 覆盖宿主的容器查询。!important 保证胜过宿主样式表（宿主可能后注入）。 */
    const OVERRIDE_CSS = [
      '/* dsh-turn-rail-pin: 强制显示会话目录条 */',
      '.dsh-turn-rail-pinned .eGxaPq_slot{display:block !important}',
    ].join('\n')

    const UI_CSS = [
      '/* dsh-turn-rail-pin: 头部按钮与设置行 */',
      '.dsh-turn-rail-pin-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:8px;',
      'border:1px solid var(--dsw-alias-border-l1,#444);background:var(--dsw-alias-bg-layer-1,transparent);',
      'color:var(--dsw-alias-label-secondary,#c5c5c5);font-size:13px;line-height:18px;cursor:pointer;white-space:nowrap;',
      'transition:background .15s ease,border-color .15s ease,color .15s ease}',
      '.dsh-turn-rail-pin-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1));border-color:var(--dsw-alias-border-l3,#666)}',
      '.dsh-turn-rail-pin-btn[aria-pressed="true"]{color:var(--dsw-alias-state-business-primary,#4d9fff);border-color:var(--dsw-alias-state-business-primary,#4d9fff);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d9fff) 12%,transparent)}',
      '.dsh-turn-rail-pin-btn svg{flex:none}',
      '.dsh-turn-rail-pin-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:10px 0}',
      '.dsh-turn-rail-pin-row-text{min-width:0;display:flex;flex-direction:column;gap:2px}',
      '.dsh-turn-rail-pin-row-title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary,#e8e8e8)}',
      '.dsh-turn-rail-pin-row-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9b9b9b)}',
      '.dsh-turn-rail-pin-switch{flex:none;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 12px;border-radius:999px;',
      'border:1px solid var(--dsw-alias-border-l1,#444);background:var(--dsw-alias-bg-layer-1,transparent);',
      'color:var(--dsw-alias-label-secondary,#c5c5c5);font-size:12px;cursor:pointer;white-space:nowrap}',
      '.dsh-turn-rail-pin-switch[aria-pressed="true"]{color:var(--dsw-alias-state-business-primary,#4d9fff);border-color:var(--dsw-alias-state-business-primary,#4d9fff)}',
    ].join('')

    /** 幂等插入一个 style 标签（按 data-plugin-css 去重）。 */
    function ensureStyleTag(tagId, css) {
      if (typeof document === 'undefined') return null
      const selector = 'style[data-plugin-css=' + JSON.stringify(tagId) + ']'
      let tag = document.querySelector(selector)
      if (tag === null) {
        tag = document.createElement('style')
        tag.dataset.pluginCss = tagId
        tag.textContent = css
        document.head.appendChild(tag)
      } else if (tag.textContent !== css) {
        tag.textContent = css
      }
      return tag
    }

    // ── 极简响应式 store（不依赖宿主内部工具包）────────────────────────────

    /** 创建一个带 getSnapshot/subscribe/set 的小 store。 */
    function createStore(initial) {
      let value = initial
      const listeners = new Set()
      return {
        getSnapshot: () => value,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set: (next) => {
          if (value === next) return
          value = next
          for (const listener of [...listeners]) listener()
        },
      }
    }

    // ── 设置策略：读宿主设置，写回宿主设置 ──────────────────────────────────

    /**
     * 把「是否常显」持久化到宿主设置命名空间 `turn-rail-pin.pinned`。
     * 设置未就绪（loading/unavailable）时保持默认值，避免把默认值写坏。
     */
    function createPinPolicy(scope) {
      const store = createStore(DEFAULT_PINNED)
      let adopted = false
      const adopt = () => {
        const snapshot = scope.getSnapshot()
        if (snapshot.status !== 'ready' || snapshot.value === undefined) return
        adopted = true
        store.set(snapshot.value[PINNED_FIELD] === true)
      }
      scope.subscribe(adopt)
      adopt()
      return {
        store,
        /** 用户显式切换：先本地生效，再写回宿主。 */
        setPinned(next) {
          store.set(next === true)
          try {
            const result = scope.set(PINNED_FIELD, next === true)
            if (result !== undefined && typeof result.catch === 'function') result.catch(() => { adopt() })
          } catch { adopt() }
        },
        /** 是否已经拿到宿主设置（未拿到时按钮也能用，只是写回后可能被默认值覆盖）。 */
        isAdopted: () => adopted,
      }
    }

    // ── 头部按钮 ────────────────────────────────────────────────────────────

    /** 图钉图标（16px，跟随 currentColor）。 */
    function PinIcon({ filled }) {
      return el('svg', {
        width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
        el('path', { d: 'M6.2 2.2h3.6l-.5 4.1 2.2 2.1v1.1H8.9V14l-.9 1-.9-1V9.5H4.5V8.4l2.2-2.1-.5-4.1Z', fill: filled ? 'currentColor' : 'none' }),
      )
    }

    /**
     * 会话头部右上角的图钉开关。
     * @param props - 运行时 props（usePinned 钩子、setPinned 动作、t 本地化）。
     */
    function HeaderPinButton(props) {
      const { usePinned, setPinned, t } = props
      const pinned = usePinned((value) => value)
      return el('button', {
        type: 'button',
        className: 'dsh-turn-rail-pin-btn',
        'aria-pressed': pinned ? 'true' : 'false',
        title: pinned ? t('header.pinned') : t('header.unpinned'),
        onClick: () => setPinned(!pinned),
      },
        el(PinIcon, { filled: pinned }),
        el('span', null, t('header.pin')),
      )
    }

    // ── 设置行 ──────────────────────────────────────────────────────────────

    /**
     * 设置 → 通用 里的同名开关。
     * @param props - 运行时 props（usePinned 钩子、setPinned 动作、t 本地化）。
     */
    function SettingsPinRow(props) {
      const { usePinned, setPinned, t } = props
      const pinned = usePinned((value) => value)
      return el('div', { className: 'dsh-turn-rail-pin-row' },
        el('div', { className: 'dsh-turn-rail-pin-row-text' },
          el('div', { className: 'dsh-turn-rail-pin-row-title' }, t('settings.title')),
          el('div', { className: 'dsh-turn-rail-pin-row-desc' }, t('settings.description')),
        ),
        el('button', {
          type: 'button',
          className: 'dsh-turn-rail-pin-switch',
          'aria-pressed': pinned ? 'true' : 'false',
          onClick: () => setPinned(!pinned),
        }, pinned ? t('settings.on') : t('settings.off')),
      )
    }

    // ── 插件主体 ────────────────────────────────────────────────────────────

    const inject = ['slots', 'locale', 'configForms', 'remote']

    /**
     * 挂载：注入覆盖样式 + 注册头部按钮与设置行。
     * @param ctx - 客户端插件上下文。
     */
    function apply(ctx) {
      // 1) 本地化
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'turn-rail-pin: dictionaries')
      const t = ctx.locale.bind(NS)

      // 2) 覆盖样式（用 ctx.effect 托管，卸载即清理；被移除会自动补回）
      ctx.effect(() => {
        const tag = ensureStyleTag(CSS_TAG_ID, OVERRIDE_CSS + '\n' + UI_CSS)
        const root = document.documentElement
        const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => {
          if (tag !== null && !tag.isConnected) ensureStyleTag(CSS_TAG_ID, OVERRIDE_CSS + '\n' + UI_CSS)
        })
        if (observer !== null) observer.observe(document.head, { childList: true })
        return () => {
          if (observer !== null) observer.disconnect()
          if (tag !== null && tag.isConnected) tag.remove()
          root.classList.remove(ROOT_CLASS)
        }
      }, 'turn-rail-pin: override stylesheet')

      // 3) 设置策略 + 根类切换
      const policy = createPinPolicy(ctx.configForms.get(SETTINGS_NAMESPACE))
      ctx.effect(() => {
        const sync = () => {
          const pinned = policy.store.getSnapshot()
          document.documentElement.classList.toggle(ROOT_CLASS, pinned)
        }
        sync()
        return policy.store.subscribe(sync)
      }, 'turn-rail-pin: root class')

      // 4) 头部图钉按钮（rail 被隐藏时它仍然在，可随时把 rail 叫回来）
      ctx.effect(() => ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'turn-rail-pin',
        order: 30,
        locale: NS,
        inject: () => ({
          // 宿主把 hooks 源名转成 use<Name>：'pinned' → 组件收到 usePinned
          hooks: { pinned: policy.store },
          setPinned: policy.setPinned,
        }),
      }, HeaderPinButton)), 'turn-rail-pin: header button')

      // 5) 设置 → 通用 一行
      ctx.effect(() => ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'turn-rail-pin',
        order: 40,
        locale: NS,
        inject: () => ({
          // 同上：'pinned' → usePinned
          hooks: { pinned: policy.store },
          setPinned: policy.setPinned,
        }),
      }, SettingsPinRow)), 'turn-rail-pin: settings row')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
