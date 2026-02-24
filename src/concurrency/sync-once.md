# 一次性操作 - sync.Once

sync.Once用來完成一次性操作，比如配置加載，單例對象初始化等。

## 源碼分析

sync.Once定義如下：

```go
type Once struct {
	done uint32 // 用來標誌操作是否操作
	m    Mutex // 鎖，用來第一操作時候，加鎖處理
}
```

接下來看剩下的全部代碼：

```go
func (o *Once) Do(f func()) {
	if atomic.LoadUint32(&o.done) == 0 {// 原子性加載o.done，若值爲1，說明已完成操作，若爲0，說明未完成操作
		o.doSlow(f)
	}
}

func (o *Once) doSlow(f func()) {
	o.m.Lock() // 加鎖
	defer o.m.Unlock()
	if o.done == 0 { // 再次進行o.done是否等於0判斷，因爲存在併發調用doSlow的情況
		defer atomic.StoreUint32(&o.done, 1) // 將o.done值設置爲1，用來標誌操作完成
		f() // 執行操作
	}
}
```
