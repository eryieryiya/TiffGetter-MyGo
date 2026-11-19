package main

import (
	"encoding/json"

	"github.com/egoist/mygo"
	tg "github.com/eryieryiya/tiffgetter-go"
)

// FetchEvent 是推送到前端的统一事件负载。
//
// 字段覆盖 log、progress、date_result、coordinate_result、run_summary
// 五类事件；与事件类型无关的字段保持零值。
type FetchEvent struct {
	Type              string         `json:"type"`
	JobID             string         `json:"job_id"`
	Sequence          int            `json:"sequence"`
	Timestamp         string         `json:"timestamp"`
	Level             string         `json:"level"`
	Message           string         `json:"message"`
	Logger            string         `json:"logger"`
	Scope             string         `json:"scope"`
	Current           int            `json:"current"`
	Total             int            `json:"total"`
	Date              string         `json:"date"`
	CoordIndex        int            `json:"coord_index"`
	PointID           string         `json:"point_id"`
	PointName         string         `json:"point_name"`
	Name              string         `json:"name"`
	Lat               float64        `json:"lat"`
	Lon               float64        `json:"lon"`
	OutputDir         string         `json:"output_dir"`
	TotalDates        int            `json:"total_dates"`
	TotalPoints       int            `json:"total_points"`
	Success           int            `json:"success"`
	Failed            int            `json:"failed"`
	Cancelled         bool           `json:"cancelled"`
	Status            string         `json:"status"`
	ExitCode          int            `json:"exit_code"`
	Mode              string         `json:"mode"`
	Error             string         `json:"error"`
	Kind              string         `json:"kind"`
	Detail            string         `json:"detail"`
	Path              string         `json:"path"`
	ReleaseID         string         `json:"release_id"`
	FailedTiles       int            `json:"failed_tiles"`
	TileFailureCounts map[string]int `json:"tile_failure_counts"`
	Samples           []FetchSample  `json:"samples"`
	Bounds            *FetchBounds   `json:"bounds"`
	MetadataSource    string         `json:"metadata_source"`
	MetadataFetchedAt string         `json:"metadata_fetched_at"`
	FailureCounts     map[string]int `json:"failure_counts"`
}

// FetchSample 是一条失败瓦片样本。
type FetchSample struct {
	Kind       string `json:"kind"`
	HTTPStatus *int   `json:"http_status"`
	URL        string `json:"url"`
	Detail     string `json:"detail"`
}

// FetchBounds 是单次结果的 WGS84 边界。
type FetchBounds struct {
	MinLon float64 `json:"min_lon"`
	MinLat float64 `json:"min_lat"`
	MaxLon float64 `json:"max_lon"`
	MaxLat float64 `json:"max_lat"`
}

// FetchEvents 把采集内核事件广播到所有页面。
var FetchEvents = mygo.NewEvent[FetchEvent]("fetch")

