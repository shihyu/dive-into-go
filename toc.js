// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="index.html"><strong aria-hidden="true">1.</strong> 深入Go語言之旅</a></li><li class="chapter-item expanded affix "><li class="part-title">準備篇</li><li class="chapter-item expanded "><a href="compiler.html"><strong aria-hidden="true">2.</strong> 編譯流程</a></li><li class="chapter-item expanded "><a href="analysis-tools/index.html"><strong aria-hidden="true">3.</strong> 分析工具</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="analysis-tools/gdb.html"><strong aria-hidden="true">3.1.</strong> GDB</a></li><li class="chapter-item expanded "><a href="analysis-tools/dlv.html"><strong aria-hidden="true">3.2.</strong> Delve</a></li><li class="chapter-item expanded "><a href="analysis-tools/go-buildin-tools.html"><strong aria-hidden="true">3.3.</strong> Go 內置工具</a></li></ol></li><li class="chapter-item expanded "><a href="go-assembly.html"><strong aria-hidden="true">4.</strong> Go彙編</a></li><li class="chapter-item expanded affix "><li class="part-title">基礎篇</li><li class="chapter-item expanded "><a href="type/index.html"><strong aria-hidden="true">5.</strong> 數據類型與數據結構</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="type/string.html"><strong aria-hidden="true">5.1.</strong> 字符串</a></li><li class="chapter-item expanded "><a href="type/array.html"><strong aria-hidden="true">5.2.</strong> 數組</a></li><li class="chapter-item expanded "><a href="type/slice.html"><strong aria-hidden="true">5.3.</strong> 切片</a></li><li class="chapter-item expanded "><a href="type/nil.html"><strong aria-hidden="true">5.4.</strong> nil</a></li><li class="chapter-item expanded "><a href="type/empty_struct.html"><strong aria-hidden="true">5.5.</strong> 空結構體</a></li><li class="chapter-item expanded "><a href="type/pointer.html"><strong aria-hidden="true">5.6.</strong> 指針</a></li><li class="chapter-item expanded "><a href="type/map.html"><strong aria-hidden="true">5.7.</strong> 映射</a></li></ol></li><li class="chapter-item expanded "><a href="function/index.html"><strong aria-hidden="true">6.</strong> 函數</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="function/first-class.html"><strong aria-hidden="true">6.1.</strong> 一等公民</a></li><li class="chapter-item expanded "><a href="function/call-stack.html"><strong aria-hidden="true">6.2.</strong> 函數調用棧</a></li><li class="chapter-item expanded "><a href="function/pass-by-value.html"><strong aria-hidden="true">6.3.</strong> 值傳遞</a></li><li class="chapter-item expanded "><a href="function/closure.html"><strong aria-hidden="true">6.4.</strong> 閉包</a></li><li class="chapter-item expanded "><a href="function/method.html"><strong aria-hidden="true">6.5.</strong> 方法</a></li></ol></li><li class="chapter-item expanded "><a href="feature/index.html"><strong aria-hidden="true">7.</strong> 語言特性</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="feature/comma-ok.html"><strong aria-hidden="true">7.1.</strong> 逗號ok模式</a></li><li class="chapter-item expanded "><a href="feature/for-range.html"><strong aria-hidden="true">7.2.</strong> 遍歷 - for-range語法</a></li><li class="chapter-item expanded "><a href="feature/defer.html"><strong aria-hidden="true">7.3.</strong> 延遲執行 - defer語法</a></li><li class="chapter-item expanded "><a href="feature/select.html"><strong aria-hidden="true">7.4.</strong> 通道選擇器 - select語法</a></li><li class="chapter-item expanded "><a href="feature/panic-recover.html"><strong aria-hidden="true">7.5.</strong> 恐慌與恢復  - panic/recover</a></li></ol></li><li class="chapter-item expanded "><li class="part-title">運行時篇</li><li class="chapter-item expanded "><a href="concurrency/index.html"><strong aria-hidden="true">8.</strong> 併發編程</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="concurrency/memory-model.html"><strong aria-hidden="true">8.1.</strong> 內存模型</a></li><li class="chapter-item expanded "><a href="concurrency/context.html"><strong aria-hidden="true">8.2.</strong> 上下文 - context</a></li><li class="chapter-item expanded "><a href="concurrency/channel.html"><strong aria-hidden="true">8.3.</strong> 通道 - channel</a></li><li class="chapter-item expanded "><a href="concurrency/atomic.html"><strong aria-hidden="true">8.4.</strong> 原子操作 - atomic</a></li><li class="chapter-item expanded "><a href="concurrency/sync-map.html"><strong aria-hidden="true">8.5.</strong> 併發Map - sync.Map</a></li><li class="chapter-item expanded "><a href="concurrency/sync-waitgroup.html"><strong aria-hidden="true">8.6.</strong> 等待組 - sync.WaitGroup</a></li><li class="chapter-item expanded "><a href="concurrency/sync-once.html"><strong aria-hidden="true">8.7.</strong> 一次性操作 - sync.Once</a></li><li class="chapter-item expanded "><a href="concurrency/sync-pool.html"><strong aria-hidden="true">8.8.</strong> 緩衝池 - sync.Pool</a></li><li class="chapter-item expanded "><a href="concurrency/sync-cond.html"><strong aria-hidden="true">8.9.</strong> 條件變量 - sync.Cond</a></li><li class="chapter-item expanded "><a href="concurrency/sync-mutex.html"><strong aria-hidden="true">8.10.</strong> 互斥鎖 - sync.Mutex</a></li><li class="chapter-item expanded "><a href="concurrency/sync-rwmutex.html"><strong aria-hidden="true">8.11.</strong> 讀寫鎖 - sync.RWMutex</a></li></ol></li><li class="chapter-item expanded "><a href="gmp/index.html"><strong aria-hidden="true">9.</strong> G-M-P調度機制</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="gmp/gmp-model.html"><strong aria-hidden="true">9.1.</strong> 調度機制概述</a></li><li class="chapter-item expanded "><a href="gmp/scheduler.html"><strong aria-hidden="true">9.2.</strong> 調度器</a></li></ol></li><li class="chapter-item expanded "><a href="memory/index.html"><strong aria-hidden="true">10.</strong> 內存管理</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="memory/allocator.html"><strong aria-hidden="true">10.1.</strong> 內存分配器</a></li><li class="chapter-item expanded "><a href="memory/GC.html"><strong aria-hidden="true">10.2.</strong> GC</a></li></ol></li><li class="chapter-item expanded "><a href="type-system/index.html"><strong aria-hidden="true">11.</strong> 類型系統</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="type-system/type.html"><strong aria-hidden="true">11.1.</strong> 類型系統</a></li><li class="chapter-item expanded "><a href="type-system/interface.html"><strong aria-hidden="true">11.2.</strong> 接口</a></li><li class="chapter-item expanded "><a href="type-system/reflect.html"><strong aria-hidden="true">11.3.</strong> 反射</a></li></ol></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
