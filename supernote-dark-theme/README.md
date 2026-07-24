# SuperNote · 暗色高级感主题草案

> 目标：把现有"古板"的浅色 UI，换成**优雅、克制、高级**的暗色皮肤。
> 硬约束（来自你的要求 + `shared/ui/CLAUDE.md`）：**不改任何组件、不改任何功能、`index.css` 唯一真相源一字不动**。

## 为什么能"零改动换皮"

现有设计系统把所有颜色都收敛到 `app/src/index.css` 的 token（`--color-*` / `--surface-*`），组件只消费变量、禁止硬编码颜色/像素。因此：

- 暗色 = 只**重映射 token**，整套 UI 自动换色；
- 组件 TSX、组件类名、交互逻辑、数据结构 **一行都不用动**；
- `index.css` 不动 → 不需要改协议头、不破坏浅色主题，可随时回退。

## 交付物（本目录）

| 文件 | 用途 |
|---|---|
| `theme-dark.css` | **生产用**暗色覆盖层。在 `index.css` 之后 import，给 `<html>` 加 `data-theme="dark"` 即生效 |
| `dark-theme-preview.html` | 可直接双击打开的**对照预览页**（右上角可一键切换「当前浅色 ↔ 新暗色」） |
| `README.md` | 本说明 |

## 激活方式（2 步，零侵入）

```ts
// main.tsx 或入口处，在引入 token-lock.css 之后：
import './shared/ui/token-lock.css';
import '../supernote-dark-theme/theme-dark.css'; // 暗色覆盖

// 切换（可接设置开关 / 系统偏好）：
document.documentElement.setAttribute('data-theme', 'dark');   // 开
document.documentElement.removeAttribute('data-theme');        // 关
```

或按系统偏好自动：
```ts
if (window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', 'dark');
```

## 配色方案：暖调石墨（warm-charcoal）

承接浅色主题的"暖纸感"品牌，暗态用**咖啡近黑 + 暖白文字**，比冷蓝黑更显"高级 / 编辑感"。

| Token | 当前（浅） | 新（暗） | 角色 |
|---|---|---|---|
| `--color-putty` | `#c4c3b6` | `#161513` | 画布底色 |
| `--color-bone` | `#e7e5e4` | `#1d1b17` | 面板 |
| `--color-chalk` | `#ebebeb` | `#26231d` | 抬升面 |
| `--color-vellum` | `#dfdcd5` | `#3d382f` | 边框 / 分隔 |
| `--color-graphite` | `#595855` | `#a8a194` | 次级文字 |
| `--color-ash` | `#808080` | `#6e695e` | 三级文字 |
| `--color-ink` | `#000000` | `#ECE8E0` | **前景文字**（暖白） |
| `--color-paper` | `#ffffff` | `#0F0E0B` | 深色基底 / 编辑器底 |
| `--color-warning` | `#b45309` | `#f5b942` | 警示（暗底更亮） |

> 想要更冷的中性灰？只改 `--color-putty` / `--color-bone` 两个值即可。

## "高级感"的三条硬规则（来自 Linear / Raycast / Vercel）

1. **灰阶打底，颜色只表状态**：结构、文字、边框全部用中性灰；红/琥珀/绿只留给"状态"（错误、警示、成功）。
2. **阴影在暗态要重写**：浅色阴影是"外暗投影 + 内白高光"，暗底上必须反过来（外更暗 + 内顶微高光）才有体积感。`theme-dark.css` 已整组重写 `--shadow-*`。
3. **动画只为揭示信息，不为炫技**：沿用现有 `transform: translateY(±1px)` + 微过渡即可，不要加弹跳。

## 处理的几个"坑"（已在覆盖层定向解决）

`--color-ink` 在原系统里被**双重使用**：既是"文字色"又是"深色漆"（primary 按钮渐变、ink 卡、弹窗遮罩、激活树节点）。暗态下把它映射成"前景文字"会让这几处变成浅色/白雾。覆盖层对已破坏处做**纯 CSS 定向覆盖**（仍不碰 TSX）：

- `.ds-button--primary` → 改回优雅的深炭按钮（深底 + 暖白字）；
- `.ds-card--ink` → 改回深邃近黑卡；
- `.ds-dialog-backdrop` → 遮罩改回深色（原 `ink 40%` 会变成白雾）；
- `.ds-tree-node--active` → 改回磨砂选中态（不刺眼）；
- 拖拽落点线 / 右键菜单标记 → 保持可见。

## 已知取舍

- **primary 按钮在暗态是"深炭"而非"亮色 CTA"**：刻意选择更统一的全暗优雅感。若你更想要 Linear 那种"亮色主按钮"，把 `.ds-button--primary` 覆盖里的 `background` 换成浅色渐变即可。
- 本草案只重映射颜色 + 阴影，**未新增任何组件 / token**。若后续想要"暗态专属"的新尺寸或强调色，仍按协议：先加 token 再引用。

## 验证建议

1. 打开 `dark-theme-preview.html`，右上角切到「当前浅色」对比，确认"高级感"到位；
2. 在本地 `import theme-dark.css` 并设 `data-theme="dark"`，跑一遍主流程（建笔记 / 编辑 / 弹窗 / 拖拽树节点 / Agent 面板），确认无颜色翻车；
3. 灰度一小批用户，对比留存 / 停留时长，再决定是否默认开启。
