package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	tg "github.com/eryieryiya/tiffgetter-go"
)

// newTestService 创建使用临时目录与不存在的 Python 的服务实例。
//
// Args:
//
//	t: 测试上下文。
//
// Returns:
//
//	(*TiffGetter, string 扫描根目录)。
func newTestService(t *testing.T) (*TiffGetter, string) {
	t.Helper()
	root := t.TempDir()
	service, err := NewTiffGetter(AppConfig{
		PythonPath:   filepath.Join(root, "missing-python"),
		ContractPath: filepath.Join(root, "contract"),
		OutputRoot:   filepath.Join(root, "data", "output"),
		ScanRoot:     root,
		SettingsPath: filepath.Join(root, "settings.json"),
	})
	if err != nil {
		t.Fatalf("NewTiffGetter: %v", err)
	}
	t.Cleanup(service.Close)
	return service, root
}

// TestSources 校验五个数据源与能力字段。
func TestSources(t *testing.T) {
	service, _ := newTestService(t)
	items := service.Sources()
	if len(items) != 5 {
		t.Fatalf("Sources length = %d, want 5", len(items))
	}
	for _, item := range items {
		if item.Name == "" || item.DisplayName == "" || item.Attribution == "" {
			t.Errorf("SourceInfo 缺少基础字段: %+v", item)
		}
		if item.MaxZoom < item.MinZoom {
			t.Errorf("SourceInfo zoom 范围非法: %+v", item)
		}
	}
	if items[0].Name != "wayback" || !items[0].SupportsHistory {
		t.Errorf("首个数据源应为支持历史的 wayback: %+v", items[0])
	}
}

// TestDefaults 校验默认设置。
func TestDefaults(t *testing.T) {
	service, _ := newTestService(t)
	settings := service.Defaults()
	if settings.Source != "wayback" {
		t.Errorf("Source = %q", settings.Source)
	}
	if settings.Zoom != 18 || settings.BufferRadiusM != 500 {
		t.Errorf("zoom/buffer = %d/%d", settings.Zoom, settings.BufferRadiusM)
	}
	if !settings.Dedup || settings.CoordConcurrency != 1 {
		t.Errorf("dedup/concurrency = %v/%d", settings.Dedup, settings.CoordConcurrency)
	}
	if settings.SingleOutput == "" || settings.BatchOutput == "" {
		t.Errorf("输出目录为空: %+v", settings)
	}
	if settings.Lat == "" || settings.Lon == "" {
		t.Errorf("默认坐标为空: %+v", settings)
	}
}

// TestSettingsRoundTrip 校验设置读写。
func TestSettingsRoundTrip(t *testing.T) {
	service, _ := newTestService(t)
	settings := service.Defaults()
	settings.Source = "esri"
	settings.Zoom = 16
	settings.BufferRadiusM = 800
	settings.Dedup = false
	settings.CoordConcurrency = 4
	settings.Theme = "nord"
	settings.Mode = "light"
	if err := service.SaveSettings(settings); err != nil {
		t.Fatalf("SaveSettings: %v", err)
	}
	loaded, err := service.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings: %v", err)
	}
	if loaded.Source != "esri" || loaded.Zoom != 16 || loaded.BufferRadiusM != 800 {
		t.Errorf("设置未正确恢复: %+v", loaded)
	}
	if loaded.Dedup || loaded.CoordConcurrency != 4 || loaded.Theme != "nord" || loaded.Mode != "light" {
		t.Errorf("设置未正确恢复: %+v", loaded)
	}
}

// TestLoadSettingsDefaults 校验缺失文件返回默认值。
func TestLoadSettingsDefaults(t *testing.T) {
	service, _ := newTestService(t)
	loaded, err := service.LoadSettings()
	if err != nil {
		t.Fatalf("LoadSettings: %v", err)
	}
	expected := service.Defaults()
	if loaded.Source != expected.Source || loaded.Zoom != expected.Zoom {
		t.Errorf("默认设置不一致: %+v", loaded)
	}
}

