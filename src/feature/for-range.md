# 遍歷 - for-range語法

for-range語法可以用來遍歷數組、指向數組的指針，切片、字符串、映射和通道。

## 遍歷數組

當遍歷一個數組a時候，循環範圍會從0到len(a) -1：

```go
func main() {
	var a [3]int
	for i, v := range a {
		fmt.Println(i, v)
	}

    for i, v := range &a {
		fmt.Println(i, v)
	}
}
```

## 遍歷切片

當遍歷一個切片s時候，循環範圍會從0到len(s) -1，若切片是nil，則迭代次數是0次：

```go
func main() {
	a := make([]int, 3)
	for i, v := range a {
		fmt.Println(i, v)
	}

    a = nil
    for i, v := range a {
		fmt.Println(i, v)
	}
}
```

### for-range切片時候可以邊遍歷邊append嗎？

當遍歷切片時候，可以邊遍歷邊append操作，這並不會造成死循環。因爲遍歷之前已經確定了循環範圍，遍歷操作相當如下僞代碼：

```go
len_temp := len(range) // 循環上界
range_temp := range
for index_temp = 0; index_temp < len_temp; index_temp++ {
    value_temp = range_temp[index_temp]
    index = index_temp
    value = value_temp
    original body
}
```

### for-range切片時候，返回的是值拷貝

無論遍歷數組還是切片，返回都是數組或切片中的值拷貝：

```go
func main() {
	users := []User{
		{
			Name: "a1",
			Age:  100,
		},
		{
			Name: "a2",
			Age:  101,
		},
		{
			Name: "a2",
			Age:  102,
		},
	}

	fmt.Println("before: ", users)
	for _, v := range users {
		v.Age = v.Age + 10 // 想給users中所有用戶年齡增加10歲
	}
	fmt.Println("after:  ", users)

}
```

執行上面代碼，輸入以下內容：

```
before:  [{a1 100} {a2 101} {a2 102}]
after:   [{a1 100} {a2 101} {a2 102}]
```

解決辦法可以通過索引訪問原切片或數組：

```go
func main() {
	users := []User{
		{
			Name: "a1",
			Age:  100,
		},
		{
			Name: "a2",
			Age:  101,
		},
		{
			Name: "a2",
			Age:  102,
		},
	}

	fmt.Println("before: ", users)
	for i := range users {
		users[i].Age = users[i].Age + 10
	}
	fmt.Println("after:  ", users)
}
```

## 遍歷字符串

當遍歷字符串時候，返回的是rune類型，rune類型是int32類型的別名，一個rune就是一個碼點(code point)：

```go
// rune is an alias for int32 and is equivalent to int32 in all ways. It is
// used, by convention, to distinguish character values from integer values.
type rune = int32
```

由於遍歷字符串時候，返回的是碼點，所以索引並不總是依次增加1的：

```go
func main() {
	var str = "hello，你好"
	var buf [100]byte
	for i, v := range str {
		vl := utf8.RuneLen(v)
		si := i + vl
		copy(buf[:], str[i:si])
		fmt.Printf("索引%2d: %q，\t 碼點: %#6x，\t 碼點轉換成字節: %#v\n", i, v, v, buf[:vl])
	}
}
```

執行上面代碼將輸出以下內容：

```
索引 0: 'h'，	 碼點:   0x68，	 碼點轉換成字節: []byte{0x68}
索引 1: 'e'，	 碼點:   0x65，	 碼點轉換成字節: []byte{0x65}
索引 2: 'l'，	 碼點:   0x6c，	 碼點轉換成字節: []byte{0x6c}
索引 3: 'l'，	 碼點:   0x6c，	 碼點轉換成字節: []byte{0x6c}
索引 4: 'o'，	 碼點:   0x6f，	 碼點轉換成字節: []byte{0x6f}
索引 5: '，'，	 碼點: 0xff0c，	 碼點轉換成字節: []byte{0xef, 0xbc, 0x8c}
索引 8: '你'，	 碼點: 0x4f60，	 碼點轉換成字節: []byte{0xe4, 0xbd, 0xa0}
索引11: '好'，	 碼點: 0x597d，	 碼點轉換成字節: []byte{0xe5, 0xa5, 0xbd}
```

## 遍歷映射

當遍歷映射時候，Go語言是不會保證遍歷順序的，爲了明確強調這一點，Go語言在實現的時候，故意隨機地選擇一個桶開始遍歷。當映射通道爲nil時候，遍歷次數爲0次。

```go
func main() {
	m := map[int]int{
		1: 10,
		2: 20,
		3: 30,
	}

	for i, v := range m {
		fmt.Println(i, v)
	}

	m = nil
	for i, v := range m {
		fmt.Println(i, v)
	}
}
```

### for-range映射時候可以邊遍歷，邊新增或刪除嗎？

若在一個Goroutine裏面邊遍歷邊新增、刪除，理論上是可以的，不會觸發寫檢測的，新增的key-value可能會被訪問到，也可能不會。

若多個Goroutine中進行遍歷、新增、刪除操作的話，是不可以的，是可能觸發寫檢測的，然後直接panic。

## 遍歷通道

當遍歷通道時，直到通道關閉纔會終止，若通道是nil，則會永遠阻塞。遍歷通道源碼分析請見《**[運行時篇-通道-從channel中讀取數據](../concurrency/channel.md#從channel中讀取數據)** 》。

## 進一步閱讀

- [Go Range Loop Internals](https://garbagecollected.org/2017/02/22/go-range-loop-internals/)
- [For statements](https://golang.org/ref/spec#For_statements)
