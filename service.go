package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/egoist/mygo"
	tg "github.com/eryieryiya/tiffgetter-go"
)

// AppConfig 是桌面端采集服务配置。
type AppConfig struct {
	PythonPath   string
	ContractPath string
	OutputRoot   string
	ScanRoot     string
	SettingsPath string
}

// ConfigFromEnv 读取环境变量并生成服务配置。
//
// Returns:
//
//	AppConfig。
func ConfigFromEnv() AppConfig {
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}
	outputRoot := os.Getenv("TIFFGETTER_OUTPUT_ROOT")
	if outputRoot == "" {
		outputRoot = filepath.Join(wd, "data", "output")
	}
	settingsPath := os.Getenv("TIFFGETTER_SETTINGS_PATH")
	if settingsPath == "" {
		settingsPath = defaultSettingsPath()
	}
	pythonPath := resolvePythonPath()
	contractPath := resolveContractPath()
	return AppConfig{
		PythonPath:   pythonPath,
		ContractPath: contractPath,
		OutputRoot:   outputRoot,
		ScanRoot:     wd,
		SettingsPath: settingsPath,
	}
}

// resolvePythonPath 解析 sidecar 使用的 Python 解释器。
//
// Returns:
//
//	优先使用 TIFFGETTER_PYTHON；否则尝试 Conda/虚拟环境及 PATH 中的 Python，
//	并优先选择可导入 rasterio 的解释器。
func resolvePythonPath() string {
	if configured := os.Getenv("TIFFGETTER_PYTHON"); configured != "" {
		return configured
	}
	candidates := make([]string, 0, 8)
	if prefix := os.Getenv("CONDA_PREFIX"); prefix != "" {
		candidates = append(candidates, filepath.Join(prefix, "python.exe"))
	}
	if venv := os.Getenv("VIRTUAL_ENV"); venv != "" {
		candidates = append(candidates, filepath.Join(venv, "Scripts", "python.exe"))
	}
	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(exeDir, "..", "..", ".venv", "Scripts", "python.exe"),
			filepath.Join(exeDir, "python.exe"),
		)
	}
	if localAppData := os.Getenv("LOCALAPPDATA"); localAppData != "" {
		matches, _ := filepath.Glob(filepath.Join(localAppData, "Programs", "Python", "Python*", "python.exe"))
		candidates = append(candidates, matches...)
	}
	candidates = append(candidates, "python")
	fallback := ""
	for _, candidate := range candidates {
		if candidate != "python" {
			abs, err := filepath.Abs(candidate)
			if err != nil {
				continue
			}
			if info, err := os.Stat(abs); err != nil || info.IsDir() {
				continue
			}
			candidate = abs
		}
		if fallback == "" {
			fallback = candidate
		}
		check := exec.Command(candidate, "-c", "import rasterio")
		if check.Run() == nil {
			return candidate
		}
	}
	if fallback != "" {
		return fallback
	}
	return "python"
}

// resolveContractPath 解析 TiffGetter-Contract 根目录。
//
// Returns:
//
//	优先使用环境变量；否则依次尝试可执行文件与当前目录的平级位置。
func resolveContractPath() string {
	if configured := os.Getenv("TIFFGETTER_CONTRACT_PATH"); configured != "" {
		return configured
	}
	candidates := make([]string, 0, 4)
	if exe, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exe)
		candidates = append(candidates,
			filepath.Join(exeDir, "..", "..", "..", "TiffGetter-Contract"),
			filepath.Join(exeDir, "..", "..", "TiffGetter-Contract"),
		)
	}
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates,
			filepath.Join(wd, "..", "TiffGetter-Contract"),
			filepath.Join(wd, "..", "..", "TiffGetter-Contract"),
		)
	}
	for _, candidate := range candidates {
		abs, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			return abs
		}
	}
	return filepath.Join("..", "TiffGetter-Contract")
}

// PreflightInfo 是运行前预检结果。
type PreflightInfo struct {
	PythonPath     string   `json:"python_path"`
	ContractPath   string   `json:"contract_path"`
	Rasterio       bool     `json:"rasterio"`
	Proxy          string   `json:"proxy"`
	OutputDir      string   `json:"output_dir"`
	OutputWritable bool     `json:"output_writable"`
	Messages       []string `json:"messages"`
}

// TiffGetter 是暴露给 WebView 前端的采集服务。
type TiffGetter struct {
	executor     *tg.Executor
	manager      *tg.Manager
	pythonPath   string
	contractPath string
	outputRoot   string
	scanRoot     string
	settingsPath string
}

