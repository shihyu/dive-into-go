# Go 內置分析工具

這一章節將介紹Go 內置分析工具。通過這些工具我們可以分析、診斷、跟蹤競態，GMP調度，CPU耗用等問題。

## go build

`go build`命令用來編譯Go 程序。`go build`重要的命令行選項有以下幾個：

### go build -n
`-n`選項用來顯示編譯過程中所有執行的命令，不會真正執行。通過該選項我們可以查看編譯器，連接器如何工作的：

```shell
#
# _/home/vagrant/dive-into-go
#

mkdir -p $WORK/b001/
cat >$WORK/b001/importcfg << 'EOF' # internal
# import config
packagefile fmt=/usr/lib/go/pkg/linux_amd64/fmt.a
packagefile runtime=/usr/lib/go/pkg/linux_amd64/runtime.a
EOF
cd /home/vagrant/dive-into-go
/usr/lib/go/pkg/tool/linux_amd64/compile -o $WORK/b001/_pkg_.a -trimpath "$WORK/b001=>" -p main -complete -buildid RcHLBQbXBa2gQVsMR6P0/RcHLBQbXBa2gQVsMR6P0 -goversion go1.14.13 -D _/home/vagrant/dive-into-go -importcfg $WORK/b001/importcfg -pack ./empty_string.go ./string.go
/usr/lib/go/pkg/tool/linux_amd64/buildid -w $WORK/b001/_pkg_.a # internal
cat >$WORK/b001/importcfg.link << 'EOF' # internal
packagefile _/home/vagrant/dive-into-go=$WORK/b001/_pkg_.a
packagefile fmt=/usr/lib/go/pkg/linux_amd64/fmt.a
packagefile runtime=/usr/lib/go/pkg/linux_amd64/runtime.a
packagefile errors=/usr/lib/go/pkg/linux_amd64/errors.a
packagefile internal/fmtsort=/usr/lib/go/pkg/linux_amd64/internal/fmtsort.a
packagefile io=/usr/lib/go/pkg/linux_amd64/io.a
packagefile math=/usr/lib/go/pkg/linux_amd64/math.a
packagefile os=/usr/lib/go/pkg/linux_amd64/os.a
packagefile reflect=/usr/lib/go/pkg/linux_amd64/reflect.a
packagefile strconv=/usr/lib/go/pkg/linux_amd64/strconv.a
packagefile sync=/usr/lib/go/pkg/linux_amd64/sync.a
packagefile unicode/utf8=/usr/lib/go/pkg/linux_amd64/unicode/utf8.a
packagefile internal/bytealg=/usr/lib/go/pkg/linux_amd64/internal/bytealg.a
packagefile internal/cpu=/usr/lib/go/pkg/linux_amd64/internal/cpu.a
packagefile runtime/internal/atomic=/usr/lib/go/pkg/linux_amd64/runtime/internal/atomic.a
packagefile runtime/internal/math=/usr/lib/go/pkg/linux_amd64/runtime/internal/math.a
packagefile runtime/internal/sys=/usr/lib/go/pkg/linux_amd64/runtime/internal/sys.a
packagefile internal/reflectlite=/usr/lib/go/pkg/linux_amd64/internal/reflectlite.a
packagefile sort=/usr/lib/go/pkg/linux_amd64/sort.a
packagefile math/bits=/usr/lib/go/pkg/linux_amd64/math/bits.a
packagefile internal/oserror=/usr/lib/go/pkg/linux_amd64/internal/oserror.a
packagefile internal/poll=/usr/lib/go/pkg/linux_amd64/internal/poll.a
packagefile internal/syscall/execenv=/usr/lib/go/pkg/linux_amd64/internal/syscall/execenv.a
packagefile internal/syscall/unix=/usr/lib/go/pkg/linux_amd64/internal/syscall/unix.a
packagefile internal/testlog=/usr/lib/go/pkg/linux_amd64/internal/testlog.a
packagefile sync/atomic=/usr/lib/go/pkg/linux_amd64/sync/atomic.a
packagefile syscall=/usr/lib/go/pkg/linux_amd64/syscall.a
packagefile time=/usr/lib/go/pkg/linux_amd64/time.a
packagefile unicode=/usr/lib/go/pkg/linux_amd64/unicode.a
packagefile internal/race=/usr/lib/go/pkg/linux_amd64/internal/race.a
EOF
mkdir -p $WORK/b001/exe/
cd .
/usr/lib/go/pkg/tool/linux_amd64/link -o $WORK/b001/exe/a.out -importcfg $WORK/b001/importcfg.link -buildmode=exe -buildid=nR64Q3qx-0ZdNI4_-qJS/RcHLBQbXBa2gQVsMR6P0/RcHLBQbXBa2gQVsMR6P0/nR64Q3qx-0ZdNI4_-qJS -extld=gcc $WORK/b001/_pkg_.a
/usr/lib/go/pkg/tool/linux_amd64/buildid -w $WORK/b001/exe/a.out # internal
mv $WORK/b001/exe/a.out dive-into-go
```

