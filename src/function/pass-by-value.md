# 值傳遞

函數傳參有三種方式，分別是**值傳遞（pass by value)**、**引用傳遞（pass by reference)**，以及**指針傳遞（pass by pointer)**。指針傳遞也稱爲地址傳遞，本質上也屬於值傳遞，它只不過傳遞的值是地址而已。所以按照廣義的函數傳遞來分，分爲值傳遞和引用傳遞。Go語言中函數傳參值傳遞，不支持引用傳遞。但是由於切片，通道，映射等具有引用傳遞的某些特性，往往令人疑惑其應該是引用傳遞。這個章節我們就來探究下Go語言中函數傳遞的問題。

在探究Go語言中函數傳遞的問題，我們先研究C++語言下的引用傳遞和指針傳遞是怎麼回事。

## C++中指針傳遞

```cpp
#include <stdio.h>

void swap(int* a,int *b){
    printf("交換中：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", *a, &a, *b, &b);
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int a = 1;
    int b = 2;
    printf("交換前：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", a, &a, b, &b);
    swap(&a,&b);
    printf("交換後：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", a, &a, b, &b);
    return 0;
}
```

## C++中引用傳遞

```cpp
#include <stdio.h>
void swap(int &a, int &b){
    printf("交換中：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", a, &a, b, &b);
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int a = 1;
    int b = 2;
    printf("交換前：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", a, &a, b, &b);
    swap(a,b);
    printf("交換後：變量a值：%d， 地址：%p； 變量b值：%d，地址：%p\n", a, &a, b, &b);
    return 0;
}
```

## 進一步閱讀

- [When are function parameters passed by value?](https://golang.org/doc/faq#pass_by_value)
