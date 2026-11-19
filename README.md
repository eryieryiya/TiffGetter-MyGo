# TiffGetter-MyGo

TiffGetter 四项目重构中的方案 C：使用 [MyGo](https://mygo.egoist.dev/) 的
**WebView 前端模式**构建桌面客户端，复用方案 B
`TiffGetter-Go` 的 Go 采集内核与 Python sidecar。

- 桌面壳：`github.com/egoist/mygo v0.10.0`
- 前端：Vite + TypeScript + Leaflet（不使用 React）
- 采集：只通过 `import tg "github.com/eryieryiya/tiffgetter-go"` 使用 B 的根包，
  未复制 `internal/sources`、`internal/tiles`、`internal/executor`
- 地图：Esri World Imagery / World Street Map

## 环境要求

| 项 | 要求 |
| --- | --- |
| Go | **1.27.3+**（`go.mod` 已声明）；本机 1.25.5 通过 `GOTOOLCHAIN=auto` 自动下载 |
| Bun | 1.3+（安装前端依赖、运行 Vite 与 MyGo CLI） |
| WebView2 | Windows 10/11 的 WebView2 Runtime（Windows 11 自带） |
| Python | 3.10+；sidecar 需要 `requests`、`Pillow`、`numpy`、`psutil`、`pyshp`、`pyproj`，`rasterio` 可选 |
| 方案 B | 与本项目平级：`D:\CodePool\TiffGetter-Go` |

首次下载 Go 工具链时需要校验和数据库。若本机设置了 `GOSUMDB=off`，请先执行：

```powershell
go env -w GOSUMDB=sum.golang.org
go env -w GOTOOLCHAIN=auto
```

`mygo doctor` 应显示 Go、Bun、WebView2 均可用：

```powershell
bunx mygo doctor
```

## 依赖方案 B

`go.mod` 使用本地 `replace`：

```text
require github.com/eryieryiya/tiffgetter-go v0.0.0

replace github.com/eryieryiya/tiffgetter-go => ../TiffGetter-Go
```

因此 `TiffGetter-MyGo` 与 `TiffGetter-Go` 必须是同级目录。若 B 的路径不同，修改
`go.mod` 的 `replace` 即可。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `TIFFGETTER_PYTHON` | `python` | Python 解释器，用于 sidecar（SHP 解析、GeoTIFF、Google） |
| `TIFFGETTER_CONTRACT_PATH` | `../TiffGetter-Contract` | `TiffGetter-Contract` 根目录 |
| `TIFFGETTER_OUTPUT_ROOT` | `<当前目录>/data/output` | 执行器默认输出根；界面中的输出目录仍可单独指定 |
| `TIFFGETTER_SETTINGS_PATH` | `%AppData%\TiffGetter-MyGo\settings.json` | 界面设置持久化文件 |

程序不硬编码任何用户绝对路径。Python 解释器与契约路径只通过上述环境变量传入。

`python/sidecar.py` 是 20 行的本地适配器：把 `TIFFGETTER_CONTRACT_PATH` 加入
`sys.path` 后调用 `tiffgetter.sidecar.serve()`。`TiffGetter-Go` 的 sidecar 客户端
按 `python/sidecar.py` 查找脚本，因此该文件随项目提供；`mygo.config.ts` 的
`resources` 会在构建时把它复制到可执行文件旁。sidecar 的协议与业务逻辑仍在
`TiffGetter-Contract` 与 `TiffGetter-Go`，本项目不复制任何采集实现。

## 开发与运行

```powershell
cd D:\CodePool\TiffGetter-MyGo
bun install
bun run dev          # 启动 Vite 开发服务器与 MyGo 桌面窗口
```

`bun run dev` 会运行 `mygo dev`，加载 `http://localhost:5173`，并在 Go 代码变化时
重新生成 `src/mygo.ts`。

## 构建

```powershell
bun run generate     # 仅重新生成 TypeScript 绑定
bun run build        # 构建前端、编译 Go、生成 Windows 安装包
```

构建产物：

```text
build/windows-amd64/TiffGetter-MyGo.exe
build/windows-amd64/tiffgetter-mygo-setup-0.1.0-amd64.exe
```

## 测试

```powershell
go test ./...
```

测试覆盖 Go 服务层：数据源能力、默认设置、设置读写、CSV 模板、残留扫描/清理、
参数错误、取消错误、预检、事件映射。全部离线运行，不访问真实瓦片服务。

前端编译检查：

```powershell
bun run typecheck
bun run build:web
```

## 功能覆盖（F1-F23）

| 编号 | 实现 |
| --- | --- |
| F1 | 数据源下拉显示名称、版权、实验性标记、usage_note、zoom/并发上限 |
| F2 | 单点纬度/经度即时校验、粘贴“纬度,经度”、复位 |
| F3 | Leaflet 地图选点，卫星/矢量切换、点击标记、确认回填 |
| F4 | zoom 1..20，按数据源 min/max 截断并提示 |
| F5 | buffer 半径 50..5000 米 |
| F6 | 日期范围仅对历史源启用，切换非历史源自动清空 |
| F7 | 去重开关，默认开启 |
| F8 | 单点输出目录、批量输出根目录，均可浏览选择 |
| F9 | 开始、停止（取消）任务 |
| F10 | CSV/SHP 选择、前 100 行预览、总数、CSV 模板导出、并发 1..16 |
| F11 | 清理扫描、大小/时间/使用中、全选/反选、仅临时、按勾选执行、使用中锁定 |
| F12 | 结果表日期/名称、状态、失败原因、路径，双击打开 |
| F13 | 退出码 0/2/3/4/5/6 对应运行横幅 |
| F14 | 失败详情含 detail、失败瓦片数、分类、示例 URL，可复制 |
| F15 | 实时日志、等级着色、自动滚动、进度、预计日期数、状态栏 |
| F16 | 8 套主题对（Tokyo Night、Everforest、Dracula、Catppuccin、Nord、Gruvbox、Vapor、Minty）与明暗切换 |
| F17 | 数据源、最近坐标、输出目录、并发、去重、主题持久化 |
| F18 | 预检 rasterio 缺失（仅 PNG）、代理变量、输出目录不可写 |
| F19 | metadata 来源与诊断写入日志/失败详情，产物由 B 写入 |
| F20 | 失败分类对应操作建议 |
| F21 | 批量结束后列出失败坐标与成功/总数 |
| F22 | Google 实验性标记与使用边界提示 |
| F23 | OSM 批量下载二次确认 |

## 目录结构

```text
main.go            MyGo 窗口与绑定入口
service.go         绑定给前端的采集服务、文件对话框、预检、设置
events.go          mygo.NewEvent[FetchEvent] 事件负载与转换
settings.go        设置默认值与读写
service_test.go    Go 服务层测试
index.html         三页工作区、结果、日志、弹窗
src/main.ts        Vite + TypeScript + Leaflet 前端逻辑
src/mygo.ts        mygo generate 生成的类型化客户端
src/style.css      8 套主题变量与布局
python/sidecar.py  TiffGetter-Contract 的 sidecar 薄适配器
mygo.config.ts     MyGo 开发/构建配置
```

## 说明

- 清理扫描根目录为启动时的工作目录，与 B 的
  `ScanCleanup(root)` 语义一致；默认输出位于 `data/output` 下。
- sidecar 不可用时仍可输出 PNG，GeoTIFF/SHP/Google 功能会通过日志明确提示。
- 本项目仅本地运行，不包含认证、多租户、云部署或发布流水线。
