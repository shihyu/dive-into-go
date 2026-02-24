# 方法

Go 語言中具有接收者的函數，即爲方法。若函數的接收者類型是T，那麼我們可以說該函數是類型T的方法。那麼方法底層實現是怎麼樣的，和函數有什麼區別呢？這一章節我們將探討這個。

## 方法的本質就是普通函數

我們來看下如下的代碼：

```go
type A struct {
    name string
}

func (a A) Name() string {
    a.name = "Hi " + a.name
    return a.name
}

func main() {
    a := A{name: "new world"}
    println(a.Name())
    println(A.Name(a))
}

func NameofA(a A) string {
    a.name = "Hi " + a.name
    return a.name
}
```

上面代碼中，a.Name()表示的是調用對象a的Name方法。它實際上是一個語法糖，等效於A.Name(a)，其中a就是方法接收者。我們可以通過以下代碼證明兩者是相等的：

```go
t1 := reflect.TypeOf(A.Name)
t2 := relect.TypeOf(NameOfA)

fmt.Println(t1 == t2) // true
```

我們在看下a.Name()底層實現是怎麼樣的，點擊[在線查看](https://go.godbolt.org/z/PrYqcd13z)：

```go
LEAQ    go.string."new world"(SB), AX
MOVQ    AX, "".a+32(SP)
MOVQ    $9, "".a+40(SP)
PCDATA  $0, $0
MOVQ    AX, (SP)
MOVQ    $9, 8(SP)
CALL    "".A.Name(SB)
```
a.Name()底層其實調用的就是A.Name函數，只不過傳遞的第一參數就是對象a。

綜上所述，**方法本質就是普通的函數，方法的接收者就是隱含的第一個參數**。對於其他面向對象的語言來說，類對象就是相應的函數的第一個參數。

### 值接收者和指針接收者混合的方法

比如以下代碼中，展示的值接收者和指針接收者混合的方法

```go
type A struct {
    name string
}

func (a A) GetName() string {
    return a.name
}

func (pa *A) SetName() string {
    pa.name = "Hi " + p.name
    return pa.name
}

func main() {
    a := A{name: "new world"}
    pa := &a

    println(pa.GetName()) // 通過指針調用定義的值接收者方法
    println(a.SetName()) // 通過值調用定義的指針接收者方法
}
```

上面代碼中通過指針調用值接收者方法和通過值調用指針接收者方法，都能夠正常運行。這是因爲兩者都是語法糖，Go 語言會在編譯階段會將兩者轉換如下形式：

```go
println((*pa).GetName())
println((&a).SetName())
```

## 方法表達式與方法變量

```go
type A struct {
    name string
}

func (a A) GetName() string {
    return a.name
}

func main() {
    a := A{name: "new world"}

    f1 := A.GetName // 方法表達式
    f1(a)

    f2 := a.GetName // 方法變量
    f2()
}
```

方法表達式(Method Expression) 與方法變量(Method Value)本質上都是 [Function Value](./closure.html#function-value) ，區別在於方法變量會捕獲方法接收者形成閉包，此方法變量的生命週期與方法接收者一樣，編譯器會將其進行優化轉換成對類型T的方法調用，並傳入接收者作爲參數。
根據上面描述我們可以將上面代碼中f2理解成如下代碼：

```go
func GetFunc() (func()) string {
    a := A{name: "new world"}
    return func() string {
        return A.GetName(a)
    }
}

f2 = GetFunc()
```
