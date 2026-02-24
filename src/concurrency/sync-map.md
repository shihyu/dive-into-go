# 併發Map - sync.Map

## 併發Map - sync.Map

### 源碼分析

**sync.Map的結構：**

```go
type Map struct {
	mu Mutex // 排他鎖，用於對dirty map操作時候加鎖處理

	read atomic.Value // read map

	// dirty map。新增key時候，只寫入dirty map中，需要使用mu
	dirty map[interface{}]*entry

	// 用來記錄從read map中讀取key時miss的次數
	misses int
}
```

sync.Map結構體中read字段是`atomic.Value`類型，底層是**readOnly結構體**：

```go
type readOnly struct {
	m       map[interface{}]*entry
	amended bool // 當amended爲true時候，表示sync.Map中的key也存在dirty map中
}
```

read map和dirty map的value類型是*entry， entry結構體定義如下：
```go
// expunged用來標記從dirty map刪除掉了
var expunged = unsafe.Pointer(new(interface{}))

type entry struct {
	// 如果p == nil 說明對應的entry已經被刪除掉了， 且m.dirty == nil

	//  如果 p == expunged 說明對應的entry已經被刪除了，但m.dirty != nil，且該entry不存在m.dirty中

	// 上述兩種情況外，entry則是合法的值並且在m.read.m[key]中存在
	// 如果m.dirty != nil，entry也會在m.dirty[key]中

	// p指針指向sync.Map中key對應的Value
	p unsafe.Pointer // *interface{}
}
```

對Map的操作可以分爲四類：
1. Add key-value 新增key-value
2. Update key-value 更新key對應的value值
3. Get Key-value 獲取Key對應的Value值
4. Delete Key 刪除key

我們來看看新增和更新操作：

```go
// Store用來新增和更新操作
func (m *Map) Store(key, value interface{}) {
	read, _ := m.read.Load().(readOnly)
	// 如果read map存在該key，且該key對應的value不是expunged時(準確的說key對應的value, value是*entry類型，entry的p字段指向不是expunged時)，
	// 則使用cas更新value，此操作是原子性的
	if e, ok := read.m[key]; ok && e.tryStore(&value) {
		return
	}

	m.mu.Lock() // 先加鎖，然後重新讀取一次read map，目的是防止dirty map升級到read map（併發Load操作時候），read map更改了。
	read, _ = m.read.Load().(readOnly)
	if e, ok := read.m[key]; ok { // 若read map存在此key，此時就是map的更新操作
		if e.unexpungeLocked() { // 將value由expunged更改成nil，
			// 若成功則表明dirty map中不存在此key，把key-value添加到dirty map中
			m.dirty[key] = e
		}
		e.storeLocked(&value) // 更改value。value是指針類型(*entry)，read map和dirty map的value都指向該值。
	} else if e, ok := m.dirty[key]; ok {// 若dirty map存在該key，則直接更改value
		e.storeLocked(&value)
	} else { // 若read map和dirty map中都不存在該key，其實就是map的新增key-value操作
		if !read.amended {// amended爲true時表示sync.Map部分key存在dirty map中
			// dirtyLocked()做兩件事情：
			// 1. 若dirty map等於nil，則初始化dirty map。
			// 2. 遍歷read map，將read map中的key-value複製到dirty map中，從read map中複製的key-value時，value是nil或expunged的(因爲nil和expunged是key刪除了的）不進行復制。
			// 同時若value值爲nil，則順便更改成expunged（用來標記dirty map不包含此key)
			
			// 思考🤔：爲啥dirtyLocked()要幹事情2，即將read map的key-value複製到dirty map中？
			m.dirtyLocked()
			// 該新增key-value將添加dirty map中，所以將read map的amended設置爲true。當amended爲true時候，從sync.Map讀取key時候，優先從read map中讀取，若read map讀取時候不到時候，會從dirty map中讀取
			m.read.Store(readOnly{m: read.m, amended: true})
		}

		// 添加key-value到dirty map中
		m.dirty[key] = newEntry(value)
	}
	// 釋放鎖
	m.mu.Unlock()
}

func (e *entry) tryStore(i *interface{}) bool {
	for {
		p := atomic.LoadPointer(&e.p)
		if p == expunged {
			return false
		}
		if atomic.CompareAndSwapPointer(&e.p, p, unsafe.Pointer(i)) {
			return true
		}
	}
}

func (e *entry) unexpungeLocked() (wasExpunged bool) {
	return atomic.CompareAndSwapPointer(&e.p, expunged, nil)
}

func (e *entry) storeLocked(i *interface{}) {
	atomic.StorePointer(&e.p, unsafe.Pointer(i))
}

func (m *Map) dirtyLocked() {
	if m.dirty != nil {
		return
	}

	read, _ := m.read.Load().(readOnly)
	m.dirty = make(map[interface{}]*entry, len(read.m))
	for k, e := range read.m {
		if !e.tryExpungeLocked() {
			m.dirty[k] = e
		}
	}
}

func (e *entry) tryExpungeLocked() (isExpunged bool) {
	p := atomic.LoadPointer(&e.p)
	for p == nil {
		if atomic.CompareAndSwapPointer(&e.p, nil, expunged) {
			return true
		}
		p = atomic.LoadPointer(&e.p)
	}
	return p == expunged
}
```

