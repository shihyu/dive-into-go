# 內存分配器

## 概述

Golang內存分配管理策略是**按照不同大小的對象和不同的內存層級來分配管理內存**。通過這種多層級分配策略，形成無鎖化或者降低鎖的粒度，以及儘量減少內存碎片，來提高內存分配效率。

Golang中內存分配管理的對象按照大小可以分爲：

類別 | 大小
--- | ---
微對象 tiny object | (0, 16B)
小對象 small object | [16B, 32KB]
大對象 large object | (32KB, +∞)

Golang中內存管理的層級從最下到最上可以分爲：mspan -> mcache -> mcentral -> mheap -> heapArena。golang中對象的內存分配流程如下：

1. 小於16個字節的對象使用`mcache`的微對象分配器進行分配內存
2. 大小在16個字節到32k字節之間的對象，首先計算出需要使用的`span`大小規格，然後使用`mcache`中相同大小規格的`mspan`分配
3. 如果對應的大小規格在`mcache`中沒有可用的`mspan`，則向`mcentral`申請
4. 如果`mcentral`中沒有可用的`mspan`，則向`mheap`申請，並根據BestFit算法找到最合適的`mspan`。如果申請到的`mspan`超出申請大小，將會根據需求進行切分，以返回用戶所需的頁數，剩餘的頁構成一個新的`mspan`放回`mheap`的空閒列表
5. 如果`mheap`中沒有可用`span`，則向操作系統申請一系列新的頁（最小 1MB）
6. 對於大於32K的大對象直接從`mheap`分配

## mspan

mspan是一個雙向鏈表結構。mspan是golang中內存分配管理的基本單位。

```go
// file: mheap.go
type mspan struct {
	next *mspan     // 指向下一個mspan
	prev *mspan     // 指向上一個mspan

	startAddr uintptr // 該span在arena區域起始地址
	npages    uintptr // 該span在arena區域中佔用page個數

	manualFreeList gclinkptr // 空閒對象列表
	freeindex uintptr // 下一個空閒span的索引，freeindex大小介於0到nelems，當freeindex == nelem，表明該span中沒有空餘對象空間了
	// freeindex之前的元素均是已經被使用的，freeindex之後的元素可能被使用，也可能沒被使用
	// freeindex 和 allocCache配合使用來定位出可用span的位置

	nelems uintptr // span鏈表中元素個數

	allocCache uint64 // 初始值爲2^64-1，位值置爲1（假定該位的位置是pos）的表明該span鏈表中對應的freeindex+pos位置的span未使用

	allocBits  *gcBits // 標識該span中所有元素的使用分配情況，位值置爲1則標識span鏈表中對應位置的span已被分配
	gcmarkBits *gcBits // 用來sweep過程進行標記垃圾對象的，用於後續gc。

	allocCount  uint16     // 已分配的對象個數
	spanclass   spanClass  // span類別
	state       mSpanState // mspaninuse etc
	needzero    uint8      // needs to be zeroed before allocation
	elemsize    uintptr    // 能存儲的對象大小
}

// file: mheap.go
type spanClass uint8 // span規格類型
```

span大小一共有67個規格。規格列表如下， 其中class = 0 是特殊的span，用於大於32kb對象分配，是直接從mheap上分配的：

```
# file: sizeclasses.go
// class  bytes/obj  bytes/span  objects  tail waste  max waste
//     1          8        8192     1024           0     87.50%
//     2         16        8192      512           0     43.75%
//     3         32        8192      256           0     46.88%
//     4         48        8192      170          32     31.52%
//     5         64        8192      128           0     23.44%
...
//    64      27264       81920        3         128     10.00%
//    65      28672       57344        2           0      4.91%
//    66      32768       32768        1           0     12.50%
```

- class - 規格id，即spanClass
- bytes/obj - 能夠存儲的對象大小，對應的是mspan的elemsize字段
- bytes/span - 每個span的大小，大小等於頁數*頁大小，即8k * npages
- object - 每個span能夠存儲的objects個數，即nelems，也等於(bytes/span)/(bytes/obj)
- tail waste - 每個span產生的內存碎片，即（bytes/span）%（bytes/obj）
- max waste - 最大浪費比例，（bytes/obj-span最小使用量）*objects/(bytes/span)*100,比如class =2時，span運行的最小使用量是9bytes，則max waste=（16-9）*512/8192*100=43.75%

### mcache

mcache持有一系列不同大小的mspan。mcache屬於per-P cache，由於M運行G時候，必須綁定一個P，這樣當G中申請從mcache分配對象內存時候，無需加鎖處理。

