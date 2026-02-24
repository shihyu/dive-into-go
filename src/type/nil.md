# nil

在探究 `nil` 之前，我們先看看零值的概念。

## 零值

**零值(zero value)**[^1] 指的是當聲明變量且未顯示初始化時，Go語言會自動給變量賦予一個默認初始值。對於值類型變量來說不同值類型，有不同的零值，比如整數型零值是 `0`，字符串類型是 `""`，布爾類型是 `false`。對於引用類型變量其零值都是 `nil`。

類型 | 零值
--- | ---
數值類型 | 0
字符串 | ""
布爾類型| false
指針類型 | nil
通道 | nil
函數 | nil
接口 | nil
映射 | nil
切片 | nil
結構體 | 每個結構體字段對應類型的零值
自定義類型 | 其底層類型的對應的零值

從零值的定義，可以看出Go語言引入 `nil` 概念，是爲了將其作爲引用類型變量的零值而存在。

## nil

`nil` 是Go語言中的一個變量，是預先聲明的標識符，用來作爲引用類型變量的零值。

```go
// nil is a predeclared identifier representing the zero value for a
// pointer, channel, func, interface, map, or slice type.
var nil Type // Type must be a pointer, channel, func, interface, map, or slice type
```

`nil` 不能通過:=方式賦值給一個變量，下面代碼是編譯不通過的：

```go
a := nil
```

上面代碼編譯不通過是因爲Go語言是無法通過 `nil` 自動推斷出a的類型，而Go語言是強類型的，每個變量都必須明確其類型。將 `nil` 賦值一個變量是可以的：

```go
var a chan int
a = nil

b := make([]int, 5)
b = nil
```

### 與nil進行比較

#### nil 與 nil比較

`nil` 是不能和 `nil` 比較的：

```go
func main() {
	fmt.Println(nil == nil) // 報錯：invalid operation: nil == nil (operator == not defined on nil)
}
```

#### nil 與 指針類型變量、通道、切片、函數、映射比較

`nil` 是可以和指針類型變量，通道、切片、函數、映射比較的。

1. 對於指針類型變量，只有其未指向任何對象時候，才能等於 `nil`：

```go
func main() {
	var p *int
	println(p == nil) // true
	a := 100
	p = &a
	println(p == nil) // false
}
```

2. 對於通道、切片、映射只有 `var t T` 或者手動賦值爲nil時候(`t = nil`)，才能等於nil:

```go
func main() {
	// 通道
	var ch chan int
	println(ch == nil) // true
	ch = make(chan int, 0)
	println(ch == nil) // false

	ch1 := make(chan int, 0)
	println(ch1 == nil) // false
	ch1 = nil
	println(ch1 == nil) // true

	// 切片
	var s []int // 此時s是nil slice
	println(s == nil) // true
	s = make([]int, 0, 0) // 此時s是empty slice
	println(s == nil) // false

	// 映射
	var m map[int]int // 此時m是nil map
	println(m == nil) // true
	m = make(map[int]int, 0)
	println(m == nil) // false

	// 函數
	var fn func()
	println(fn == nil)
	fn = func() {
	}
	println(fn == nil)
}
```

從上面可以看到，通過make函數初始化的變量都不等於 `nil`。

#### nil 與 接口比較

接口類型變量包含兩個基礎屬性：`Type` 和 `Value`，`Type` 指的是接口類型變量的底層類型，`Value` 指的是接口類型變量的底層值。**接口類型變量是可以比較的**。**當它們具有相同的底層類型，且相等的底層值時候，或者兩者都爲nil時候，這兩個接口值是相等的**。

當 `nil` 與接口比較時候，需要接口的 `Type` 和 `Value`都是 `nil` 時候，兩者才相等：

