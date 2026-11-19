package main

import (
	"log"

	"github.com/egoist/mygo"
)

// main 创建 MyGo 窗口并把采集服务绑定给 WebView 前端。
func main() {
	service, err := NewTiffGetter(ConfigFromEnv())
	if err != nil {
		log.Fatal(err)
	}
	mygo.Bind(service)
	mygo.App.OnWillQuit(func(*mygo.QuitEvent) {
		service.Close()
	})
	mygo.App.WhenReady(func() {
		mygo.NewWindow(mygo.WindowOptions{
			Title:           "TiffGetter 卫星影像获取",
			Width:           1360,
			Height:          880,
			MinWidth:        1120,
			MinHeight:       720,
			BackgroundColor: "light-dark(#f6f7f9, #0f1115)",
			StateKey:        "main",
			URL:             "/",
		})
	})
	if err := mygo.App.Run(); err != nil {
		log.Fatal(err)
	}
}
