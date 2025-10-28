// Mobile Android-like UI enhancements
(function(){
  function openFilterSheet(){
    var marketplace = document.getElementById('marketplace');
    if(!marketplace) return;
    marketplace.classList.add('filters-sheet-open');
    var backdrop = document.getElementById('filterSheetBackdrop');
    if(backdrop) backdrop.classList.add('visible');
  }
  function closeFilterSheet(){
    var marketplace = document.getElementById('marketplace');
    if(marketplace) marketplace.classList.remove('filters-sheet-open');
    var backdrop = document.getElementById('filterSheetBackdrop');
    if(backdrop) backdrop.classList.remove('visible');
  }
  window.openFilterSheet = openFilterSheet;
  window.closeFilterSheet = closeFilterSheet;

  function createRipple(e){
    var el = e.currentTarget;
    if(!el) return;
    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', function(){ ripple.remove(); });
  }

  function initRipple(){
    try {
      var selectors = [
        'button',
        '.nav-item',
        '.filter-tab',
        '.contact-link',
        '.floating-connection-btn',
        '.floating-update-btn',
        '.floating-filter-btn',
        '.link-card'
      ];
      var targets = document.querySelectorAll(selectors.join(','));
      targets.forEach(function(el){
        el.classList.add('ripple-target');
        el.addEventListener('pointerdown', createRipple, { passive: true });
      });
    } catch(err){
      console.warn('Ripple init failed', err);
    }
  }

  function initHeaderCondense(){
    var header = document.querySelector('.header');
    if(!header) return;
    var onScroll = function(){
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      if(y > 24) header.classList.add('header-compact');
      else header.classList.remove('header-compact');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('DOMContentLoaded', function(){
    initRipple();
    initHeaderCondense();
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeFilterSheet(); });
    var applyBtn = document.getElementById('applyFiltersBtn');
    if(applyBtn){
      applyBtn.addEventListener('click', function(){
        try {
          if(typeof applyMarketplaceFilters === 'function'){ applyMarketplaceFilters(); }
        } catch(e) {}
        closeFilterSheet();
      });
    }
  });
})();