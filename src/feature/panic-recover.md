# 恐慌與恢復 - panic/recover

我們知道Go語言中許多錯誤會在編譯時暴露出來，直接編譯不通過，但對於空指針訪問元素，切片/數組越界訪問之類的運行時錯誤，只會在運行時引發 `panic` 異常暴露出來。這種由Go語言自動的觸發的 `panic` 異常屬於**運行時panic(Run-time panics)**[^1]。當發生 `panic` 時候，Go會運行所有已經註冊的延遲函數，若延遲函數中未進行panic異常捕獲處理，那麼最終Go進程會終止，並打印堆棧信息。此外Go中還內置了 `panic` 函數，可以用於用戶手動觸發`panic`。

Go語言中內置的 `recover` 函數可以用來捕獲 `panic`異常，但 `recover` 函數只能放在延遲函數調用中，才能起作用。我們從之前的章節《**[基礎篇-語言特性-defer函數](defer.md)** 》瞭解到，多個延遲函數，會組成一個鏈表。Go在發生panic過程中，會依次遍歷該鏈表，並檢查鏈表中的延遲函數是否調用了 `recover` 函數調用，若調用了則 `panic` 異常會被捕獲而不會繼續向上拋出，否則會繼續向上拋出異常和執行延遲函數，直到該 `panic` 沒有被捕獲，進程異常終止，這個過程叫做**panicking**。我們需要知道的是**即使panic被延遲函數鏈表中某個延遲函數捕獲處理了，但其他的延遲函數還是會繼續執行的，只是panic異常不在繼續拋出**。

接下來我們來將深入瞭解下panic和recover底層的實現機制。在開始之前，我們來看下下面的測試題。

## 測試題：下面哪些panic異常將會捕獲？

**case 1:**
```go
func main() {
    recover()
    panic("it is panic") // not recover
}
```

**case 2:**
```go
func main() {
    defer func() {
        recover()
    }()

    panic("it is panic") // recover
}
```

**case 3:**
```go
func main() {
	defer recover()
	panic("it is panic") // not recover
}
```

**case 4:**
```go
func main() {
    defer func() {
        defer recover()
    }()

    panic("it is panic") // recover
}
```

**case 5:**
```go
func main() {
	defer func() {
		defer func() {
			recover()
		}()
	}()

	panic("it is panic") // not recover
}
```

**case 6:**
```go
func main() {
	defer doRecover()
	panic("it is panic") // recover
}

func doRecover() {
	recover()
	fmt.Println("hello")
}
```

**case 7:**
```go
func main() {
	defer doRecover()
	panic("it is panic") // recover
}

func doRecover() {
	defer recover()
}
```

簡單說明下上面幾個案例運行結果：

- `case 1`中recover函數調用不是在defer延遲函數裏面，肯定不會捕獲panic異常。
- `case 2`中是panic異常捕獲的標準操作，是可以捕獲panic異常的，`case 6`跟`case 2`是一樣的，只不過一個是匿名延遲函數，一個是具名延遲函數，同樣可以捕獲panic異常。
- `case 3`中recover函數作爲延遲函數，沒有在其他延遲函數中調用，它也是不起作用的。
- `case 4`中recover函數被一個延遲函數調用，且recover函數本身作爲一個延遲函數，這個情況下也是可以正常捕獲panic異常的，`case 7`跟`case 4`是一樣的，只不過一個是匿名延遲函數，一個是具名延遲函數，同樣可以捕獲panic異常。
- `case 5`中儘管recover函數被延遲函數調用，但它卻無法捕獲panic異常。

從上面案例中可以看出來，使用recover函數進行panic異常捕獲，也要使用正確才能起作用。下面會分析源碼，探討panic-recover實現機制，也能更好幫助你理解爲什麼`case 2`,`case 4`可以起作用，而`case 3`和`case 5`爲啥沒有起作用。

## 源碼分析