// NewTiffGetter 创建采集服务。
//
// Args:
//
//	cfg: 服务配置。
//
// Returns:
//
//	(*TiffGetter, error)。
func NewTiffGetter(cfg AppConfig) (*TiffGetter, error) {
	executor, err := tg.NewExecutor(tg.Config{
		PythonPath:     cfg.PythonPath,
		ContractPath:   cfg.ContractPath,
		OutputRoot:     cfg.OutputRoot,
		SidecarEnabled: true,
	})
	if err != nil {
		return nil, err
	}
	return &TiffGetter{
		executor:     executor,
		manager:      tg.NewManager(executor),
		pythonPath:   cfg.PythonPath,
		contractPath: cfg.ContractPath,
		outputRoot:   cfg.OutputRoot,
		scanRoot:     cfg.ScanRoot,
		settingsPath: cfg.SettingsPath,
	}, nil
}

// Sources 返回全部数据源能力。
//
// Returns:
//
//	tg.SourceInfo 列表。
func (t *TiffGetter) Sources() []tg.SourceInfo {
	return tg.ListSources()
}

// Defaults 返回首次启动的默认设置。
//
// Returns:
//
//	Settings。
func (t *TiffGetter) Defaults() Settings {
	return defaultSettings()
}

// StartFetch 启动一次抓取任务并返回任务 ID。
//
// Args:
//
//	request: v1 抓取请求。
//
// Returns:
//
//	(jobID, error)。
func (t *TiffGetter) StartFetch(request tg.FetchRequest) (string, error) {
	jobID, err := t.manager.Start(request)
	if err != nil {
		return "", err
	}
	replay, events, unsubscribe, ok := t.manager.Subscribe(jobID, 0)
	if !ok {
		return jobID, nil
	}
	go t.forwardEvents(replay, events, unsubscribe)
	return jobID, nil
}

// forwardEvents 把任务事件转发为 MyGo 事件。
//
// Args:
//
//	replay: 订阅前的回放事件。
//	events: 后续事件通道。
//	unsubscribe: 取消订阅函数。
func (t *TiffGetter) forwardEvents(replay []tg.Event, events <-chan tg.Event, unsubscribe func()) {
	defer unsubscribe()
	for _, event := range replay {
		FetchEvents.Broadcast(fetchEventFrom(event))
	}
	for event := range events {
		FetchEvents.Broadcast(fetchEventFrom(event))
	}
}

// CancelFetch 取消指定任务。
//
// Args:
//
//	jobID: 任务 ID。
//
// Returns:
//
//	error。
func (t *TiffGetter) CancelFetch(jobID string) error {
	if strings.TrimSpace(jobID) == "" {
		return errors.New("任务 ID 不能为空")
	}
	return t.manager.Cancel(jobID)
}

// PreviewCoordinates 解析 CSV/SHP 坐标文件。
//
// Args:
//
//	path: 坐标文件路径。
//
// Returns:
//
//	([]tg.Point, error)。
func (t *TiffGetter) PreviewCoordinates(path string) ([]tg.Point, error) {
	return t.executor.ParseCoordinates(context.Background(), path)
}

// ExportTemplate 把坐标 CSV 模板写入指定路径。
//
// Args:
//
//	path: 目标文件路径。
//
// Returns:
//
//	error。
func (t *TiffGetter) ExportTemplate(path string) error {
	if strings.TrimSpace(path) == "" {
		return errors.New("模板路径不能为空")
	}
	data := "\ufeff" + tg.CoordinateTemplateCSV()
	return os.WriteFile(path, []byte(data), 0o644)
}

// ScanCleanup 扫描临时瓦片与历史日期目录。
//
// Returns:
//
//	([]tg.CleanupItem, error)。
func (t *TiffGetter) ScanCleanup() ([]tg.CleanupItem, error) {
	return tg.ScanCleanup(t.scanRoot), nil
}

// RunCleanup 删除指定残留路径。
//
// Args:
//
//	paths: 待删除路径。
//	tempOnly: 是否仅删除临时瓦片目录。
//
// Returns:
//
//	(tg.CleanupResult, error)。
func (t *TiffGetter) RunCleanup(paths []string, tempOnly bool) (tg.CleanupResult, error) {
	return tg.RunCleanup(paths, tempOnly), nil
}

// ChooseFile 打开系统文件对话框。
//
// Args:
//
//	ctx: 调用上下文，用于把对话框挂到窗口。
//	kind: "coords" 选择坐标文件，"template" 保存模板，其他选择任意文件。
//
// Returns:
//
//	(路径, error)；取消时路径为空。
func (t *TiffGetter) ChooseFile(ctx context.Context, kind string) (string, error) {
	parent := mygo.CallerWindow(ctx)
	switch kind {
	case "coords":
		paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{
			Parent: parent,
			Title:  "选择坐标文件",
			Filters: []mygo.FileFilter{
				{Name: "CSV / SHP", Extensions: []string{"csv", "shp"}},
				{Name: "CSV", Extensions: []string{"csv"}},
				{Name: "SHP", Extensions: []string{"shp"}},
				{Name: "全部文件", Extensions: []string{"*"}},
			},
		})
		if err != nil {
			return "", err
		}
		if len(paths) == 0 {
			return "", nil
		}
		return paths[0], nil
	case "template":
		path, err := mygo.Dialog.Save(mygo.SaveDialogOptions{
			Parent:      parent,
			Title:       "导出坐标 CSV 模板",
			DefaultPath: "tiffgetter_coord_template.csv",
			Filters: []mygo.FileFilter{
				{Name: "CSV", Extensions: []string{"csv"}},
			},
		})
		return path, err
	}
	paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{
		Parent: parent,
		Title:  "选择文件",
		Filters: []mygo.FileFilter{
			{Name: "全部文件", Extensions: []string{"*"}},
		},
	})
	if err != nil {
		return "", err
	}
	if len(paths) == 0 {
		return "", nil
	}
	return paths[0], nil
}

