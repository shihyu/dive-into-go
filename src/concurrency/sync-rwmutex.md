# 讀寫鎖 - sync.RWMutex

RWMutex是Go語言中內置的一個reader/writer鎖，用來解決讀者-寫者問題（Readers–writers problem）。在任意一時刻，一個RWMutex只能由任意數量的reader持有，或者只能由一個writer持有。

## 讀者-寫者問題

讀者-寫者問題（Readers–writers problem）描述了計算機併發處理讀寫數據遇到的問題，如何保證數據完整性、一致性。解決讀者-寫者問題需保證對於一份資源操作滿足以下下條件：

- 讀寫互斥
- 寫寫互斥
- 允許多個讀者同時讀取

解決讀者-寫者問題，可以採用`讀者優先（readers-preference）`方案或者`寫者優先（writers-preference）`方案。

- **讀者優先（readers-preference）**：讀者優先是讀操作優先於寫操作，即使寫操作提出申請資源，但只要還有讀者在讀取操作，就還允許其他讀者繼續讀取操作，直到所有讀者結束讀取，纔開始寫。讀優先可以提供很高的併發處理性能，但是在頻繁讀取的系統中，會長時間寫阻塞，導致寫飢餓。

- **寫者優先（writers-preference）**：寫者優先是寫操作優先於讀操作，如果有寫者提出申請資源，在申請之前已經開始讀取操作的可以繼續執行讀取，但是如果再有讀者申請讀取操作，則不能夠讀取，只有在所有的寫者寫完之後纔可以讀取。寫者優先解決了讀者優先造成寫飢餓的問題。但是若在頻繁寫入的系統中，會長時間讀阻塞，導致讀飢餓。

RWMutex設計採用寫者優先方法，保證寫操作優先處理。

## 源碼分析

下面分析的源碼進行精簡處理，去掉了race檢查功能的代碼。

### RWMutex的定義

```go
type RWMutex struct {
	w           Mutex  // 互斥鎖
	writerSem   uint32 // writers信號量
	readerSem   uint32 // readers信號量
	readerCount int32  // reader數量
	readerWait  int32  // writer申請鎖時候，已經申請到鎖的reader的數量
}

const rwmutexMaxReaders = 1 << 30 // 最大reader數，用於反轉readerCount
```
### RLock/RUnlock的實現

```go
func (rw *RWMutex) RLock() {
	if atomic.AddInt32(&rw.readerCount, 1) < 0 { // 如果rw.readerCount爲負數，說明此時已有一個writer持有鎖或者正在申請鎖。
		runtime_SemacquireMutex(&rw.readerSem, false, 0) // 此時reader休眠阻塞在readerSem信號上，等待喚醒
	}
}

func (rw *RWMutex) RUnlock() {
	if r := atomic.AddInt32(&rw.readerCount, -1); r < 0 { // r小於0說明此時有等待請求鎖的writer
		rw.rUnlockSlow(r)
	}
}

func (rw *RWMutex) rUnlockSlow(r int32) {
	if r+1 == 0 || r+1 == -rwmutexMaxReaders { // RLock之前已經進行了RUnlock操作
		throw("sync: RUnlock of unlocked RWMutex")
	}

	if atomic.AddInt32(&rw.readerWait, -1) == 0 { // 此時是最後一個獲取到鎖的reader進行RUnlock操作，那麼釋放writerSem信號，喚醒等待的writer來獲取鎖。
		runtime_Semrelease(&rw.writerSem, false, 1)
	}
}
```

### Lock/Unlock的實現

```go
func (rw *RWMutex) Lock() {
	rw.w.Lock() // 加互斥鎖，阻塞其他writer進行Lock操作，保證寫-寫互斥。

	// 將rw.readerCount 更改爲rw.readerCount - rwmutexMaxReaders，
	// 此時rw.readerCount由一個正數轉變成一個負數，這種方式既能保持記錄reader數量，又能表明有writer正在請求鎖
	r := atomic.AddInt32(&rw.readerCount, -rwmutexMaxReaders) + rwmutexMaxReaders

	if r != 0 && atomic.AddInt32(&rw.readerWait, r) != 0 { // r!=0表明此時有reader持有鎖，則當前writer只能阻塞等待，但爲了保證寫優先，需要readerWait記錄當前已獲取到鎖的讀者數量
		runtime_SemacquireMutex(&rw.writerSem, false, 0)
	}
}

func (rw *RWMutex) Unlock() {
	r := atomic.AddInt32(&rw.readerCount, rwmutexMaxReaders)
	if r >= rwmutexMaxReaders { // Lock之前先進行了Unlock操作
		throw("sync: Unlock of unlocked RWMutex")
	}

	for i := 0; i < int(r); i++ { // 釋放信號，喚醒阻塞的reader們
		runtime_Semrelease(&rw.readerSem, false, 0)
	}
	rw.w.Unlock() // 是否互鎖鎖，允許其他writer進行獲取鎖操作了
}
```

對於`讀者優先（readers-preference）`的讀寫鎖，只需要一個`readerCount`記錄所有讀者，就可以輕易實現。Go中的RWMutex實現的是`寫者優先（writers-preference）`的讀寫鎖，那就需要用到`readerWait`來記錄寫者申請鎖時候，已經獲取到鎖的讀者數量。

