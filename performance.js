// Performance Optimization Script
// تحسينات الأداء الإضافية

(function() {
    'use strict';

    // تحسين تحميل الصور
    function optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }

    // تحسين الخطوط
    function optimizeFonts() {
        // تحميل الخطوط بشكل غير متزامن
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                console.log('Fonts loaded successfully');
            });
        }
    }

    // تحسين CSS Critical Path
    function optimizeCriticalCSS() {
        // إزالة CSS غير المستخدم
        const unusedStyles = document.querySelectorAll('style[data-unused]');
        unusedStyles.forEach(style => style.remove());
    }

    // تحسين JavaScript
    function optimizeJavaScript() {
        // تأجيل تحميل JavaScript غير الضروري
        const deferredScripts = document.querySelectorAll('script[data-defer]');
        
        deferredScripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.src = script.dataset.src;
            newScript.async = true;
            document.head.appendChild(newScript);
        });
    }

    // مراقبة الأداء
    function monitorPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                    const domContentLoaded = perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
                    
                    console.log(`Page Load Time: ${loadTime}ms`);
                    console.log(`DOM Content Loaded: ${domContentLoaded}ms`);
                    
                    // إرسال البيانات للتحليل (اختياري)
                    if (loadTime > 3000) {
                        console.warn('Page load time is slow. Consider optimization.');
                    }
                }, 0);
            });
        }
    }

    // تحسين التخزين المؤقت للمتصفح
    function optimizeBrowserCache() {
        // تحديث Service Worker إذا لزم الأمر
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    registration.update();
                });
            });
        }
    }

    // تحسين الذاكرة
    function optimizeMemory() {
        // تنظيف Event Listeners غير المستخدمة
        window.addEventListener('beforeunload', () => {
            // تنظيف الذاكرة قبل إغلاق الصفحة
            if (window.myListCache) {
                window.myListCache.clear();
            }
        });
    }

    // تشغيل التحسينات
    function initPerformanceOptimizations() {
        optimizeImages();
        optimizeFonts();
        optimizeCriticalCSS();
        optimizeJavaScript();
        monitorPerformance();
        optimizeBrowserCache();
        optimizeMemory();
    }

    // تشغيل التحسينات عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPerformanceOptimizations);
    } else {
        initPerformanceOptimizations();
    }

})();