### go build -race

`-race`選項用來檢查代碼中是否存在競態問題。`-race`可以用在多個子命令中：

```
go test -race mypkg
go run -race mysrc.go
go build -race mycmd
go install -race mypkg
```

下面是來自Go語言官方博客的一個示例[^1]，在該示例中演示了使用`-race`選項檢查代碼中的競態問題：

```go
func main() {
	start := time.Now()
	var t *time.Timer
	t = time.AfterFunc(randomDuration(), func() {
		fmt.Println(time.Now().Sub(start))
		t.Reset(randomDuration())
	})

	time.Sleep(5 * time.Second)
}

func randomDuration() time.Duration {
	return time.Duration(rand.Int63n(1e9))
}
```

上面代碼完成的功能是通過`time.AfterFunc`創建定時器，該定時器會在`randomDuration()`時候打印消息，此外還會通過`Rest()`方法重置該定時器，以達到重複利用該定時器目的。

當我們使用`-race`選項執行檢查時候，可以發現上面代碼是存在競態問題的：

```shell
$ go run -race main.go
==================
WARNING: DATA RACE
Read by goroutine 5:
  main.func·001()
     race.go:14 +0x169

Previous write by goroutine 1:
  main.main()
      race.go:15 +0x174

Goroutine 5 (running) created at:
  time.goFunc()
      src/pkg/time/sleep.go:122 +0x56
  timerproc()
     src/pkg/runtime/ztime_linux_amd64.c:181 +0x189
==================
```

### go build -gcflags

`-gcflags`選項用來設置編譯器編譯時參數，支持的參數有：

- -N選項指示禁止優化
- -l選項指示禁止內聯
- -S選項指示打印出彙編代碼
- -m選項指示打印出變量變量逃逸信息，`-m -m`可以打印出更豐富的變量逃逸信息

`-gcflags`支持只在編譯特定包時候才傳遞編譯參數，此時的`-gcflags`格式爲`包名=參數列表`。

```
go build -gcflags="-N -l -S"  main.go // 打印出main.go對應的彙編代碼
go build -gcflags="log=-N -l" main.go // 只對log包進行禁止優化，禁止內聯操作
```

## go tool compile

`go tool compile`命令用於彙編處理Go 程序文件。`go tool compile`支持常見選項有：

- -N選項指示禁止優化
- -l選項指示禁止內聯
- -S選項指示打印出彙編代碼
- -m選項指示打印出變量內存逃逸信息

```shell
go tool compile -N -l -S main.go # 打印出main.go對應的彙編代碼
GOOS=linux GOARCH=amd64 go tool compile -N -l -S main.go # 打印出針對特定系統和CPU架構的彙編代碼
```

## go tool nm

`go tool nm`命令用來查看Go 二進制文件中符號表信息。

```shell
go tool nm ./main | grep "runtime.zerobase"
```

## go tool objdump

`go tool objdump`命令用來根據目標文件或二進制文件反編譯出彙編代碼。該命令支持兩個選項：

- -S選項指示打印彙編代碼
- -s選項指示搜索相關的彙編代碼

```
go tool compile -N -l main.go # 生成main.o
go tool objdump main.o # 打印所有彙編代碼
go tool objdump -s "main.(main|add)" ./test # objdump支持搜索特定字符串
```

## go tool trace

## GODEBUG環境變量

`GODEBUG`是控制運行時調試的變量，其參數以逗號分隔，格式爲：name=val。`GODEBUG`可以用來觀察GMP調度和GC過程。

### GMP調度

與GMP調度相關的兩個參數：

- schedtrace：設置 schedtrace=X 參數可以使運行時在每 X 毫秒輸出一行調度器的摘要信息到標準 err 輸出中。

- scheddetail：設置 schedtrace=X 和 scheddetail=1 可以使運行時在每 X 毫秒輸出一次詳細的多行信息，信息內容主要包括調度程序、處理器、OS 線程 和 Goroutine 的狀態。

我們以下面代碼爲例：

```go
package main

import (
    "sync"
    "time"
)

func main() {
	var wg sync.WaitGroup
	for i := 0; i < 2000; i++ {
		wg.Add(1)
		go func() {
			a := 0

			for i := 0; i < 1e6; i++ {
				a += 1
			}

			wg.Done()
        }()
        time.Sleep(100 * time.Millisecond)
	}

	wg.Wait()
}
```

執行以下代碼獲取GMP調度信息：

```shell
GODEBUG=schedtrace=1000 go run ./test.go
```

筆者本人電腦輸出以下內容：

