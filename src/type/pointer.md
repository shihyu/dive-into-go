# 指針

Golang支持指針，但是不能像C語言中那樣進行算術運算。**對於任意類型T，其對應的的指針類型是\*T，類型T稱爲指針類型\*T的基類型**。

## 引用與解引用
一個指針類型\*T變量B存儲的是類型T變量A的內存地址，我們稱該指針類型變量B**引用(reference)**了A。從指針類型變量B獲取（或者稱爲訪問）A變量的值的過程，叫**解引用**。解引用是通過解引用操作符*操作的。

```go
func main() {
	var A int = 100
	var B *int = &A

	fmt.Println(A == *B)
}
```

## 轉換和可比較性

對於指針類型變量能不能夠比較和顯示轉換需要滿足以下規則：

- 指針類型\*T1和\*T2相應的基類型T1和T2的底層類型必須一致。

```go
type MyInt int
type PInt *int
type PMyInt *MyInt

func main() {
	p1 := new(int)
	var p2 PInt = p1 // p2底層類型是*int
	p3 := new(MyInt)
	var p4 PMyInt = p3 // p4底層類型是*MyInt
	fmt.Println(p1, p2, p3, p4)
}
```

## uintptr

uintptr是一個足夠大的整數類型，能夠存放任何指針。不同C語言，Go語言中普通類型指針不能進行算術運算，我們可以將普通類型指針轉換成uintptr然後進行運算，但普通類型指針不能直接轉換成uintptr，必須先轉換成unsafe.Pointer類型之後，再轉換成uintptr。

```go
// uintptr is an integer type that is large enough to hold the bit pattern of
// any pointer.
type uintptr uintptr
```

## unsafe.Pointer

`unsafe`標準庫包提供了`unsafe.Pointer`類型，`unsafe.Pointer`類型稱爲非安全指針類型。

```go
type ArbitraryType int
type Pointer *ArbitraryType
```

`unsafe`標準庫包中也提供了三個函數：

```go
func Alignof(variable ArbitraryType) uintptr // 用來獲取變量variable的對齊保證
func Offsetof(selector ArbitraryType) uintptr // 用來獲取結構體值中的某個字段的地址相對於此結構體值地址的偏移
func Sizeof(variable ArbitraryType) uintptr // 用來獲取變量variable變量的大小尺寸
```

**任何指針類型都可以轉換成`unsafe.Pointer`類型**，即`unsafe.Pointer`可以指向任何類型（arbitrary type），但是該類型值是不能夠解引用(dereferenced)的。`unsafe.Pointer`類型的零值是nil。反過來，**`unsafe.Pointer`也可以轉換成任何指針類型**。

`unsafe.Pointer`類型變量可以顯示轉換成內置的`uintptr`類型變量，`uintptr`變量是整數，可以進行算術運算，也可以反向轉換成`unsafe.Pointer`。

> 安全類型指針(普通類型指針) <----> unsafe.Pointer <-----> uintptr

### 如何正確地使用非類型安全指針？

