# GDB

**GDB**（GNU symbolic Debugger）是Linux系統下的強大的調試工具，可以用來調試ada, c, c++, asm, minimal, d, fortran, objective-c, go, java,pascal 等多種語言。

我們以調試 `go` 代碼爲示例來介紹GDB的使用。源碼內容如下：

```go
package main

import "fmt"

func add(a, b int) int {
	sum := 0
	sum = a + b
	return sum
}
func main() {
	sum := add(10, 20)
	fmt.Println(sum)
}
```

構建二進制應用：

```bash
go build -gcflags="-N -l" -o test main.go
```

## 啓動調試

```bash
gdb ./test # 啓動調試
gdb --args ./test arg1 arg2 # 指定參數啓動調試
```
進入gdb調試界面之後，執行 `run` 命令運行程序。若程序已經運行，我們可以 `attach` 該程序的進程id進行調試:

```bash
$ gdb
(gdb) attach 1785
```

當執行 `attach` 命令的時候，GDB首先會在當前工作目錄下查找進程的可執行程序，如果沒有找到，接着會用源代碼文件搜索路徑。我們也可以用file命令來加載可執行文件。

或者通過命令設置進程id:

```bash
gdb test 1785 
gdb test --pid 1785
```

若已運行的進程不含調試信息，我們可以使用同樣代碼編譯出一個帶調試信息的版本，然後使用 `file` 和 `attach` 命令進行運行調試。

```bash
$ gdb
(gdb) file test
Reading symbols from test...done.
(gdb) attach 1785
```

### 可視化窗口

GDB也支持多窗口圖形啓動運行，一個窗口顯示源碼信息，一個窗口顯示調試信息：

```bash
gdb test -tui
```

GDB支持在運行過程中使用 `Crtl+X+A` 組合鍵進入多窗口圖形界面， GDB支持的快捷操作有：

```bash
Crtl+X+A // 多窗口與單窗口界面切換
Ctrl + X + 2 // 顯示兩個窗口
Ctrl + X + 1 // 顯示一個窗口
```

## 運行程序

通過 `run` 命令運行程序， `run` 命令可以簡寫成 `r`：

```bash
(gdb) run
```

除了啓動GDB時候，設置程序的命令行參數外，我們也可以在啓動GDB後，再指定程序的命令行參數：

```bash
(gdb) run arg1 arg2
```

或者通過 `set` 命令設置命令行參數：

```bash
(gdb) set args arg1 arg2
(gdb) run
```

除了 `run` 命令外，我們也可以使用 `start` 命令運行程序。`start` 命令會在在 `main` 函數的第一條語句前面停下來。

```bash
(gdb) start
```

`start` 命令相當於在Go程序的入口函數 `main.main` (`main.main` 代表 `main` 包的 `main` 函數)處設置斷點，然後運行 `run` 命令：

```bash
(gdb) b main.main
(gdb) run
```

## 斷點的設置、查看、刪除、禁用

### 設置斷點

GDB中是通過 `break` 命令來設置斷點(BreakPoint)，`break` 可以簡寫成 `b`。

- break function

    在指定函數出設置斷點，設置斷點後程序會在進入指定函數時停住

- **break linenum**

    在指定行號處設置斷點

- break +offset/-offset

    在當前行號的前面或後面的offset行處設置斷點。offset爲自然數

- break filename:linenum

    在源文件filename的linenum行處設置斷點

- break filename:function

    在源文件filename的function函數的入口處設置斷點

- **break \*address**

    在程序運行的內存地址處設置斷點

- break

    break命令沒有參數時，表示在下一條指令處停住。

- break ... if <condition>

    ...可以是上述的參數，condition表示條件，在條件成立時停住。比如在循環境體中，可以設置break if i=100，表示當i爲100時停住程序

### 查看斷點

我們可以通過 `info` 命令查看斷點：

```bash
(gdb) info breakpoint # 查看所有斷點
(gdb) info breakpoint 3 # 查看3號斷點
```

### 刪除斷點

刪除斷點是通過 `delete` 命令刪除的，`delete` 命令可以簡寫成 `d`：