```shell
SCHED 0ms: gomaxprocs=8 idleprocs=6 threads=4 spinningthreads=1 idlethreads=0 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 0ms: gomaxprocs=8 idleprocs=5 threads=3 spinningthreads=1 idlethreads=0 runqueue=0 [1 0 0 0 0 0 0 0]
SCHED 0ms: gomaxprocs=8 idleprocs=5 threads=5 spinningthreads=1 idlethreads=0 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 0ms: gomaxprocs=8 idleprocs=5 threads=5 spinningthreads=2 idlethreads=0 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 1007ms: gomaxprocs=8 idleprocs=8 threads=16 spinningthreads=0 idlethreads=9 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 1000ms: gomaxprocs=8 idleprocs=8 threads=5 spinningthreads=0 idlethreads=3 runqueue=0 [0 0 0 0 0 0 0 0]
SCHED 2018ms: gomaxprocs=8 idleprocs=8 threads=16 spinningthreads=0 idlethreads=9 runqueue=0 [0 0 0 0 0 0 0 0]
```

上面輸出內容解釋說明：

- SCHED XXms: SCHED是調度日誌輸出標誌符。XXms是自程序啓動之後到輸出當前行時間
- gomaxprocs： P的數量，等於當前的 CPU 核心數，或者GOMAXPROCS環境變量的值
- idleprocs： 空閒P的數量，與gomaxprocs的差值即運行中P的數量
- threads： 線程數量，即M的數量
- spinningthreads：自旋狀態線程的數量。當M沒有找到可供其調度執行的 Goroutine 時，該線程並不會銷燬，而是出於自旋狀態
- idlethreads：空閒線程的數量
- runqueue：全局隊列中G的數量
- [0 0 0 0 0 0 0 0]：表示P本地隊列下G的數量，有幾個P中括號裏面就會有幾個數字

### GC

與 GC 相關的參數是 gctrace，當設置爲1時候，會輸出GC相關信息到標準錯誤輸出。使用方式示例如下：

```shell
GODEBUG=gctrace=1 go run main.go
```

GC 時候輸出的內容格式如下：

```rust
gc # @#s #%: #+#+# ms clock, #+#/#/#+# ms cpu, #->#-># MB, # MB goal, # P
```

格式解釋說明如下：

- **gc #**：GC 編號，每次 GC 時遞增
- **@#s**：程序自啓動以來的時間（單位秒）
- **#%**：程序自啓動以來花費在 GC 上的時間百分比
- **#+...+#**：GC 各階段花費的時間，分別爲單個P的牆上時間和累計CPU時間
- **#->#-># MB**：分別表示 GC 啓動時, GC 結束時, GC 活動時的堆大小
- **#MB goal**：下一次觸發 GC 的內存佔用閾值
- **#P**：當前使用的處理器P的數量

比如對於下面的輸出內容，詳細解釋如下：

> gc 100 @0.904s 11%: 0.043+2.8+0.029 ms clock, 0.34+3.4/5.4/13.6+0.23 ms cpu, 10->11->6 MB, 12 MB goal, 8 P

- **gc 100**：第 100 次 GC
- **@0.904s**：當前時間是程序啓動後的0.904s
- **11%**：程序啓動後到現在共花費 11% 的時間在 GC 上
- **0.043+2.8+0.029 ms clock**
    - 0.043：表示單個 P 在 mark 階段的 STW 時間
    - 2.8：表示所有 P 的 concurrent mark（併發標記）所使用的時間
    - 0.029：表示單個 P 的 markTermination 階段的 STW 時間
- **0.34+3.4/5.4/0+0.23 ms cpu**
    - 0.34：表示整個進程在 mark 階段 STW 停頓的時間，一共0.34秒，即 0.043 * 8
    - 3.4/5.4/13.6：3.4 表示 mutator assist 佔用的時間，5.4 表示 dedicated + fractional 佔用的時間，13.6 表示 idle 佔用的時間。這三塊累計時間爲22.4，即2.8 * 8
    - 0.23 ms：0.23 表示整個進程在 markTermination 階段 STW 時間，即0.029 * 8
- **10->11->6 MB**
    - 10：表示開始 mark 階段前的 heap_live 大小
    - 11：表示開始 markTermination 階段前的 heap_live 大小
    - 6：表示被標記對象的大小
- **12 MB goal**：表示下一次觸發 GC 回收的閾值是 12 MB
- **8 P**：本次 GC 一共涉及8 個P

#### GOGC參數

Go語言GC相關的另外一個參數是GOGC。GOGC 用於控制GC的處發頻率， 其值默認爲100, 這意味着直到自上次垃圾回收後heap size已經增長了100%時GC才觸發運行，live heap size每增長一倍，GC觸發運行一次。若設定GOGC=200, 則live heap size 自上次垃圾回收後，增長2倍時，GC觸發運行， 總之，其值越大則GC觸發運行頻率越低， 反之則越高。如果GOGC=off 則關閉GC。

```bash
# 表示當前應用佔用的內存是上次GC時佔用內存的兩倍時，觸發GC
export GOGC=100
```

## 進一步閱讀

<!-- - [Introducing the Go Race Detector](https://blog.golang.org/race-detector) -->
- [Go 大殺器之跟蹤剖析 trace](https://eddycjy.gitbook.io/golang/di-9-ke-gong-ju/go-tool-trace)
- [go runtime Environment Variables](https://pkg.go.dev/runtime#hdr-Environment_Variables)

[^1]: [Introducing the Go Race Detector](https://blog.golang.org/race-detector)