```go
func main() {
	var p *int
	var i interface{}                   // (T=nil, V=nil)
	println(p == nil)                   // true
	println(i == nil)                   // true
	var pi interface{} = interface{}(p) // (T=*int, V= nil)
	println(pi == nil)                  // false
	println(pi == i)                    // fasle
	println(p == i)                     // false。跟上面強制轉換p一樣。當變量和接口比較時候，會隱式將其轉換成接口

	var a interface{} = nil // (T=nil, V=nil)
	println(a == nil) // true
	var a2 interface{} = (*interface{})(nil) // (T=*interface{}, V=nil)
	println(a2 == nil) // false
	var a3 interface{} = (interface{})(nil) // (T=nil, V=nil)
	println(a3 == nil) // true
}
```

`nil` 和接口比較最容易出錯的場景是使用error接口時候。Go官方文檔舉了一個例子 **[Why is my nil error value not equal to nil?](https://golang.org/doc/faq#nil_error)**:

```go
type MyError int
func (e *MyError) Error() string {
    return "errCode " + string(int)
}

func returnError() error {
	var p *MyError = nil
	if bad() { // 出現錯誤時候，返回MyError
		p = &MyError(401)
	}
	// println(p == nil) // 輸出true
	return p
}

func checkError(err error) {
	if err == nil {
		println("nil")
		return
	}
	println("not nil")
}

err := returnError() // 假定returnsError函數中bad()返回false
println(err == nil) // false
checkError(err) // 輸出not nil
```

我們可以看到上面代碼中 `checkError` 函數輸出的並不是 `nil`，而是 `not nil`。這是因爲接口類型變量 `err` 的底層類型是 `(T=*MyError, V=nil)`，不再是 `(T=nil, V=nil)`。解決辦法是當需返回 `nil` 時候，直接返回 `nil`。

```go
func returnError() error {
	if bad() { // 出現錯誤時候，返回MyError
		return &MyError(401)
	}
	return p
}
```

### 幾個值爲nil的特別變量

#### nil通道

通道類型變量的零值是 `nil`，對於等於 `nil` 的通道稱爲 `nil通道`。當從 `nil通道` 讀取或寫入數據時候，會發生永久性阻塞，若關閉則會發生恐慌。`nil通道` 存在的意義可以參考 **[Why are there nil channels in Go?](https://medium.com/justforfunc/why-are-there-nil-channels-in-go-9877cc0b2308)**

#### nil切片

對 `nil切片` 進行讀寫操作時候會發生恐慌。但對 `nil切片` 進行 `append` 操作時候是可以的，這是因爲Go語言對append操作做了特殊處理。

```go
var s []int
s[0] = 1 // panic: runtime error: index out of range [0] with length 0
println(s[0]) // panic: runtime error: index out of range [0] with length 0
s = append(s, 100) // ok
```

#### nil映射

我們可以對 `nil映射` 進行讀取和刪除操作，當進行讀取操作時候會返回映射的零值。當進行寫操作時候會發生恐慌。

```go
func main() {
	var m map[int]int
	println(m[100]) // print 0
	delete(m, 1)
	m[100] = 100 // panic: assignment to entry in nil map
}
```

#### nil接收者

值爲 `nil` 的變量可以作爲函數的接收者：

```go
const defaultPath = "/usr/bin/"

type Config struct {
	path string
}

func (c *Config) Path() string {
	if c == nil {
		return defaultPath
	}
	return c.path
}

func main() {
	var c1 *Config
	var c2 = &Config{
		path: "/usr/local/bin/",
	}
	fmt.Println(c1.Path(), c2.Path())
}
```

#### nil函數

`nil函數` 可以用來處理默認值情況：

```go
func NewServer(logger function) {
	if logger == nil {
		logger = log.Printf  // default
	}
	logger.DoSomething...
}
```

## 參考資料

- [Golang 零值、空值與空結構](https://juejin.cn/post/6895231755091968013)
- [Why are there nil channels in Go?](https://medium.com/justforfunc/why-are-there-nil-channels-in-go-9877cc0b2308)

[^1]:[Go官方語法指南：零值的定義](https://go.dev/ref/spec#The_zero_value)