```bash
(gdb) delete 3 # 刪除3號斷點
```

### 斷點啓用與禁用

```bash
(gdb) disable 3 # 禁用3號斷點
(gdb) enable 3 # 啓用3號斷點
```

## 調試

### 單步執行

`next` 用於單步執行，會一行行執行代碼，運到函數時候，不會進入到函數內部，跳過該函數，但會執行該函數，即 `step over`。可以簡寫成 `n`。

```bash
(gdb) next
```

### 單步進入

`step` 用於單步進入執行，跟 `next` 命令類似，但是遇到函數時候，會進入到函數內部一步步執行，即 `step into`。可以簡寫成 `s`。

```bash
(gdb) step
```

與 `step` 相關的命令 `stepi`，用於每次執行每次執行一條機器指令。可以簡寫成 `si`。

### 繼續執行到下一個斷點

`continue` 命令會繼續執行程序，直到再次遇到斷點處。可以簡寫成 `c`:

```bash
(gdb) continue
(gdb) continue 3 # 跳過3個斷點
```

### 繼續運行到指定位置

`until` 命令可以幫助我們實現運行到某一行停住，可以簡寫成 `u`：

```bash
(gdb) until 5
```

### 跳過執行

`skip` 命令可以在step時跳過一些不想關注的函數或者某個文件的代碼:

```bash
(gdb) skip function add   # step時跳過add函數
(gdb) info skip   # 查看skip列表
```

其他相關的命令：

- skip delete [num] 刪除skip
- skip enable [num] 啓動skip
- skip disable [num] 關閉skip

**注意：** 當不帶skip號時候，是針對所有skip進行設置。

### 執行完成當前函數

`finish` 命令用來將當前函數執行完成，並打印函數返回時的堆棧地址、返回值、參數值等信息，即`step out` 。

```bash
(gdb) finish
```

## 查看源碼

GDB中的 `list` 命令用來顯示源碼信息。`list` 命令可以簡寫成 `l`。

- **list**

    從第一行開始顯示源碼，繼續輸入list，可列出後面的源碼

- **list linenum**

    列出linenum行附近的源碼

- **list function**

    列出函數function的代碼

- list filename:linenum

    列出文件filename文件中，linenum行出的代碼

- list filename:function

    列出文件filename中，函數function的代碼

- list +offset/-offset

    列出在當前行號的前面或後面的offset行附近的代碼。offset爲自然數。

- list +/-

    列出當前行後面或者前面的代碼

- list linenum1, linenum2

    列出行linenum1和linenum2之間的代碼

## 查看信息

`info` 命令用來顯示信息，可以簡寫成 `i`。

- **info files**

    顯示當前的調試的文件，包含程序入口地址，內存分段佈局位置信息等

- info breakpoints

    顯示當前設置的斷點列表

- info registers

    顯示當前寄存器的值，可以簡寫成 `i r`。指定寄存器名稱，可以查看具體寄存器信息：`i r rsp`

- info all-registers

    顯示所有寄存器的值。GDB提供四個標準寄存器：`pc` 是程序計數器寄存器，`sp` 是堆棧指針。`fp` 用於記錄當前堆棧幀的指針，`ps` 用於記錄處理器狀態的寄存器。GDB會處理好不同架構系統寄存器不一致問題，比如對於 `amd64` 架構，`pc` 對應就是 `rip` 寄存器。

    引用寄存器內容是將寄存器名前置 `$` 符作爲變量來用。比如 `$pc` 就是程序計數器寄存器值。

- info args

    顯示當前函數參數

- info locals

    顯示當前局部變量

- **info frame**

    查看當前棧幀的詳細信息，包括 `rip` 信息，正在運行的指令所在文件位置

- info variables

    查看程序中的變量符號

- info functions

    查看程序中的函數符號

- info functions regexp

    通過正則匹配來查看程序中的函數符號

- info goroutines

    顯示當前執行的 `goroutine` 列表，帶 `*` 的表示當前執行的。注意需要加載 `go runtime` 支持。

- info stack

    查看棧信息