接下來看看Map的Get操作：
```go
// Load方法用來獲取key對應的value值，返回的ok表名key是否存在sync.Map中
func (m *Map) Load(key interface{}) (value interface{}, ok bool) {
	read, _ := m.read.Load().(readOnly)
	e, ok := read.m[key]
	if !ok && read.amended { // 若key不存在read map中，且dirty map包含sync.Map中key情況下
		m.mu.Lock() // 加鎖
		read, _ = m.read.Load().(readOnly) // 再次從read map讀取key
		e, ok = read.m[key]
		if !ok && read.amended {
			e, ok = m.dirty[key] // 從dirty map中讀取key
			// missLocked() 首先將misses計數加1，misses用來表明read map讀取key沒有命中的次數。
			// 若misses次數多於dirty map中元素個數時候，則將dirty map升級爲read map，dirty map設置爲nil, amended置爲false
			m.missLocked()
		}
		m.mu.Unlock()
	}
	if !ok { // read map 和 dirty map中都不存在該key
		return nil, false
	}
	// 加載value值
	return e.load()
}

func (e *entry) load() (value interface{}, ok bool) {
	p := atomic.LoadPointer(&e.p)
	if p == nil || p == expunged { // 若value值是nil或expunged，返回nil, false，表示key不存在
		return nil, false
	}
	return *(*interface{})(p), true
}

func (m *Map) missLocked() {
	m.misses++
	if m.misses < len(m.dirty) {
		return
	}
	
	// 新創建一個readOnly對象，其中amended爲false, 並將m.dirty直接賦值給該對象的m字段，
	// 這也是上面思考中的dirtyLocked爲什麼要幹事情2的原因，因爲通過2操作之後，m.dirty已包含read map中的所有key，可以直接拿來創建readOnly。
	m.read.Store(readOnly{m: m.dirty})
	m.dirty = nil
	m.misses = 0
}
```

在接着看看Map的刪除操作：

```go
// Delete用於刪除key
func (m *Map) Delete(key interface{}) {
	read, _ := m.read.Load().(readOnly)
	e, ok := read.m[key]
	if !ok && read.amended {
		m.mu.Lock()
		read, _ = m.read.Load().(readOnly)
		e, ok = read.m[key]
		// 若read map不存在該key，但dirty map中存在該key。則直接調用delete，刪除dirty map中該key
		if !ok && read.amended {
			delete(m.dirty, key)
		}
		m.mu.Unlock()
	}
	if ok {
		e.delete()
	}
}

func (e *entry) delete() (hadValue bool) {
	for {
		p := atomic.LoadPointer(&e.p)
		if p == nil || p == expunged { // 若entry中p已經是nil或者expunged則直接返回
			return false
		}
		if atomic.CompareAndSwapPointer(&e.p, p, nil) { // 將entry中的p設置爲nil
			return true
		}
	}
}
```

sync.Map還提供遍歷key-value功能：
```go
// Range方法接受一個迭代回調函數，用來處理遍歷的key和value
func (m *Map) Range(f func(key, value interface{}) bool) {
	read, _ := m.read.Load().(readOnly)
	if read.amended { // 若dirty map中包含sync.Map中key時候
		m.mu.Lock()
		read, _ = m.read.Load().(readOnly)
		if read.amended {// 加鎖之後，再次判斷，是爲了防止併發調用Load方法時候，dirty map升級爲read map時候，amended爲false情況
			// read.amended爲true的時候，m.dirty包含sync.Map中所有的key
			read = readOnly{m: m.dirty}
			m.read.Store(read)
			m.dirty = nil
			m.misses = 0
		}
		m.mu.Unlock()
	}

	for k, e := range read.m {
		v, ok := e.load()
		if !ok {
			continue
		}
		if !f(k, v) { //執行迭代回調函數，當返回false時候，停止迭代
			break
		}
	}
}
```

### 爲什麼不使用sync.Mutex+map實現併發的map呢？

這個問題可以換個問法就是sync.Map相比sync.Mutex+map實現併發map有哪些優勢？

sync.Map優勢在於當key存在read map時候，如果進行Store操作，可以使用原子性操作更新，而sync.Mutex+map形式每次寫操作都要加鎖，這個成本更高。

另外併發讀寫兩個不同的key時候，寫操作需要加鎖，而讀操作是不需要加鎖的。

### 讀少寫多情況下併發map，應該怎麼設計？

這種情況下，可以使用分片鎖，跟據key進行hash處理後，找到其對應讀寫鎖，然後進行鎖定處理。通過分片鎖機制，可以降低鎖的粒度來實現讀少寫多情況下高併發。可以參見[orcaman/concurrent-map](https://github.com/orcaman/concurrent-map)實現。

### 總結

- sync.Map是不能值傳遞（狹義的）的
- sync.Map採用空間換時間策略。其底層結構存在兩個map，分別是read map和dirty map。當讀取操作時候，優先從read map中讀取，是不需要加鎖的，若key不存在read map中時候，再從dirty map中讀取，這個過程是加鎖的。當新增key操作時候，只會將新增key添加到dirty map中，此操作是加鎖的，但不會影響read map的讀操作。當更新key操作時候，如果key已存在read map中時候，只需無鎖更新更新read map就行，負責加鎖處理在dirty map中情況了。總之sync.Map會優先從read map中讀取、更新、刪除，因爲對read map的讀取不需要鎖
- 當sync.Map讀取key操作時候，若從read map中一直未讀到，若dirty map中存在read map中不存在的keys時，則會把dirty map升級爲read map，這個過程是加鎖的。這樣下次讀取時候只需要考慮從read map讀取，且讀取過程是無鎖的
- 延遲刪除機制，刪除一個鍵值時只是打上刪除標記，只有在提升dirty map爲read map的時候才清理刪除的數據
- sync.Map中的dirty map要麼是nil，要麼包含read map中所有未刪除的key-value。
- sync.Map適用於讀多寫少場景。根據[包官方文檔介紹](https://golang.org/pkg/sync/#Map)，它特別適合這兩個場景：1. 一個key只寫入一次但讀取多次時，比如在只會增長的緩存中；2. 當多個goroutine讀取、寫入和更新不相交的鍵值對時。