這樣當後續有其他讀者繼續申請鎖時候，可以讀取`readerWait`是否大於0，大於0則說明有寫者已經申請鎖了，按照`寫者優先（writers-preference）`原則，該讀者需要排到寫者之後，但是我們還需要記錄這些排在寫者後面讀者的數量呀，畢竟寫着將來釋放鎖的時候，還得喚醒一個個這些讀者。這種情況下既要讀取`readerWait`，又要更新排隊的讀者數量，這是兩個操作，無法原子化。RWMutex在實現時候，通過將readerCount轉換成負數，一方面表明有寫者申請了鎖，另一方面readerCount還可以繼續記錄排隊的讀者數量，解決剛描述的無法原子化的問題，真是巧妙！

對於`讀者優先（readers-preference）`的讀寫鎖，我們可以藉助Mutex實現。示例代碼如下：

```go
type rwlock struct {
	reader_cnt  int
	reader_lock sync.Mutex
	writer_lock sync.Mutex
}

func NewRWLock() *rwlock {
	return &rwlock{}
}

func (l *rwlock) RLock() {
	l.reader_lock.Lock()
	defer l.reader_lock.Unlock()
	l.reader_cnt++
	if l.reader_cnt == 1 { // first reader
		l.writer_lock.Lock()
	}
}

func (l *rwlock) RUnlock() {
	l.reader_lock.Lock()
	defer l.reader_lock.Unlock()
	l.reader_cnt--
	if l.reader_cnt == 0 { // latest reader
		l.writer_lock.Unlock()
	}
}

func (l *rwlock) Lock() {
	l.writer_lock.Lock()
}

func (l *rwlock) Unlock() {
	l.writer_lock.Unlock()
}
```

上面示例代碼中，儘管讀者操作的實現上用到互斥鎖，但由於它是用完立馬就是釋放掉，性能不會差太多。

## 三大錯誤使用場景

### RLock/RUnlock、Lock/Unlock未成對出現

同互斥鎖一樣，sync.RWMutex的RLock/RUnlock，以及Lock/Unlock總是成對出現的。Lock或RLock多餘調用會導致鎖沒有釋放，可能出現死鎖，Unlock或RUnlock多餘的調用會大導致panic.

```go
func main() {
	var l sync.RWMutex
	l.Lock()
	l.Unlock()
	l.Unlock() // fatal error: sync: Unlock of unlocked RWMutex
}
```

對於Lock/Unlock未成對出現所有可能情況如下：

- 如果只有Lock情況

	如果有一個 goroutine 只執行 Lock 操作而不執行 Unlock 操作，那麼其他的 goroutine 就會一直被阻塞（拿不到鎖），隨着越來越多的阻塞的 goroutine 越來越多，整個系統最終會崩潰。

- 如果只有Unlock情況

	- 如果其他 goroutine 持有鎖，鎖將被釋放。
	- 如果鎖處於空閒狀態（unoccupied state），它會panic。

### 複製sync.RWMutex作爲函數值傳遞

同Mutex一樣，RWMutex也是不能複製使用的，考慮下面場景代碼：

```go
func main() {
	var l sync.RWMutex
	l.Lock()
	foo(l)
	l.Lock()
	l.Unlock()
}

func foo(l sync.RWMutex) {
	l.Unlock()
}
```

上面場景代碼中本意先使用l.Lock()進行上鎖操作，然後調用foo(l)釋放該鎖，最後再次上鎖和釋放鎖。但這種操作是錯誤的，會導致死鎖。foo()函數接收的參數是變量l的一個副本，該副本把之前l變量的鎖狀態（鎖狀態指的是writerSem，readerCount等字段信息）也複製了一遍，此時副本的鎖狀態是上鎖狀態的，所以foo函數中是可以進行釋放鎖操作的，但釋放的並不是最開始的那個鎖。

我們可以使用`go vet`命令檢測複製鎖情況：

```bash
vagrant@vagrant:~$ go vet main.go
# command-line-arguments
./main.go:8:6: call of foo copies lock value: sync.RWMutex
./main.go:13:12: foo passes lock by value: sync.RWMutex
```

解決上面問題可以使用指針傳遞:

```go
func foo(l *sync.RWMutex) {
	l.Unlock()
}
```

### 不可重入導致死鎖

可重入鎖(ReentrantLock)指的一個線程中可以多次獲取同一把鎖，換到Go語言場景就是一個Goroutine中，Mutex和RWMutex可以連續Lock操作，而不會導致死鎖。同互斥體Mutex一樣，RWMutex也是不可重入鎖，不支持重入。

```go
func main() {
	var l sync.RWMutex
	l.Lock()
	foo(&l) // foo中嘗試重入鎖，會導致死鎖
	l.Unlock()
}

func foo(l *sync.RWMutex) {
	l.Lock()
	l.Unlock()
}
```

下面是讀鎖和寫鎖重入時候導致的死鎖：

```go
func main() {
	var l sync.RWMutex
	l.RLock()
	foo(&l)
	l.RUnlock()
}

func foo(l *sync.RWMutex) {
	l.Lock()
	l.Unlock()
}
```
上面代碼中寫鎖重入時候，需要讀鎖先釋放，而讀鎖釋放又依賴寫鎖，這樣就形成了死循環，導致死鎖。

## 進一步閱讀

- [Readers–writers problem](https://en.wikipedia.org/wiki/Readers%E2%80%93writers_problem)
- [sync.RWMutex: Solving readers-writers problems](https://medium.com/golangspec/sync-rwmutex-ca6c6c3208a0)
- [Use sync.Mutex, sync.RWMutex to lock share data for race condition](https://cloudolife.com/2020/04/18/Programming-Language/Golang-Go/Synchronization/Use-sync-Mutex-sync-RWMutex-to-lock-share-data-for-race-condition/)