- info proc mappings

    可以簡寫成 `i proc m`。用來查看應用內存映射

- info proc [procid]

    顯示進程信息

- info proc status

    顯示進程相關信息：包括user id和group id；進程內有多少線程；虛擬內存的使用情況；掛起的信號，阻塞的信號，忽略的信號；TTY；消耗的系統和用戶時間；堆棧大小；nice值

- info display

- info watchpoints

    列出當前所設置了的所有觀察點

- info line [linenum]

    查看第 `linenum` 的代碼指令地址信息，不帶 `linenum` 時，顯示的是當前位置的指令地址信息

- info source

    顯示此源代碼的源代碼語言

- info sources

    顯示程序中所有有調試信息的源文件名，一共顯示兩個列表：一個是其符號信息已經讀過的，一個是還未讀取過的

- info types

    顯示程序中所有類型符號

- info types regexp

    通過正則匹配來查看程序中的類型符號

其他類似命令有：

- show args

    查看命令行參數

- show environment [envname]

    查看環境變量信息

- show paths

    查看程序的運行路徑

- whatis var1

    顯示變量var1類型

- ptype var1

    顯示變量 `var1` 類型，若是 `var1` 結構體類型，會顯示該結構體定義信息。

## 查看調用棧

通過 `where` 可以查看調用棧信息：

```bash
(gdb) where
#0  _rt0_amd64 ()
    at /usr/lib/go/src/runtime/asm_amd64.s:15
#1  0x0000000000000001 in ?? ()
#2  0x00007fffffffdd2c in ?? ()
#3  0x0000000000000000 in ?? ()
```

## 設置觀察點

通過 `watch` 命令，可以設置觀察點。當觀察點的變量發生變化時，程序會停下來。可以簡寫成 `wa`

```bash
(gdb) watch sum
```

## 查看彙編代碼

我們可以通過開啓 `disassemble-next-line` 自動顯示彙編代碼。

```bash
(gdb) set disassemble-next-line on
```

當面我們可以查看指定函數的彙編代碼：

```bash
(gdb) disassemble main.main
```

`disassemble` 可以簡寫成 `disas`。我們也可以將源代碼和彙編代碼一一映射起來後進行查看

```bash
(gdb) disas /m main.main
```

GDB默認顯示彙編指令格式是 `AT&T` 格式，我們可以改成 `intel` 格式：

```bash
(gdb) set disassembly-flavor intel
```

## 自動顯示變量值

`display` 命令支持自動顯示變量值功能。當進行 `next` 或者 `step` 等調試操作時候，GDB會自動顯示 `display` 所設置的變量或者地址的值信息。

`display` 命令格式：

```bash
display <expr>
display /<fmt> <expr>
display /<fmt> <addr>
```
- expr是一個表達式
- fmt表示顯示的格式
- addr表示內存地址

其他相關命令：

- undisplay [num]: 不顯示
- delete display [num]: 刪除
- disable display [num]: 關閉自動顯示
- enable display [num]： 開啓自動顯示
- info display: 查看display信息

**注意：** 當不帶display號時候，是針對所有display進行設置。

## 顯示將要執行的彙編指令

我們可以通過 `display` 命令可以實現當程序停止時，查看將要執行的彙編指令：

```bash
(gdb) display /i $pc
(gdb) display /3i $pc # 一次性顯示3條指令
```
取消顯示可以用 `undisplay` 命令進行操作。

## 查看backtrace信息

`backtrace` 命令用來查看棧幀信息。可以簡寫成 `bt`。

```bash
(gdb) backtrace # 顯示當前函數的棧幀以及局部變量信息
(gdb) backtrace full # 顯示各個函數的棧幀以及局部變量值
(gdb) backtrace full n # 從內向外顯示n個棧楨，及其局部變量
(gdb) backtrace full -n # 從外向內顯示n個棧楨，及其局部變量
```

## 切換棧幀信息

`frame` 命令可以切換棧幀信息：

```bash
(gdb) frame n # 其中n是層數，最內層的函數幀爲第0幀
```

其他相關命令：

