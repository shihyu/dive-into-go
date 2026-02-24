# 內存模型

Go語言中的內存模型規定了多個goroutine讀取變量時候，變量的可見性情況。注意本章節的內存模型並不是內存對象分配、管理、回收的模型，準確的說這裏面的內存模型是內存一致性模型。

## Happens Before原則

Happens Before原則的定義是如果一個操作e1先於操作e2發生，那麼我們就說e1 `happens before` e2，也可以描述成e2 `happens after` e2，此時e1操作的變量結果對e2都是可見的。如果e1操作既不先於e2發生又不晚於e2發生，我們說e1操作與e2操作併發發生。

Happens Before具有傳導性：如果操作e1 `happens before` 操作e2，e3 `happends before` e1，那麼e3一定也 `happends before` e2。

由於存在指令重排和多核CPU併發訪問情況，我們代碼中變量順序和實際方法順序並不總是一致的。考慮下面一種情況：

```go
a := 1
b := 2
c := a + 1
```

上面代碼中是先給變量a賦值，然後給變量b賦值，最後給編程c賦值。但是在底層實現指令時候，可能發生指令重排：變量b賦值在前，變量a賦值在後，最後變量c賦值。對於依賴於a變量的c變量的賦值，不管怎樣指令重排，Go語言都會保證變量a賦值操作 `happends before` c變量賦值操作。

上面代碼運行是運行在同一goroutine中，Go語言時能夠保證`happends before`原則的，實現正確的變量可見性。但對於多個goroutine共享數據時候，Go語言是無法保證`Happens Before`原則的，這時候就需要我們採用鎖、通道等同步手段來保證數據一致性。考慮下面場景：

```go
 var a, b int 

 // goroutine A
 go func() {
     a = 1
     b = 2
 }()

 // goroutine B
 go func() {
     if b == 2 {
        print(a)
     }
 }()
```

當執行goroutine B打印變量a時並不一定打印出來1，有可能打印出來的是0。這是因爲goroutine A中可能存在指令重排，先將b變量賦值2，若這時候接着執行goroutine B那麼就會打印出來0

## Go語言中保證的 happens-before 場景

Go語言提供了某些場景下面的`happens-before`原則保證。詳細內容可以閱讀文章末尾進一步閱讀中提供的Go官方資料。

### 初始化

當進行包初始化或程序初始化時候，會保證下面的`happens-before`:

- 如果包p導入了包q，則q的init函數的`happens before`在任何p的開始之前。
- 所有init函數happens before 入口函數main.main

### goroutine

與goroutine有關的`happens-before`保證場景有：

- goroutine的創建`happens before`其執行
- goroutine的完成不保證`happens-before`任何代碼

對於第一條場景，考慮下面代碼：

```go
var a string

func f() {
	print(a) // 3
}

func hello() {
	a = "hello, world" // 1
	go f() // 2
}
```

根據goroutine的創建`happens before`其執行，我們知道操作2 `happens before` 操作3。又因爲在同一goroutine中，先書寫的代碼一定會`happens before`後面代碼（注意：即使發生了執行重排，其並不會影響`happends before`），操作1 `happends before` 操作3，那麼操作1 `happends before` 操作3，所以最終一定會打印出`hello, world`，不可能出現打印空字符串情況。

注意goroutine f()的執行完成，並不能保證hello()返回之前，其有可能是在hello返回之後執行完成。

對於第二條場景，考慮下面代碼：

```go
var a string

func hello() {
	go func() { a = "hello" }() // 1
	print(a) // 2
}
```
由於goroutine的完成不保證`happens-before`任何代碼，那麼操作1和操作2無法確定誰先執行，誰後執行，那麼最終可能打印出`hello`，也有可能打印出空字符串。

### 通道通信

- 對於緩衝通道，向通道發送數據`happens-before`從通道接收到數據

```go
var c = make(chan int, 10)
var a string

func f() {
	a = "hello, world" // 4
	c <- 0 // 5
}

func main() {
	go f() // 1
	<-c // 2
	print(a) // 3
}
```

c是一個緩存通道，操作5 `happens before` 操作2，所以最終會打印`hello, world`

- 對於無緩衝通道，從通道接收數據`happens-before`向通道發送數據

```go
var c = make(chan int)
var a string

func f() {
	a = "hello, world" // 4
	<-c // 5
}

func main() {
	go f() // 1
	c <- 0 // 2
	print(a) // 3
}
```

c是無緩存通道，操作5 `happens before` 操作2，所以最終會打印`hello, world`。

對於上面通道的兩種`happens before`場景下打印數據結果，我們都可以通過通道特性得出相關結果。

### 鎖

- 對於任意的`sync.Mutex`或者`sync.RWMutex`，n次Unlock()調用`happens before` m次Lock()調用，其中n<m

```go
var l sync.Mutex
var a string

func f() {
	a = "hello, world"
	l.Unlock() // 2
}

func main() {
	l.Lock() // 1
	go f()
	l.Lock() // 3
	print(a)
}
```

操作2 `happends before` 操作3，所以最終一定會打印出來hello,world。

對於這種情況，我們可以從鎖的機制方面理解，操作3一定會阻塞到操作爲2完成釋放鎖，那麼最終一定會打印`hello, world`。

## 進一步閱讀

- [The Go Memory Model](https://golang.org/ref/mem)
