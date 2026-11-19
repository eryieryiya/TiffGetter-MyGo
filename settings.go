package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// Settings 是持久化的界面与任务偏好。
type Settings struct {
	Source           string `json:"source"`
	Zoom             int    `json:"zoom"`
	BufferRadiusM    int    `json:"buffer_radius_m"`
	Dedup            bool   `json:"dedup"`
	CoordConcurrency int    `json:"coord_concurrency"`
	SingleOutput     string `json:"single_output"`
	BatchOutput      string `json:"batch_output"`
	Lat              string `json:"lat"`
	Lon              string `json:"lon"`
	DateStart        string `json:"date_start"`
	DateEnd          string `json:"date_end"`
	LastCoordsFile   string `json:"last_coords_file"`
	Theme            string `json:"theme"`
	Mode             string `json:"mode"`
}

// defaultSettings 返回首次启动的默认设置。
//
// Returns:
//
//	Settings。
func defaultSettings() Settings {
	return Settings{
		Source:           "wayback",
		Zoom:             18,
		BufferRadiusM:    500,
		Dedup:            true,
		CoordConcurrency: 1,
		SingleOutput:     filepath.Join("data", "output", "historical"),
		BatchOutput:      filepath.Join("data", "output", "batch"),
		Lat:              "35.6586",
		Lon:              "139.7454",
		DateStart:        "",
		DateEnd:          "",
		LastCoordsFile:   "",
		Theme:            "tokyo-night",
		Mode:             "dark",
	}
}

// defaultSettingsPath 返回用户配置目录下的设置文件。
//
// Returns:
//
//	设置文件路径。
func defaultSettingsPath() string {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return filepath.Join("data", "settings.json")
	}
	return filepath.Join(configDir, "TiffGetter-MyGo", "settings.json")
}

// loadSettings 读取设置文件；不存在时返回默认值。
//
// Args:
//
//	path: 设置文件路径。
//
// Returns:
//
//	(Settings, error)。
func loadSettings(path string) (Settings, error) {
	settings := defaultSettings()
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return settings, nil
		}
		return settings, err
	}
	if err := json.Unmarshal(data, &settings); err != nil {
		return defaultSettings(), err
	}
	return settings, nil
}

// saveSettings 写入设置文件。
//
// Args:
//
//	path: 设置文件路径。
//	settings: 设置内容。
//
// Returns:
//
//	error。
func saveSettings(path string, settings Settings) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(path, data, 0o644)
}