- info frame: 查看棧幀列表

## 調試多線程

GDB中有一組命令能夠輔助多線程的調試：

- info threads

    顯示當前可調式的所有線程，線程 ID 前有 “*” 表示當前被調試的線程。

- thread threadid

    切換線程到線程threadid

- set scheduler-locking [on|off|step]

    多線程環境下，會存在多個線程運行，這會影響調試某個線程的結果，這個命令可以設置調試的時候多個線程的運行情況，`on` 表示只有當前調試的線程會繼續執行，`off` 表示不屏蔽任何線程，所有線程都可以執行，`step` 表示在單步執行時，只有當前線程會執行。

- thread apply [threadid] [all] args

    對線程列表執行命令。比如通過 `thread apply all bt full` 可以查看所有線程的局部變量信息。

## 查看運行時變量

`print` 命令可以用來查看變量的值。`print` 命令可以簡寫成 `p`。`print` 命令格式如下：

```bash
print [</format>] <expr>
```

`format` 用來設置顯示變量的格式，是可選的選項。其可用值如下所示：

- x 按十六進制格式顯示變量
- d 按十進制格式顯示變量
- u 按十六進制格式顯示無符號整型
- o 按八進制格式顯示變量
- t 按二進制格式顯示變量
- a 按十六進制格式顯示變量
- c 按字符格式顯示變量
- f 按浮點數格式顯示變量
- z 按十六進制格式顯示變量，左側填充零

`expr` 可以是一個變量，也可以是表達式，也可以是寄存器：

```bash
(gdb) p var1 # 打印變量var1
(gdb) p &var1 # 打印變量var1地址
(gdb) p $rsp # 打印rsp寄存器地址
(gdb) p $rsp + 8 # 打印rsp加8後的地址信息
(gdb) p 0xc000068fd0 # 打印0xc000068fd0轉換成10進制格式
(gdb) p /x 824634150864 # 打印824634150864轉換成16進制格式
```

`print` 也支持查看連續內存，`@` 操作符用於查看連續內存，`@` 的左邊是第一個內存的地址的值，`@` 的右邊則想查看內存的長度。

例如對於如下代碼：`int arr[] = {2, 4, 6, 8, 10};`，可以通過如下命令查看 `arr` 前三個單元的數據：

```bash
(gdb) p *arr@3
$2 = {2, 4, 6}
```

## 查看內存中的值

`examine` 命令用來查看內存地址中的值，可以簡寫成 `x`。`examine` 命令的語法如下所示：

```bash
examine /<n/f/u> <addr>
```

- n 表示顯示字段的長度，也就是說從當前地址向後顯示幾個地址的內容。

- f 表示顯示的格式
    - d 數字 decimal
    - u 無符號數字 unsigned decimal
    - s 字符串 string
    - c 字符 char
    - u 無符號整數 unsigned integer
    - t 二進制 binary
    - o 八進制格式 octal
    - x 十六進制格式 hex
    - f 浮點數格式 float
    - i 指令 instruction
    - a 地址 address
    - z 十六進制格式，左側填充零 hex, zero padded on the left

- u 表示從當前地址往後請求的字節數，默認是4個bytes
    - b 一個字節 byte
    - h 兩個字節 halfword
    - w 四個字節 word
    - g 八個字節 giantword

示例：

```bash
(gdb) x/10c 0x4005d4 # 打印前10個字符
(gdb) x/16xb a # 以16進制格式打印數組前a16個byte的值
(gdb) x/16ub a # 以無符號10進制格式打印數組a前16個byte的值
(gdb) x/16tb a # 以2進制格式打印數組前16個abyte的值
(gdb) x/16xw a # 以16進制格式打印數組a前16個word（4個byte）的值
(gdb) x $rsp # 打印rsp寄存器執行的地址的值
(gdb) x $rsp + 8 # 打印rsp加8後的地址指向的值
(gdb) x 0xc000068fd0 # 打印內存0xc000068fd0指向的值
(gdb) x/5i schedule # 打印函數schedule前5條指令
```

## 修改變量或寄存器值

