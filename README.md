# 目录条常显dsh插件

中文名：目录条常显dsh插件。仓库名 dsh-turn-rail-pin。

让 DSH 会话视图右侧的**目录条（turn rail）**在窄窗口 / 高浏览器缩放下仍然显示。

## 为什么需要它

宿主 `@deepseek-ai/dsh-client-ui-chat` 里有一条容器查询：

```css
@container (width<=900px){ .eGxaPq_slot{display:none} }
```

查询容器是聊天滚动区（`container-type:inline-size`，量的是**内容盒** = 元素宽度 − 左右各 32px 内边距），
所以窗口 CSS 像素宽度低于约 **964px** 时目录条就被隐藏。浏览器放大后 CSS 像素宽度变小
（1920px 屏放大 175% ≈ 1097 CSS px，若侧边栏展开则更低），就会命中这条规则。

目录条的 DOM 一直都在（`TurnNavigator` 始终渲染），隐藏纯粹来自这条 CSS。

## 做法

注入一段带 `!important` 的覆盖样式：

```css
.dsh-turn-rail-pinned .eGxaPq_slot{display:block !important}
```

根类 `.dsh-turn-rail-pinned` 由开关状态控制，状态持久化在宿主设置命名空间
`turn-rail-pin.pinned`（默认 `true`）。

## 两个入口

| 位置 | 槽位 | 说明 |
|---|---|---|
| 会话头部右上角工具区 | `conversation.session.header.utilities` | 图钉按钮；**目录条被隐藏时它仍然在**，可随时叫回来。`aria-pressed` 反映状态 |
| 设置 → 通用 | `settings.general.item` | 同名开关，附说明文字 |

## 已知限制

- **窄窗口会压住正文**：内容盒低于约 900px 时右侧没有空 gutter，目录条会叠在消息文字上。
  这是官方隐藏它的原因；按需用图钉按钮关掉即可（本插件刻意不设安全线）。
- **类名依赖宿主构建**：`.eGxaPq_slot` 是 CSS Modules 的哈希类名，dsh 升级后如果该哈希变化，
  覆盖会失效（表现为"开了也没用"）。届时改 `lib/client.js` 里的 `OVERRIDE_CSS` 即可。
- **开关写在插件自己的配置里**：浏览器通过 `configForms` 读写 `turn-rail-pin.pinned`。设置还没读到时保持默认开。

## 本副本（DeepSeek Harness 0.1.7-rc.1）

功能：窗口变窄或浏览器放大时，仍显示会话右侧的目录条。会话头部有一颗图钉，设置 → 通用里也有同名开关。默认是开。

用法：

```sh
dsh plugin --profile web add "link:<克隆下来的目录>"
dsh web
```

觉得目录条挡住正文时，点头部图钉关掉。来源见 [来源说明.md](来源说明.md)。

## 安装

```powershell
dsh plugin --profile web add "link:<克隆下来的目录>"
```

安装后需重启 `dsh web`（新 bundle 只在启动时读取）。卸载：

```powershell
dsh plugin --profile web remove dsh-turn-rail-pin
```

## 许可

MIT