```go
// file: mcache.go
type mcache struct {
	next_sample uintptr // trigger heap sample after allocating this many bytes
	local_scan  uintptr // bytes of scannable heap allocated

	// 微對象分配器，對象大小需要小於16byte
	tiny             uintptr // 微對象起始地址
	tinyoffset       uintptr // 從tiny開始的偏移值
	local_tinyallocs uintptr // tiny對象的個數

	// 大小爲134的指針數組，數組元素指向mspan，SpanClasses一共有67種，爲了滿足指針對象和非指針對象，這裏爲每種規格的span同時準備scan和noscan兩個，分別用於存儲指針對象和非指針對象
	alloc [numSpanClasses]*mspan

	stackcache [_NumStackOrders]stackfreelist // 棧緩存

	// Local allocator stats, flushed during GC.
	local_largefree  uintptr                  // 大對象釋放的字節數
	local_nlargefree uintptr                  // 釋放的大對象個數
	local_nsmallfree [_NumSizeClasses]uintptr // 大小爲64的數組，每種規格span是否的小對象個數

	flushGen uint32 // 掃描計數
}
```

```go
// file: malloc.go
if size <= maxSmallSize {                // 如果size <= 32k
	if noscan && size < maxTinySize { // 不需要掃描，且size<16
		if size&7 == 0 {
			off = round(off, 8)
		} else if size&3 == 0 {
			off = round(off, 4)
		} else if size&1 == 0 {
			off = round(off, 2)
		}
		if off+size <= maxTinySize && c.tiny != 0 {
			// The object fits into existing tiny block.
			x = unsafe.Pointer(c.tiny + off)
			c.tinyoffset = off + size
			c.local_tinyallocs++
			mp.mallocing = 0
			releasem(mp)
			return x
		}
		// Allocate a new maxTinySize block.
		span := c.alloc[tinySpanClass]
		v := nextFreeFast(span)
		if v == 0 {
			v, _, shouldhelpgc = c.nextFree(tinySpanClass)
		}
		x = unsafe.Pointer(v)
		(*[2]uint64)(x)[0] = 0
		(*[2]uint64)(x)[1] = 0
		// See if we need to replace the existing tiny block with the new one
		// based on amount of remaining free space.
		if size < c.tinyoffset || c.tiny == 0 {
			c.tiny = uintptr(x)
			c.tinyoffset = size
		}
		size = maxTinySize
	} else { // 16b ~ 32kb
		var sizeclass uint8
		if size <= smallSizeMax-8 {
			sizeclass = size_to_class8[(size+smallSizeDiv-1)/smallSizeDiv]
		} else {
			sizeclass = size_to_class128[(size-smallSizeMax+largeSizeDiv-1)/largeSizeDiv]
		}
		size = uintptr(class_to_size[sizeclass])
		spc := makeSpanClass(sizeclass, noscan)
		span := c.alloc[spc]
		v := nextFreeFast(span)
		if v == 0 {
			v, span, shouldhelpgc = c.nextFree(spc)
		}
		x = unsafe.Pointer(v)
		if needzero && span.needzero != 0 {
			memclrNoHeapPointers(unsafe.Pointer(v), size)
		}
	}
} else {// > 32kb
	var s *mspan
	shouldhelpgc = true
	systemstack(func() {
		s = largeAlloc(size, needzero, noscan)
	})
	s.freeindex = 1
	s.allocCount = 1
	x = unsafe.Pointer(s.base())
	size = s.elemsize
}
```

## mcentral

當mcache的中沒有可用的span時候，會向mcentral申請，mcetral結構如下：

```go
type mcentral struct {
	lock      mutex // 鎖，由於每個p關聯的mcache都可能會向mcentral申請空閒的span，所以需要加鎖
	spanclass spanClass // mcentral負責的span規格
	nonempty  mSpanList // 空閒span列表
	empty     mSpanList // 已經使用的span列表

	nmalloc uint64 // mcentral已分配的span計數
}
```

**一個mecentral只負責一個規格span**，規格類型記錄在mcentral的spanClass字段中。mcentral維護着兩個雙向鏈表，nonempty表示鏈表裏還有空閒的mspan待分配。empty表示這條鏈表裏的mspan都被分配了object。mcache從mcentrl中獲取和歸還span流程如下：