`set` 命令支持修改變量以及寄存器的值：

```bash
(gdb) set var var1=123 # 設置變量var1值爲123
(gdb) set var $rax=123 # 設置寄存器值爲123
(gdb) set environment envname1=123 # 設置環境變量envname1值爲123
```

## 查看命令幫助信息

`help` 命令支持查看GDB命令幫助信息。

```bash
(gdb) help status # 查看所有命令使用示例
(gdb) help x # 查看x命令使用幫助
```

## 搜索源文件

`search` 命令支持在當前文件中使用正則表達式搜索內容。`search` 等效於 `forward-search` 命令，是從當前位置向前搜索，可以簡寫成 `fo`。`reverse-search` 命令功能跟 `forward-search` 恰好相反，其可以簡寫成 `rev`。

```bash
(gdb) search func add # 從當前位置向前搜索add方法
(gdb) rev func add # 從當前爲向後搜索add方法
```

## 執行shell命令

我們可以通過 `shell` 指令來執行shell命令。

```bash
(gdb) shell cat /proc/27889/maps # 查看進程27889的內存映射。若想查看當前進程id，可以使用info proc命令獲取
(gdb) shell ls -alh
```

## GDB對go runtime支持

- runtime.Breakpoint()：觸發調試器斷點。
- runtime/debug.PrintStack()：顯示調試堆棧。
- log：適合替代 print顯示調試信息

## 爲系統調用設置捕獲點

GDB支持爲系統調用設置捕獲點(catchpoint)，我們可以通過 `catch` 指令，後面加上 **系統調用號(syscall numbers)**[^1] 或者**系統調用助記符(syscall mnemonic names，也稱爲系統調用名稱)** 來設置捕獲點。如果不指定系統調用的話，默認是捕獲所有系統調用。

```shell
(gdb) catch syscall 231
Catchpoint 1 (syscall 'exit_group' [231])
(gdb) catch syscall exit_group
Catchpoint 2 (syscall 'exit_group' [231])
(gdb) catch syscall
Catchpoint 3 (any syscall)
```

## 設置源文件查找路徑

在程序調試過程中，構建程序的源文件位置更改之後，gdb不能找到源文件位置，我們可以使用 `directory`命令設置查找源文件的路徑。

```bash
directory ~/www/go/src/github.com/go-delve/
```

`directory` 命令只使用相對路徑下的源文件，若絕對路徑下源文件找不到，我們可以使用 `set substitute-path` 設置路徑替換。

```bash
set substitute-path ~/www/go/src/github.com/go-delve/ ~/www/go/src/github.com/go-delve2/
```

## 批量執行命令

GDB支持以腳本形式運行命令，我們可以使用下面的選項：

- `-ex`選項可以用來指定執行命令
- `-iex`選來用來指定加載應用程序之前需執行的命令
- `-x` 選項用來從指定文件中加載命令
- `-batch`類似`-q`，支持安靜模式，會指示GDB在所有命令執行完成之後，退出

```bash
# 1. 打印提示語 2. 在main.main出設置斷點 3. 運行程序 4. 執行完成程序退出gdb
gdb -iex 'echo 開始執行:\n' -ex "b main.main" -ex "run" -batch ./main

# 設置exit/exit_group系統調用追蹤點，然後運行程序，最後打印backtrace信息
gdb -ex "catch syscall exit exit_group" -ex "run" -ex "bt" -batch ./main

# 從文件中加載命令
gdb -batch -x /tmp/cmds --args executablename arg1 arg2 arg3
```

## GDB增強插件

- [gdbinit](https://github.com/gdbinit/gdbinit)
- [gdb-dashboard](https://github.com/cyrus-and/gdb-dashboard)
- [pwndbg](https://github.com/pwndbg/pwndbg)
- [peda](https://github.com/longld/peda)

## 進一步閱讀

- [Beej's Quick Guide to GDB](http://beej.us/guide/bggdb/)
- [100個gdb小技巧](https://wizardforcel.gitbooks.io/100-gdb-tips/content/index.html)

[^1]:https://x64.syscall.sh/