`unsafe`包中列出[6種正確使用`unsafe.Pointer`的模式](https://golang.google.cn/pkg/unsafe/#Pointer)。

> Code not using these patterns is likely to be invalid today or to become invalid in the future 在代碼中不使用這些模式可能現在無效，或者將來也會變成無效的。

#### 通過非安全類型指針，將*T1轉換成*T2

```go
func Float64bits(f float64) uint64 {
	return *(*uint64)(unsafe.Pointer(&f))
}
```
此時`unsafe.Pointer`充當橋樑，注意T2類型的尺寸不應該大於T1，否則會出現溢出異常

#### 將非安全類型指針轉換成`uintptr`類型

```go
type MyInt int

func main() {
	a := 100
	fmt.Printf("%p\n", &a)
	fmt.Printf("%x\n", uintptr(unsafe.Pointer(&a)))
}
```

#### 將非安全類型指針轉換成`uintptr`類型，並進行算術運算

這種模式常用來訪問結構體字段或者數組的地址。

```go
type MyType struct {
	f1 uint8
	f2 int
	f3 uint64
}

func main() {
	s := MyType{f1: 10, f2: 20, f3: 30}
	f2UintPtr := uintptr(unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + unsafe.Offsetof(s.f2)))
	fmt.Printf("%p\n", &s)
	fmt.Printf("%x\n", f2UintPtr) // f2UintPtr = s地址 + 8

	arr := [3]int{}
	fmt.Printf("%p\n", &arr)
	for i := 0; i < 3; i++ {
		addr := uintptr(unsafe.Pointer(uintptr(unsafe.Pointer(&arr[0])) + uintptr(i)*unsafe.Sizeof(arr[0])))
		fmt.Printf("%x\n", addr)
	}
}
```

通過指針移動到變量內存地址的末尾是無效的：

```go
// INVALID: end points outside allocated space.
var s thing
end = unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + unsafe.Sizeof(s))

// INVALID: end points outside allocated space.
b := make([]byte, n)
end = unsafe.Pointer(uintptr(unsafe.Pointer(&b[0])) + uintptr(n))
```

```eval_rst
.. warning:: 當將uintptr轉換回unsafe.Pointer時，其不能賦值給一個變量進行中轉。
```

我們來看看下面這個例子：

```go
type MyType struct {
	f1 uint8
	f2 int
	f3 uint64
}

func main() {
	// 方式1
	s := MyType{f1: 10, f2: 20, f3: 30}
	ptr := uintptr(unsafe.Pointer(&s)) + unsafe.Offsetof(s.f2)
	f2Ptr := (*int)(unsafe.Pointer(ptr))
	fmt.Println(*f2Ptr)

	// 方式2
	f2Ptr2 := (*int)(unsafe.Pointer(uintptr(unsafe.Pointer(&s)) + unsafe.Offsetof(s.f2)))
	fmt.Println(*f2Ptr2)
}
```

上面代碼中方式1是不安全的，儘管大多數情況結果是符合我們期望的，但是由於將uintptr賦值給ptr時，變量s已不再被引用，這時候若恰好進行GC，變量s會被回收處理。這會造成此後的操作都是非法訪問內存地址。所以對於uintptr轉換成unsafe.Pointer的場景，我們應該採用方式2將其寫在一行裏面。

#### 將非類型安全指針值轉換爲uintptr值，然後傳遞給syscall.Syscall函數

如果unsafe.Pointer參數必須轉換爲uintptr才能作爲參數使用，這個轉換必須出現在調用表達式中：

```go
syscall.Syscall(SYS_READ, uintptr(fd), uintptr(unsafe.Pointer(p)), uintptr(n))
```
將unsafe.Pointer轉換成uintptr後傳參時，無法保證執行函數時其執行的內存未回收。只有將這個轉換放在函數調用表達時候，才能保證函數能夠安全的訪問該內存，這個是編譯器進行安全保障實現的。

#### 將reflect.Value.Pointer或reflect.Value.UnsafeAddr方法的uintptr返回值轉換爲非類型安全指針

reflect標準庫包中的Value類型的Pointer和UnsafeAddr方法都返回uintptr類型值，而不是unsafe.Pointer類型值，是**爲了避免用戶在不引用unsafe包情況下就可以將這兩個方法的返回值轉換爲任何類型安全指針類型**。

調用reflect.Value.Pointer或reflect.Value.UnsafeAddr方法獲取uintptr，並轉換unsafe.Pointer必須放在一行表達式中：

```go
p := (*int)(unsafe.Pointer(reflect.ValueOf(new(int)).Pointer()))
```

下面這種形式是非法：

```go
// INVALID: uintptr cannot be stored in variable
// before conversion back to Pointer.
u := reflect.ValueOf(new(int)).Pointer()
p := (*int)(unsafe.Pointer(u))
```

#### 將reflect.SliceHeader或reflect.StringHeader的Data字段轉換成非安全類型，或反之操作

正確的轉換操作如下：

```go
var s string
hdr := (*reflect.StringHeader)(unsafe.Pointer(&s)) // 模式1
hdr.Data = uintptr(unsafe.Pointer(p))              // 模式6
hdr.Len = n
```

下面操作是存在bug的：

```go
var hdr reflect.StringHeader
hdr.Data = uintptr(unsafe.Pointer(p))
// 當執行下面代碼時候，hdr.Data指向的內存可以已經被回收了
hdr.Len = n
s := *(*string)(unsafe.Pointer(&hdr))
```
