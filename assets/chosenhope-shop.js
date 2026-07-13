(() => {
  const toast = document.getElementById('chosenhope-toast');
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function wishlistKey() {
    return 'chosenhope:wishlist';
  }

  function getWishlist() {
    try {
      return JSON.parse(localStorage.getItem(wishlistKey())) || [];
    } catch (e) {
      return [];
    }
  }

  function setWishlist(ids) {
    try {
      localStorage.setItem(wishlistKey(), JSON.stringify(ids));
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  function initWishlistButtons(root) {
    const wishlist = getWishlist();
    root.querySelectorAll('.wishlist-btn[data-product-id]').forEach((btn) => {
      const id = btn.getAttribute('data-product-id');
      const active = wishlist.indexOf(id) !== -1;
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('is-active', active);
    });
  }

  function toggleWishlist(btn) {
    const id = btn.getAttribute('data-product-id');
    const label = btn.getAttribute('data-label') || 'Item';
    if (!id) return;
    const wishlist = getWishlist();
    const index = wishlist.indexOf(id);
    const nowActive = index === -1;
    if (nowActive) {
      wishlist.push(id);
    } else {
      wishlist.splice(index, 1);
    }
    setWishlist(wishlist);
    document.querySelectorAll(`.wishlist-btn[data-product-id="${id}"]`).forEach((el) => {
      el.setAttribute('aria-pressed', nowActive ? 'true' : 'false');
      el.classList.toggle('is-active', nowActive);
    });
    showToast((nowActive ? 'Added ' : 'Removed ') + label + (nowActive ? ' to wishlist' : ' from wishlist'));
  }

  // Filter drawer (mobile)
  const filterDrawer = document.getElementById('chosenhope-filter-drawer');
  const filterDrawerBackdrop = document.getElementById('chosenhope-filter-drawer-backdrop');
  let lastFilterToggle = null;

  function openFilterDrawer(trigger) {
    if (!filterDrawer || !filterDrawerBackdrop) return;
    lastFilterToggle = trigger || document.activeElement;
    filterDrawer.classList.add('open');
    filterDrawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    const closeBtn = filterDrawer.querySelector('.filter-drawer-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeFilterDrawer() {
    if (!filterDrawer || !filterDrawerBackdrop) return;
    filterDrawer.classList.remove('open');
    filterDrawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFilterToggle) lastFilterToggle.focus();
  }

  // Quick view modal
  const qvBackdrop = document.getElementById('chosenhope-quick-view-backdrop');
  const qvModal = document.getElementById('chosenhope-quick-view-modal');
  let qvLastFocused = null;

  function openQuickView(data) {
    if (!qvBackdrop || !qvModal) return;
    qvLastFocused = document.activeElement;
    const title = qvModal.querySelector('[data-qv="title"]');
    const price = qvModal.querySelector('[data-qv="price"]');
    const desc = qvModal.querySelector('[data-qv="desc"]');
    const rating = qvModal.querySelector('[data-qv="rating"]');
    const image = qvModal.querySelector('[data-qv="image"]');
    const addBtn = qvModal.querySelector('[data-qv="add-btn"]');
    const viewLink = qvModal.querySelector('[data-qv="view-link"]');

    if (title) title.textContent = data.title || '';
    if (price) price.textContent = data.price || '';
    if (desc) desc.textContent = data.desc || '';
    if (rating) {
      rating.innerHTML = data.stars
        ? `<span class="stars" aria-hidden="true">${data.stars}</span><span>${data.reviews || ''}</span>`
        : '';
    }
    if (image && data.image) {
      image.src = data.image;
      image.alt = data.title || '';
    }
    if (addBtn) addBtn.setAttribute('data-name', data.title || '');
    if (addBtn) addBtn.setAttribute('data-variant-id', data.variantId || '');
    if (viewLink) viewLink.setAttribute('href', data.url || '#');

    qvBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    const focusable = qvModal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
    document.addEventListener('keydown', qvKeyHandler);
  }

  function closeQuickView() {
    if (!qvBackdrop) return;
    qvBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', qvKeyHandler);
    if (qvLastFocused) qvLastFocused.focus();
  }

  function qvKeyHandler(e) {
    if (!qvModal) return;
    if (e.key === 'Escape') {
      closeQuickView();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = Array.prototype.slice.call(
        qvModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function addToCart(name) {
    showToast((name || 'Item') + ' added to cart');
  }

  document.addEventListener('click', (event) => {
    const wishlistBtn = event.target.closest('.wishlist-btn[data-product-id]');
    if (wishlistBtn) {
      toggleWishlist(wishlistBtn);
      return;
    }

    const quickViewBtn = event.target.closest('.quick-view-btn[data-qv-trigger]');
    if (quickViewBtn) {
      openQuickView({
        title: quickViewBtn.getAttribute('data-title'),
        price: quickViewBtn.getAttribute('data-price'),
        desc: quickViewBtn.getAttribute('data-desc'),
        stars: quickViewBtn.getAttribute('data-stars'),
        reviews: quickViewBtn.getAttribute('data-reviews'),
        image: quickViewBtn.getAttribute('data-image'),
        url: quickViewBtn.getAttribute('data-url'),
        variantId: quickViewBtn.getAttribute('data-variant-id'),
      });
      return;
    }

    if (event.target.closest('[data-filter-toggle]')) {
      openFilterDrawer(event.target.closest('[data-filter-toggle]'));
      return;
    }

    if (event.target.closest('[data-filter-drawer-close]') || event.target === filterDrawerBackdrop) {
      closeFilterDrawer();
      return;
    }

    if (event.target.closest('[data-qv-close]') || event.target === qvBackdrop) {
      closeQuickView();
      return;
    }

    if (event.target.closest('[data-qv-add]')) {
      const btn = event.target.closest('[data-qv-add]');
      addToCart(btn.getAttribute('data-name'));
      closeQuickView();
      return;
    }
  });

  const sortSelect = document.querySelector('[data-shop-sort]');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      sortSelect.form && sortSelect.form.submit();
    });
  }

  initWishlistButtons(document);

  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.chosenhope-home-scope .reveal').forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll('.chosenhope-home-scope .reveal').forEach((el) => el.classList.add('in'));
  }
})();