// ChooseDirectory 打开系统目录选择对话框。
//
// Args:
//
//	ctx: 调用上下文，用于把对话框挂到窗口。
//
// Returns:
//
//	(目录, error)；取消时目录为空。
func (t *TiffGetter) ChooseDirectory(ctx context.Context) (string, error) {
	paths, err := mygo.Dialog.Open(mygo.OpenDialogOptions{
		Parent:    mygo.CallerWindow(ctx),
		Title:     "选择输出目录",
		Directory: true,
	})
	if err != nil {
		return "", err
	}
	if len(paths) == 0 {
		return "", nil
	}
	return paths[0], nil
}

// OpenPath 用系统默认程序打开文件或目录。
//
// Args:
//
//	path: 文件或目录路径。
//
// Returns:
//
//	error。
func (t *TiffGetter) OpenPath(path string) error {
	if strings.TrimSpace(path) == "" {
		return errors.New("路径不能为空")
	}
	if _, err := os.Stat(path); err != nil {
		return err
	}
	return mygo.Shell.OpenPath(path)
}

// OpenFolder 打开目录，或在资源管理器中定位文件。
//
// Args:
//
//	path: 目录或文件路径。
//
// Returns:
//
//	error。
func (t *TiffGetter) OpenFolder(path string) error {
	if strings.TrimSpace(path) == "" {
		return errors.New("路径不能为空")
	}
	info, err := os.Stat(path)
	if err != nil {
		return err
	}
	if info.IsDir() {
		return mygo.Shell.OpenPath(path)
	}
	mygo.Shell.ShowItemInFolder(path)
	return nil
}

// LoadSettings 读取持久化设置。
//
// Returns:
//
//	(Settings, error)。
func (t *TiffGetter) LoadSettings() (Settings, error) {
	return loadSettings(t.settingsPath)
}

// SaveSettings 写入持久化设置。
//
// Args:
//
//	settings: 设置内容。
//
// Returns:
//
//	error。
func (t *TiffGetter) SaveSettings(settings Settings) error {
	return saveSettings(t.settingsPath, settings)
}

// Preflight 检查 Python 依赖、代理与输出目录。
//
// Args:
//
//	outputDir: 待检查的输出目录；为空时使用默认单点目录。
//
// Returns:
//
//	PreflightInfo。
func (t *TiffGetter) Preflight(outputDir string) PreflightInfo {
	if strings.TrimSpace(outputDir) == "" {
		outputDir = defaultSettings().SingleOutput
	}
	info := PreflightInfo{
		PythonPath:   t.pythonPath,
		ContractPath: t.contractPath,
		OutputDir:    outputDir,
		Messages:     []string{},
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	check := exec.CommandContext(ctx, t.pythonPath, "-c", "import rasterio")
	info.Rasterio = check.Run() == nil
	if !info.Rasterio {
		info.Messages = append(info.Messages, "未检测到 rasterio：仅输出 PNG，GeoTIFF 不可用")
	}
	proxyParts := []string{}
	for _, name := range []string{"HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"} {
		if value := os.Getenv(name); value != "" {
			proxyParts = append(proxyParts, fmt.Sprintf("%s=%s", name, value))
		}
	}
	info.Proxy = strings.Join(proxyParts, "；")
	if info.Proxy != "" {
		info.Messages = append(info.Messages, "检测到代理变量："+info.Proxy)
	}
	info.OutputWritable = outputWritable(outputDir)
	if !info.OutputWritable {
		info.Messages = append(info.Messages, "输出目录不可写："+outputDir)
	}
	if len(info.Messages) == 0 {
		info.Messages = append(info.Messages, "预检通过")
	}
	return info
}

// outputWritable 检查目录是否可创建并写入临时文件。
//
// Args:
//
//	dir: 目录路径。
//
// Returns:
//
//	True 表示可写。
func outputWritable(dir string) bool {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return false
	}
	file, err := os.CreateTemp(dir, ".tiffgetter-write-check-*")
	if err != nil {
		return false
	}
	name := file.Name()
	file.Close()
	os.Remove(name)
	return true
}

// Close 停止任务并关闭 Python sidecar。
func (t *TiffGetter) Close() {
	t.manager.Close()
	t.executor.Close()
}