- 獲取時候先加鎖，先從nonempty中獲取一個沒有分配使用的span，將其從nonempty中刪除，並將span加入empty鏈表，mcache獲取之後釋放鎖。
- 歸還時候先加鎖，先將span加入nonempty鏈表中，並從empty鏈表中刪除，最後釋放鎖。

## mheap

當mecentral沒有可用的span時候，會向mheap申請。

```go
type mheap struct {
	// lock must only be acquired on the system stack, otherwise a g
	// could self-deadlock if its stack grows with the lock held.
	lock      mutex
	free      mTreap // 空閒的並且沒有被os收回的二叉樹堆，大對象用
	sweepgen  uint32 // 掃描計數值，每次gc後自增2
	sweepdone uint32 // all spans are swept
	sweepers  uint32 // number of active sweepone calls

	allspans []*mspan // 所有的span

	sweepSpans [2]gcSweepBuf

	_ uint32 // align uint64 fields on 32-bit for atomics

	pagesInUse         uint64  // pages of spans in stats mSpanInUse; R/W with mheap.lock
	pagesSwept         uint64  // pages swept this cycle; updated atomically
	pagesSweptBasis    uint64  // pagesSwept to use as the origin of the sweep ratio; updated atomically
	sweepHeapLiveBasis uint64  // value of heap_live to use as the origin of sweep ratio; written with lock, read without
	sweepPagesPerByte  float64 // proportional sweep ratio; written with lock, read without
	// TODO(austin): pagesInUse should be a uintptr, but the 386
	// compiler can't 8-byte align fields.

	scavengeTimeBasis     int64
	scavengeRetainedBasis uint64
	scavengeBytesPerNS    float64
	scavengeRetainedGoal  uint64
	scavengeGen           uint64 // incremented on each pacing update

	reclaimIndex uint64

	reclaimCredit uintptr

	// Malloc stats.
	largealloc  uint64                  // bytes allocated for large objects
	nlargealloc uint64                  // number of large object allocations
	largefree   uint64                  // bytes freed for large objects (>maxsmallsize)
	nlargefree  uint64                  // number of frees for large objects (>maxsmallsize)
	nsmallfree  [_NumSizeClasses]uint64 // number of frees for small objects (<=maxsmallsize)

	arenas [1 << arenaL1Bits]*[1 << arenaL2Bits]*heapArena
	heapArenaAlloc linearAlloc

	arenaHints *arenaHint
	arena linearAlloc

	allArenas []arenaIdx

	sweepArenas []arenaIdx

	curArena struct {
		base, end uintptr
	}

	_ uint32 // ensure 64-bit alignment of central

	// 各個尺寸的central
	central [numSpanClasses]struct {
		mcentral mcentral
		pad      [cpu.CacheLinePadSize - unsafe.Sizeof(mcentral{})%cpu.CacheLinePadSize]byte
	}

	spanalloc             fixalloc // allocator for span*
	cachealloc            fixalloc // allocator for mcache*
	treapalloc            fixalloc // allocator for treapNodes*
	specialfinalizeralloc fixalloc // allocator for specialfinalizer*
	specialprofilealloc   fixalloc // allocator for specialprofile*
	speciallock           mutex    // lock for special record allocators.
	arenaHintAlloc        fixalloc // allocator for arenaHints

	unused *specialfinalizer // never set, just here to force the specialfinalizer type into DWARF
}
```

## heapArena

```go
heapArenaBytes = 1 << logHeapArenaBytes

logHeapArenaBytes = (6+20)*(_64bit*(1-sys.GoosWindows)*(1-sys.GoosAix)*(1-sys.GoarchWasm)) + (2+20)*(_64bit*sys.GoosWindows) + (2+20)*(1-_64bit) + (8+20)*sys.GoosAix + (2+20)*sys.GoarchWasm

// heapArenaBitmapBytes is the size of each heap arena's bitmap.
heapArenaBitmapBytes = heapArenaBytes / (sys.PtrSize * 8 / 2)

pagesPerArena = heapArenaBytes / pageSize

type heapArena struct {
	bitmap [heapArenaBitmapBytes]byte
	spans [pagesPerArena]*mspan
	pageInUse [pagesPerArena / 8]uint8
	pageMarks [pagesPerArena / 8]uint8
}
```
heapArena中arena區域是真正的堆區，所有分配的span都是從這個地方分配。arena區域管理的單元大小是page，page頁數爲`pagesPerArena`。

在64位linux系統，runtime.mheap會持有 4,194,304 runtime.heapArena，每個 runtime.heapArena 都會管理 64MB 的內存，所有golang的內存上限是256TB。
