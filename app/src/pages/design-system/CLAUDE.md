# app/src/pages/design-system/
> L2 | 父级: ../CLAUDE.md

## 定位
开发环境专用 Design System 画廊。以矩阵展示 `shared/ui` 中每一个原子组件及其名称。

## 性能策略
1. **页面本身轻量**：`DesignSystemPage` 只拼壳，不静态 import 全部组件  
2. **注册表驱动**：`registry.ts` 只存元数据 + `() => import()` 工厂  
3. **分区独立 chunk**：`sections/*Gallery.tsx` 各自 code-split  
4. **视口门闩**：`GalleryCell` + `useInView`，未入屏只渲染占位，不挂载组件树  
5. **memo**：单元格 memo，避免矩阵滚动时整表重绘  
6. **DEV only**：仅 `import.meta.env.DEV` 下挂到侧边栏与 AppDashboard  

## 成员
index.ts: 公共导出  
DesignSystemPage.tsx: 页面壳  
registry.ts: 组件清单 + 动态加载工厂  
shell/: Header + Matrix 布局  
cell/: GalleryCell + useInView  
sections/: 每个组件一个 Gallery（Button/Input/Textarea/Card/Dialog/LogoMark）  

## 扩展
在 `shared/ui` 新增组件后：  
1. 增加 `sections/<Name>Gallery.tsx`  
2. 在 `registry.ts` 追加一条 entry  

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