我們先分析`case 2`案例，我們可以通過`go tool compile -N -l -S case2.go`獲取[彙編代碼](https://go.godbolt.org/z/713T1TvoG)，來查看panic和recover在底層真正的實現：

```shell
main_pc0:
	TEXT    "".main(SB), ABIInternal, $104-0
	MOVQ    (TLS), CX
	CMPQ    SP, 16(CX)
	JLS     main_pc113
	SUBQ    $104, SP
	MOVQ    BP, 96(SP)
	LEAQ    96(SP), BP
	MOVL    $0, ""..autotmp_1+16(SP)
	LEAQ    "".main.func1·f(SB), AX
	MOVQ    AX, ""..autotmp_1+40(SP)
	LEAQ    ""..autotmp_1+16(SP), AX
	MOVQ    AX, (SP)
	CALL    runtime.deferprocStack(SB)
	TESTL   AX, AX
	JNE     main_pc97
	JMP     main_pc69
main_pc69:
	LEAQ    type.string(SB), AX
	MOVQ    AX, (SP)
	LEAQ    ""..stmp_0(SB), AX
	MOVQ    AX, 8(SP)
	CALL    runtime.gopanic(SB)
main_pc97:
	XCHGL   AX, AX
	CALL    runtime.deferreturn(SB)
	MOVQ    96(SP), BP
	ADDQ    $104, SP
	RET
main_pc113:
	NOP
	CALL    runtime.morestack_noctxt(SB)
	JMP     main_pc0
main_func1_pc0:
	TEXT    "".main.func1(SB), ABIInternal, $32-0
	MOVQ    (TLS), CX
	CMPQ    SP, 16(CX)
	JLS     main_func1_pc53
	SUBQ    $32, SP
	MOVQ    BP, 24(SP)
	LEAQ    24(SP), BP
	LEAQ    ""..fp+40(SP), AX
	MOVQ    AX, (SP)
	CALL    runtime.gorecover(SB)
	MOVQ    24(SP), BP
	ADDQ    $32, SP
	RET
main_func1_pc53:
	NOP
	CALL    runtime.morestack_noctxt(SB)
	JMP     main_func1_pc0
```

從上面彙編代碼中，可以看出 `panic` 函數底層實現 `runtime.gopanic`，`recover` 函數底層實現是 `runtime.gorecover`。

panic函數底層實現的 `runtime.gopanic` 源碼如下：

```go
func gopanic(e interface{}) {
	gp := getg()
	
	... // 一些判斷當前g是否允許在用戶棧，是否正在內存分配的代碼，略
	
	var p _panic // panic底層數據結構是_panic
	p.arg = e // e是panic函數的參數，對應case2中的: it is panic
	p.link = gp._panic
	gp._panic = (*_panic)(noescape(unsafe.Pointer(&p))) // 將當前panic掛到g上面

	atomic.Xadd(&runningPanicDefers, 1) // 記錄正在執行panic的goroutine數量，防止main groutine返回時候，
	// 其他goroutine的panic棧信息未打印出來。@see https://github.com/golang/go/blob/go1.14.13/src/runtime/proc.go#L208-L220

	
	// 對於open-coded defer實現的延遲函數，需要掃描FUNCDATA_OpenCodedDeferInfo信息，
	// 獲取延遲函數的sp/pc信息，並創建_defer結構，將其插入gp._defer鏈表中
	// 這是也是在defer函數章節中，提到的爲啥open-coded defer提升了延遲函數的性能，而panic性能卻降低的原因
	addOneOpenDeferFrame(gp, getcallerpc(), unsafe.Pointer(getcallersp()))

	for { // 開始遍歷defer鏈表
		d := gp._defer
		if d == nil {
			break
		}

	
		// 當延遲函數裏面再次拋出panic或者調用runtime.Goexit時候，
		// 會再次進入同一個延遲函數，此時d.started已經設置爲true狀態
		if d.started {
			if d._panic != nil { // 標記上一個_panic狀態爲aborted
				d._panic.aborted = true
			}
			d._panic = nil
			if !d.openDefer {
				// 對於非open-coded defer函數，我們需要將_defer從gp._defer鏈表中溢出去，防止繼續重複執行
				d.fn = nil
				gp._defer = d.link
				freedefer(d)
				continue
			}
		}

	
		// 標記當前defer開始執行，這樣當g棧增長時候或者垃圾回收時候，可以更新defer的參數棧幀
		d.started = true

		// 記錄當前的_panic信息到_defer結構中，這樣當該defer函數再次發生panic時候，可以標記d._panic爲aborted狀態
		d._panic = (*_panic)(noescape(unsafe.Pointer(&p)))

		done := true
		if d.openDefer { // 如果該延遲函數是open-coded defer函數
			done = runOpenDeferFrame(gp, d) // 運行open-coded defer函數，如果當前棧下面沒有其他延遲函數，則返回true
			if done && !d._panic.recovered { // 如果當前棧下面沒有其他open-coded defer函數了，且panic也未recover，
			// 那麼繼續當前的open-coded defer函數的sp作爲基址，繼續掃描funcdata，獲取open-coded defer函數。
			// 之所以這麼做是因爲open-coded defer裏面也存在defer函數的情況，例如case4
				addOneOpenDeferFrame(gp, 0, nil)
			}
		} else {// 非open-coded defer實現的defer函數

			// getargp返回其caller的保存callee參數的地址。
			// 之前介紹過了Go語言中函數調用約定，callee的參數存儲，是由caller的棧空間提供。
			p.argp = unsafe.Pointer(getargp(0)) // 這裏面p.argp保存的gopanic函數作爲caller時候，保存callee參數的地址。
			// 之所以要_panic.argp保存gopanic的callee參數地址，
			// 這是因爲調用gorecover會通過此檢查其caller的caller是不是gopanic。
			// 這也是case5等不能捕獲panic異常的原因。

			// 調用defer函數
			reflectcall(nil, unsafe.Pointer(d.fn), deferArgs(d), uint32(d.siz), uint32(d.siz))
		}
		p.argp = nil

		// reflectcall did not panic. Remove d.
		if gp._defer != d {
			throw("bad defer entry in panic")
		}
		d._panic = nil

		pc := d.pc
		sp := unsafe.Pointer(d.sp)
		if done { // 從gp._defer鏈表清除掉當前defer函數
			d.fn = nil
			gp._defer = d.link
			freedefer(d)
		}
		if p.recovered {
			gp._panic = p.link
			if gp._panic != nil && gp._panic.goexit && gp._panic.aborted {
				// A normal recover would bypass/abort the Goexit.  Instead,
				// we return to the processing loop of the Goexit.
				gp.sigcode0 = uintptr(gp._panic.sp)
				gp.sigcode1 = uintptr(gp._panic.pc)
				mcall(recovery)
				throw("bypassed recovery failed") // mcall should not return
			}
			atomic.Xadd(&runningPanicDefers, -1)

			if done { // panic已經被recover處理掉了，那麼移除掉上面通過addOneOpenDeferFrame添加到gp._defer中的open-coded defer函數。
			// 因爲這些open-coded defer是通過inline方式執行的，從gp._defer鏈表中移除掉，不影響它們繼續的執行
				d := gp._defer
				var prev *_defer
				for d != nil {
					if d.openDefer {
						if d.started {
							break
						}
						if prev == nil {
							gp._defer = d.link
						} else {
							prev.link = d.link
						}
						newd := d.link
						freedefer(d)
						d = newd
					} else {
						prev = d
						d = d.link
					}
				}
			}

			gp._panic = p.link // 無用代碼，上面已經操作過了
			// Aborted panics are marked but remain on the g.panic list.
			// Remove them from the list.
			for gp._panic != nil && gp._panic.aborted {
				gp._panic = gp._panic.link
			}
			if gp._panic == nil { // must be done with signal
				gp.sig = 0
			}
			// Pass information about recovering frame to recovery.
			gp.sigcode0 = uintptr(sp)
			gp.sigcode1 = pc
			mcall(recovery)
			throw("recovery failed") // mcall should not return
		}
	}

	preprintpanics(gp._panic)

	fatalpanic(gp._panic) // should not return
	*(*int)(nil) = 0      // not reached
}
```

對於基於open-coded defer方式實現的延遲函數中處理panic recover邏輯，比如addOneOpenDeferFrame，runOpenDeferFrame等函數，這裏不再深究。這裏主要分析通過鏈表實現的延遲函數中處理panic recover邏輯。

接下來我們看下recover函數底層實現`runtime.gorecover`源碼

```go
func gorecover(argp uintptr) interface{} {
	gp := getg()
	p := gp._panic
	if p != nil && !p.goexit && !p.recovered && argp == uintptr(p.argp) {
		p.recovered = true
		return p.arg
	}
	return nil
}
```

[^1]:[Go官方語法指南：運行時恐慌](https://go.dev/ref/spec#Run_time_panics)