// TestExportTemplate 校验 CSV 模板导出。
func TestExportTemplate(t *testing.T) {
	service, root := newTestService(t)
	path := filepath.Join(root, "template.csv")
	if err := service.ExportTemplate(path); err != nil {
		t.Fatalf("ExportTemplate: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("ReadFile: %v", err)
	}
	text := string(data)
	if !strings.HasPrefix(text, "\ufeff") {
		t.Errorf("模板缺少 BOM")
	}
	if !strings.Contains(text, "name,id,lat,lon") {
		t.Errorf("模板缺少表头: %q", text)
	}
	if !strings.Contains(text, "Tokyo Tower") {
		t.Errorf("模板缺少示例坐标: %q", text)
	}
}

// TestScanAndCleanup 校验残留扫描与清理。
func TestScanAndCleanup(t *testing.T) {
	service, root := newTestService(t)
	tempDir := filepath.Join(root, "temp_tiles_wayback_2024-08-15_1234")
	if err := os.MkdirAll(tempDir, 0o755); err != nil {
		t.Fatalf("MkdirAll temp: %v", err)
	}
	if err := os.WriteFile(filepath.Join(tempDir, "0_0.png"), []byte("tile"), 0o644); err != nil {
		t.Fatalf("WriteFile tile: %v", err)
	}
	releaseDir := filepath.Join(root, "data", "output", "historical", "2024-08-15")
	if err := os.MkdirAll(releaseDir, 0o755); err != nil {
		t.Fatalf("MkdirAll release: %v", err)
	}
	if err := os.WriteFile(filepath.Join(releaseDir, "metadata.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("WriteFile metadata: %v", err)
	}

	items, err := service.ScanCleanup()
	if err != nil {
		t.Fatalf("ScanCleanup: %v", err)
	}
	kinds := map[string]string{}
	for _, item := range items {
		kinds[item.Kind] = item.Path
		if item.SizeBytes <= 0 {
			t.Errorf("SizeBytes 应为正: %+v", item)
		}
	}
	if _, ok := kinds["temp_tiles"]; !ok {
		t.Errorf("未扫描到临时瓦片目录: %+v", kinds)
	}
	if _, ok := kinds["historical_date"]; !ok {
		t.Errorf("未扫描到历史日期目录: %+v", kinds)
	}

	tempOnly, err := service.RunCleanup([]string{kinds["temp_tiles"], kinds["historical_date"]}, true)
	if err != nil {
		t.Fatalf("RunCleanup tempOnly: %v", err)
	}
	if len(tempOnly.Deleted) != 1 || tempOnly.Deleted[0] != kinds["temp_tiles"] {
		t.Errorf("仅临时清理结果错误: %+v", tempOnly)
	}
	if len(tempOnly.Skipped) != 1 || tempOnly.Skipped[0] != kinds["historical_date"] {
		t.Errorf("仅临时清理应跳历史目录: %+v", tempOnly)
	}
	if _, err := os.Stat(kinds["temp_tiles"]); !os.IsNotExist(err) {
		t.Errorf("临时目录未被删除")
	}

	full, err := service.RunCleanup([]string{kinds["historical_date"]}, false)
	if err != nil {
		t.Fatalf("RunCleanup: %v", err)
	}
	if len(full.Deleted) != 1 || len(full.Failed) != 0 {
		t.Errorf("完整清理结果错误: %+v", full)
	}
	if _, err := os.Stat(kinds["historical_date"]); !os.IsNotExist(err) {
		t.Errorf("历史目录未被删除")
	}
}

// TestStartFetchRejectsInvalidRequest 校验参数错误在启动阶段返回。
func TestStartFetchRejectsInvalidRequest(t *testing.T) {
	service, root := newTestService(t)
	start := "2024-01-01"
	end := "2024-12-31"
	request := tg.FetchRequest{
		SchemaVersion: "1.0",
		RequestID:     "req-invalid",
		Source:        "esri",
		Points:        []tg.Point{{ID: "p1", Name: "Tokyo", Lat: 35.6586, Lon: 139.7454}},
		Options: tg.FetchOptions{
			Zoom:             18,
			BufferRadiusM:    500,
			DateStart:        &start,
			DateEnd:          &end,
			Dedup:            true,
			CoordConcurrency: 1,
		},
		Output: tg.OutputOptions{Root: stringPointer(filepath.Join(root, "out")), Layout: "explicit"},
	}
	if _, err := service.StartFetch(request); err == nil {
		t.Fatalf("esri 携带日期范围应返回参数错误")
	}

	request.Source = "wayback"
	request.Options.DateStart = nil
	request.Options.DateEnd = nil
	request.Points = []tg.Point{{ID: "p1", Name: "Tokyo", Lat: 91, Lon: 139.7454}}
	if _, err := service.StartFetch(request); err == nil {
		t.Fatalf("纬度越界应返回参数错误")
	}
}

// TestCancelFetchUnknown 校验取消不存在的任务返回错误。
func TestCancelFetchUnknown(t *testing.T) {
	service, _ := newTestService(t)
	if err := service.CancelFetch("missing"); err == nil {
		t.Fatalf("取消不存在的任务应返回错误")
	}
	if err := service.CancelFetch(""); err == nil {
		t.Fatalf("空任务 ID 应返回错误")
	}
}

// TestPreflight 校验预检字段与不可写目录提示。
func TestPreflight(t *testing.T) {
	service, root := newTestService(t)
	writable := filepath.Join(root, "writable")
	info := service.Preflight(writable)
	if !info.OutputWritable {
		t.Errorf("目录应可写: %+v", info)
	}
	if info.Rasterio {
		t.Errorf("不存在的 Python 不应报告 rasterio 可用")
	}
	if info.PythonPath == "" || info.OutputDir != writable {
		t.Errorf("预检字段错误: %+v", info)
	}
	if len(info.Messages) == 0 {
		t.Errorf("预检应包含提示")
	}
	blocked := filepath.Join(root, "file-not-dir")
	if err := os.WriteFile(blocked, []byte("x"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	bad := service.Preflight(blocked)
	if bad.OutputWritable {
		t.Errorf("文件路径不应报告可写: %+v", bad)
	}
}

// TestFetchEventFrom 校验事件字段映射。
func TestFetchEventFrom(t *testing.T) {
	logEvent := fetchEventFrom(tg.Event{
		Type:     "log",
		JobID:    "job-1",
		Sequence: 2,
		Item:     map[string]any{"level": "WARNING", "message": "hello", "logger": "test"},
	})
	if logEvent.Level != "WARNING" || logEvent.Message != "hello" || logEvent.Logger != "test" {
		t.Errorf("log 事件映射错误: %+v", logEvent)
	}
	if logEvent.TileFailureCounts == nil || logEvent.Samples == nil {
		t.Errorf("事件集合字段应初始化为空")
	}

	detail := "tile failed"
	kind := "forbidden"
	status := 403
	dateEvent := fetchEventFrom(tg.Event{
		Type:     "date_result",
		JobID:    "job-1",
		Sequence: 3,
		Item: map[string]any{
			"coord_index":         2,
			"point_name":          "Tokyo",
			"date":                "2024-08-15",
			"name":                "Tokyo",
			"status":              "failed",
			"kind":                kind,
			"detail":              detail,
			"failed_tiles":        7,
			"metadata_source":     "online",
			"tile_failure_counts": map[string]int{"forbidden": 7},
			"samples": []map[string]any{{
				"kind":        "forbidden",
				"http_status": status,
				"url":         "https://example.com/tile",
				"detail":      detail,
			}},
			"bounds": map[string]float64{
				"min_lon": 139.7,
				"min_lat": 35.6,
				"max_lon": 139.8,
				"max_lat": 35.7,
			},
		},
	})
	if dateEvent.CoordIndex != 2 || dateEvent.Date != "2024-08-15" || dateEvent.Status != "failed" {
		t.Errorf("date_result 基础字段错误: %+v", dateEvent)
	}
	if dateEvent.Kind != kind || dateEvent.Detail != detail || dateEvent.FailedTiles != 7 {
		t.Errorf("date_result 失败字段错误: %+v", dateEvent)
	}
	if dateEvent.TileFailureCounts["forbidden"] != 7 {
		t.Errorf("失败分类计数错误: %+v", dateEvent.TileFailureCounts)
	}
	if len(dateEvent.Samples) != 1 {
		t.Fatalf("样本数量 = %d", len(dateEvent.Samples))
	}
	if dateEvent.Samples[0].HTTPStatus == nil || *dateEvent.Samples[0].HTTPStatus != 403 {
		t.Errorf("样本 HTTP 状态错误: %+v", dateEvent.Samples[0])
	}
	if dateEvent.Bounds == nil || dateEvent.Bounds.MaxLon != 139.8 {
		t.Errorf("边界映射错误: %+v", dateEvent.Bounds)
	}

	summary := fetchEventFrom(tg.Event{
		Type: "run_summary",
		Item: map[string]any{
			"mode":           "batch",
			"success":        3,
			"failed":         1,
			"total":          4,
			"total_dates":    4,
			"total_points":   2,
			"failure_counts": map[string]int{"network": 1},
			"cancelled":      false,
			"status":         "partial",
			"exit_code":      3,
		},
	})
	if summary.Success != 3 || summary.Failed != 1 || summary.ExitCode != 3 || summary.Mode != "batch" {
		t.Errorf("run_summary 映射错误: %+v", summary)
	}
	if summary.FailureCounts["network"] != 1 || summary.TotalPoints != 2 {
		t.Errorf("run_summary 统计错误: %+v", summary)
	}

	coordinate := fetchEventFrom(tg.Event{
		Type: "coordinate_result",
		Item: map[string]any{
			"index":       2,
			"name":        "Tokyo",
			"lat":         35.6,
			"lon":         139.7,
			"output_dir":  "out/Tokyo",
			"total_dates": 5,
			"success":     4,
			"failed":      1,
			"cancelled":   false,
		},
	})
	if coordinate.CoordIndex != 2 || coordinate.Name != "Tokyo" || coordinate.TotalDates != 5 {
		t.Errorf("coordinate_result 映射错误: %+v", coordinate)
	}
	if coordinate.Lat != 35.6 || coordinate.Lon != 139.7 || coordinate.OutputDir != "out/Tokyo" {
		t.Errorf("coordinate_result 坐标错误: %+v", coordinate)
	}
}

// TestOutputWritable 校验目录可写检查。
func TestOutputWritable(t *testing.T) {
	root := t.TempDir()
	if !outputWritable(filepath.Join(root, "a", "b")) {
		t.Errorf("新建嵌套目录应可写")
	}
	file := filepath.Join(root, "plain-file")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("WriteFile: %v", err)
	}
	if outputWritable(file) {
		t.Errorf("普通文件不应报告可写")
	}
}

// stringPointer 返回字符串指针。
//
// Args:
//
//	value: 字符串。
//
// Returns:
//
//	*string。
func stringPointer(value string) *string {
	return &value
}
