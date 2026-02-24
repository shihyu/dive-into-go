# 一等公民

Go語言中函數是一等公民（first class)，因爲它既可以作爲變量，也可作爲函數參數，函數返回值。Go語言還支持匿名函數，閉包，函數返回多個值。

## 一等公民特徵

### 函數賦值給一個變量

```go
func add(a, b int) int {
	return a + b
}

func main() {
	fn := add
	fmt.Println(fn(1, 2)) // 3
}
```

### 函數作爲返回值

```go
func pow(a int) func(int) int {
	return func(b int) int {
		result := 1
		for i := 0; i < b; i++ {
			result *= a
		}
		return result
	}
}

func main() {
	powOfTwo := pow(2)         // 2的x次冪
	fmt.Println(powOfTwo(3))   // 8
	fmt.Println(powOfTwo(4))   // 16
	powOfThree := pow(3)       // 3的x次冪
	fmt.Println(powOfThree(3)) // 27
	fmt.Println(powOfThree(4)) // 81
}
```

### 函數作爲函數參數傳遞

下面示例中使用匿名函數作爲函數參數傳遞另外一個函數。

```go
func filter(a []int, fn func(int) bool) (result []int) {
	for _, v := range a {
		if fn(v) {
			result = append(result, v)
		}
	}

	return result
}

func main() {
	data := []int{1, 2, 3, 4, 5}
	// 傳遞奇數過濾器函子，過濾出奇數
	fmt.Println(filter(data, func(a int) bool {
		return a&1 == 1
	})) // 1, 3, 5
	// 過濾出偶數
	fmt.Println(filter(data, func(a int) bool {
		return a&1 == 0
	})) // 2, 4
}
```

### 使用閉包函數構建一個生成器

生成器指的是每次調用時候總是返回下一序列值。下面演示一個整數的生成器：

```go
func generateInteger() func() int {
	ch := make(chan int)
	count := 0
	go func() {
		for {
			ch <- count
			count++
		}
	}()

	return func() int {
		return <-ch
	}
}

func main() {
	generate := generateInteger()
	fmt.Println(generate()) // 0
	fmt.Println(generate()) // 1
	fmt.Println(generate()) // 2
}
```

## 函數式編程

函數式編程（functional programming）是一種編程範式，其核心思想是將複雜的操作採用函數嵌套、組合調用方式來處理。函數式編程一大特徵是函數是一等公民，Go語言中函數是一等公民，但是由於其不支持泛型，Go語言中採用函數式編程有時候是無法通用性的。比如上面的過濾器示例，當想要支持過濾int64類型的，就需要重寫一遍或者傳遞interface{}參數。

### 高階函數

高階函數（Higher-order function）指的是至少滿足下列一個條件的函數：
- 接受一個或多個函數作爲輸入
- 輸出一個函數

高階函數是函數式編程中常用範式，常見使用案例有：

- 過濾器
- apply函數
- 排序函數
- 回調函數
- 函數柯里化
- 合成函數

## 進一步閱讀

- [7 Easy functional programming techniques in Go](https://deepu.tech/functional-programming-in-go/)
