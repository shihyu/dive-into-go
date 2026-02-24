# 逗號ok模式

通過逗號ok模式(comma ok idiom)，我們可以進行類型斷言，判斷映射中是否存在某個key以及通道是否關閉。

## 類型斷言

```go
// 方式1
var (
    v T
    ok bool
)
v, ok = x.(T)

// 方式2
v, ok := x.(T) // x是接口類型的變量，T是要斷言的類型

// 方式3
var v, ok = x.(T)

// 方式4
v := x.(T) // 當心此種方式斷言，若斷言失敗會發生恐慌
```

## 判斷key是否存在映射中

```go
// 方式1
v, ok := a[x]

// 方式2
var v, ok = a[x]
```

## 判斷通道是否關閉

```go
// 方式1
var (
    x T
    ok bool
)
x, ok = <-ch

// 方式2
x, ok := <-ch

// 方式3
var x, ok = <-ch
```