// fetchEventFrom 把契约事件转换为前端事件负载。
//
// Args:
//
//	event: 采集内核事件。
//
// Returns:
//
//	FetchEvent。
func fetchEventFrom(event tg.Event) FetchEvent {
	out := FetchEvent{
		Type:              event.Type,
		JobID:             event.JobID,
		Sequence:          event.Sequence,
		Timestamp:         event.Timestamp,
		TileFailureCounts: map[string]int{},
		Samples:           []FetchSample{},
		FailureCounts:     map[string]int{},
	}
	item := event.Item
	switch event.Type {
	case "log":
		out.Level = eventString(item["level"])
		out.Message = eventString(item["message"])
		out.Logger = eventString(item["logger"])
	case "progress":
		out.Scope = eventString(item["scope"])
		out.Current = eventInt(item["current"])
		out.Total = eventInt(item["total"])
		out.Date = eventString(item["date"])
		out.CoordIndex = eventInt(item["coord_index"])
		out.PointID = eventString(item["point_id"])
		out.PointName = eventString(item["point_name"])
	case "date_result":
		out.CoordIndex = eventInt(item["coord_index"])
		out.PointID = eventString(item["point_id"])
		out.PointName = eventString(item["point_name"])
		out.Date = eventString(item["date"])
		out.Name = eventString(item["name"])
		out.Status = eventString(item["status"])
		out.Kind = eventString(item["kind"])
		out.Detail = eventString(item["detail"])
		out.Path = eventString(item["path"])
		out.ReleaseID = eventString(item["release_id"])
		out.FailedTiles = eventInt(item["failed_tiles"])
		out.MetadataSource = eventString(item["metadata_source"])
		out.MetadataFetchedAt = eventString(item["metadata_fetched_at"])
		out.TileFailureCounts = eventIntMap(item["tile_failure_counts"])
		out.Samples = eventSamples(item["samples"])
		out.Bounds = eventBounds(item["bounds"])
	case "coordinate_result":
		out.CoordIndex = eventInt(item["index"])
		out.Name = eventString(item["name"])
		out.Lat = eventFloat(item["lat"])
		out.Lon = eventFloat(item["lon"])
		out.OutputDir = eventString(item["output_dir"])
		out.TotalDates = eventInt(item["total_dates"])
		out.Success = eventInt(item["success"])
		out.Failed = eventInt(item["failed"])
		out.Cancelled = eventBool(item["cancelled"])
	case "run_summary":
		out.Mode = eventString(item["mode"])
		out.Success = eventInt(item["success"])
		out.Failed = eventInt(item["failed"])
		out.Total = eventInt(item["total"])
		out.TotalDates = eventInt(item["total_dates"])
		out.TotalPoints = eventInt(item["total_points"])
		out.Cancelled = eventBool(item["cancelled"])
		out.Status = eventString(item["status"])
		out.ExitCode = eventInt(item["exit_code"])
		out.Error = eventString(item["error"])
		out.FailureCounts = eventIntMap(item["failure_counts"])
	}
	return out
}

// eventString 读取字符串或字符串指针。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	字符串，空值返回空串。
func eventString(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case *string:
		if typed == nil {
			return ""
		}
		return *typed
	}
	return ""
}

// eventInt 读取整数数值。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	整数，无法识别时返回 0。
func eventInt(value any) int {
	switch typed := value.(type) {
	case int:
		return typed
	case int32:
		return int(typed)
	case int64:
		return int(typed)
	case float64:
		return int(typed)
	}
	return 0
}

// eventFloat 读取浮点数值。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	浮点数，无法识别时返回 0。
func eventFloat(value any) float64 {
	switch typed := value.(type) {
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	}
	return 0
}

// eventBool 读取布尔值。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	布尔值，无法识别时返回 false。
func eventBool(value any) bool {
	if typed, ok := value.(bool); ok {
		return typed
	}
	return false
}

// eventIntMap 复制整数映射。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	非空整数映射。
func eventIntMap(value any) map[string]int {
	out := map[string]int{}
	if value == nil {
		return out
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return out
	}
	parsed := map[string]int{}
	if err := json.Unmarshal(raw, &parsed); err != nil || parsed == nil {
		return map[string]int{}
	}
	return parsed
}

// eventSamples 复制失败样本列表。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	非空样本列表。
func eventSamples(value any) []FetchSample {
	out := []FetchSample{}
	if value == nil {
		return out
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return out
	}
	parsed := []FetchSample{}
	if err := json.Unmarshal(raw, &parsed); err != nil || parsed == nil {
		return []FetchSample{}
	}
	return parsed
}

// eventBounds 复制边界对象。
//
// Args:
//
//	value: 事件字段值。
//
// Returns:
//
//	边界对象或 nil。
func eventBounds(value any) *FetchBounds {
	if value == nil {
		return nil
	}
	raw, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	var out FetchBounds
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil
	}
	return &out
}
