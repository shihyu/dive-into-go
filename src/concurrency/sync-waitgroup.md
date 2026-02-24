# 等待組 - sync.WaitGroup

## 源碼分析

```go
type WaitGroup struct {
    noCopy noCopy // waitgroup是不能夠拷貝複製的，是通過go vet來檢測實現
    
	/* 
	waitgroup使用一個int64來計數：高32位，用來add計數，低32位用來記錄waiter數量。
	若要原子性更新int64就必須保證該int64對齊係數是8，即64位對齊。
	對於64位系統，直接使用一個int64類型字段就能保證原子性要求，但對32位系統就不行了。

	所以實現的時候並沒有直接一個int64， 而是使用[3]int32數組，若[0]int32地址恰好是8對齊的，那就waitgroup int64 = [0]int32 + [1]int32，
	否則一定是4對齊的， 故[0]int32不用，恰好錯開了4字節，此時[1]int32一定是8對齊的。此時waitgroup int64 = [1]int32 + [2]int32
	通過這個技巧恰好滿足32位和64位系統下int64都能原子性操作
	*/
	state1 [3]uint32 // waitgroup對齊係數是4
}

func (wg *WaitGroup) state() (statep *uint64, semap *uint32) {
	// 當state1是8對齊的，則返回低8字節(statep)用來計數，即state1[0]是add計數，state1[1]是waiter計數
	if uintptr(unsafe.Pointer(&wg.state1))%8 == 0 {
		return (*uint64)(unsafe.Pointer(&wg.state1)), &wg.state1[2]
	} else {
		// 反之，則返回高8字節用來計數，即state1[1]是add計數，state1[2]是waiter計數
		return (*uint64)(unsafe.Pointer(&wg.state1[1])), &wg.state1[0]
	}
}

// Add方法用來更新add計數器。即將原來計數值加上delta，delta可以爲負值
// waitgroup的Done方法本質上就是Add(-1)
// Add更新之後的計數器值不能小於0。當計數器值等於0時候，會釋放信號，所有調用Wait方法而阻塞的Goroutine不再阻塞（釋放的信號量=waiter計數）
func (wg *WaitGroup) Add(delta int) {
	statep, semap := wg.state()
	if race.Enabled { // 競態檢查，忽略不看
		_ = *statep // trigger nil deref early
		if delta < 0 {
			// Synchronize decrements with Wait.
			race.ReleaseMerge(unsafe.Pointer(wg))
		}
		race.Disable()
		defer race.Enable()
	}
	state := atomic.AddUint64(statep, uint64(delta)<<32) // delta左移32位，然後原子性更新statep值並返回更新後的statep值
	v := int32(state >> 32) // state高位的4字節是add計數，賦值給v
	w := uint32(state) // state低位的4字節是waiter計數，賦值給w
	
	if v < 0 { // add計數不能爲負值。
		panic("sync: negative WaitGroup counter")
    }
    
	// Add方法與Wait方法不能併發調用
	if w != 0 && delta > 0 && v == int32(delta) {
		panic("sync: WaitGroup misuse: Add called concurrently with Wait")
	}
	if v > 0 || w == 0 { // add計數大於0，或者waiter計數等於0，直接返回不執行後面邏輯。
		return
    }
    
	// statep指向state1字段，其指向的值和state進行比較，如果不一樣，說明存在併發調用了Add和Wait方法
	// 此時v = 0, w > 0，這個時候waitgroup的add計數和waiter計數不能再更改了。
	// *statep != state情況舉例：假定當前groutine是g1，執行到此處時, 
	// 恰好另外一個groutine g2併發調用了Wait方法，
	// 那麼waitgroup的state1字段會更新，而g1中w的值還是g2調用Wait方法之前的waiter數，
	// 這會導致總有一個g永遠得不到釋放信號，從而造成g泄漏。所以此處要進行panic判斷
	if *statep != state {
		panic("sync: WaitGroup misuse: Add called concurrently with Wait")
    }
    
	*statep = 0 // 重置計數器爲0
	for ; w != 0; w-- { // 有w個waiter，則釋放出w個信號
		runtime_Semrelease(semap, false, 0)
	}
}

// Done() == Add(-1)
func (wg *WaitGroup) Done() {
	wg.Add(-1)
}

// Wait會阻塞當前goroutine，直到add計數器值爲0
func (wg *WaitGroup) Wait() {
	statep, semap := wg.state()
	for {
		state := atomic.LoadUint64(statep)
		v := int32(state >> 32)
		w := uint32(state)
		// 使用for + cas進制，原子性更新waiter計數
		if atomic.CompareAndSwapUint64(statep, state, state+1) {
			// 更新成功後，開始獲取信號，未獲取到信號的話則當前g一直阻塞
			runtime_Semacquire(semap)
			if *statep != 0 {
				panic("sync: WaitGroup is reused before previous Wait has returned")
			}
			return
		}
	}
}
```

### 總結

- waitgroup是不能值傳遞的
- Add方法的傳值可以是負數，但加上該傳值之後的waitgroup計數器值不能是負值
- Done方法實際上調用的是Add(-1)
- Add方法和Wait方法不能併發調用
- Wait方法可以多次調用，調用此方法的goroutine會阻塞，一直阻塞到waitgroup計數器值變爲0。
