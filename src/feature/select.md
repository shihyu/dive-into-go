# 通道選擇器-select

Go 語言中`select`關鍵字結構跟`switch`結構類似，但是`select`結構的case語句都是跟通道操作相關的。Go 語言會從`select`結構中已經可讀取或可以寫入通道對應的case語句中隨機選擇一個執行，如果所有case語句中的通道都不能可讀取或可寫入且存在default語句的話，那麼會執行default語句。

根據Go 官方語法指南指出select語句執行分爲以下幾個步驟：

1. For all the cases in the statement, the channel operands of receive operations and the channel and right-hand-side expressions of send statements are evaluated exactly once, in source order, upon entering the "select" statement. The result is a set of channels to receive from or send to, and the corresponding values to send. Any side effects in that evaluation will occur irrespective of which (if any) communication operation is selected to proceed. Expressions on the left-hand side of a RecvStmt with a short variable declaration or assignment are not yet evaluated.

    對於case分支語句中寫入通道的右側表達式都會先執行，執行順序是按照代碼中case分支順序，由上到下執行。case分支語句中讀取通道的左右表達式不會先執行的。

2.  If one or more of the communications can proceed, a single one that can proceed is chosen via a uniform pseudo-random selection. Otherwise, if there is a default case, that case is chosen. If there is no default case, the "select" statement blocks until at least one of the communications can proceed.

    如果有一個或者多個case分支的通道可以通信（讀取或寫入），那麼會隨機選擇一個case分支執行。否則如果存在default分支，那麼執行default分支，若沒有default分支，那麼select語句會阻塞，直到某一個case分支的通道可以通信。

3. Unless the selected case is the default case, the respective communication operation is executed.

    除非選擇的case分支是default分支，否則將執行相應case分支的通道讀寫操作。
4. If the selected case is a RecvStmt with a short variable declaration or an assignment, the left-hand side expressions are evaluated and the received value (or values) are assigned.
5. The statement list of the selected case is executed.

    執行所選case中的語句。

上面介紹的執行順序第一步驟，我們可以從下面代碼輸出結果可以看出來：

```go
func main() {
	ch := make(chan int, 1)
	select {
	case ch <- getVal(1):
		println("recv: ", <-ch)
	case ch <- getVal(2):
		println("recv: ", <-ch)
	}
}

func getVal(n int) int {
	println("getVal: ", n)
	return n
}
```

上面代碼輸出結果可能如下：

```
getVal:  1
getVal:  2
recv:  2
```

可以看到通道寫入的右側表達式`getVal(1)`和`getVal(2)`都會立馬執行，執行順序跟case語句順序一樣。

接下來我們來看看第二步驟：

```go
func main() {
	ch := make(chan int, 1)
	ch <- 100

	select {
	case i := <-ch:
		println("case1 recv: ", i)
	case i := <-ch:
		println("case2 recv: ", i)
	}
}
```

上面代碼中case1 和case2分支的通道都是可以通信狀態，那麼Go會隨機選擇一個分支執行，我們執行代碼後打印出來的結果可以證明這一點。

我們接下來再看看下面的代碼：

```go
func main() {
	ch := make(chan int, 1)
	go func() {
		time.Sleep(time.Second)
		ch <- 100
	}()

	select {
	case i := <-ch:
		println("case1 recv: ", i)
	case i := <-ch:
		println("case2 recv: ", i)
	default:
		println("default case")
	}
}
```

上面代碼中case1 和case2語句中的ch是未可以通信狀態，由於存在default分支，那麼Go會執行default分支，進而打印出`default case`。

如果我們註釋掉default分支，我們可以發現select會阻塞，直到1秒之後ch通道是可以通信狀態，此時case1或case2中某個分支會執行。
