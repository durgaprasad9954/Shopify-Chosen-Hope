(() => {
  const root = document;

  /* ---------------------------------------------------------------------
     Variant selection — reads the JSON payload the info section embeds,
     tracks the selected option value per option index, resolves the
     matching real Shopify variant, and updates every dependent element
     on the page (price, image, form input, buy-now button, availability).
  --------------------------------------------------------------------- */
  const dataEl = document.getElementById('chosenhope-pdp-variant-data');
  const form = document.getElementById('chosenhope-product-form');
  const variantIdInput = form ? form.querySelector('[name="id"]') : null;
  let variants = [];
  let selectedOptions = [];

  if (dataEl) {
    try {
      const payload = JSON.parse(dataEl.textContent);
      variants = payload.variants || [];
      selectedOptions = payload.selectedOptions || [];
    } catch (e) {
      variants = [];
    }
  }

  function findVariant(options) {
    return variants.find((v) => v.options.every((val, i) => val === options[i]));
  }

  function updateOptionControlsUI(optionIndex, value) {
    root.querySelectorAll(`[data-option-index="${optionIndex}"]`).forEach((btn) => {
      const isActive = btn.getAttribute('data-option-value') === value;
      btn.classList.toggle('active', isActive);
      if (btn.classList.contains('variant-swatch')) {
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  function renderVariant(variant) {
    const priceEl = document.getElementById('chosenhope-pdp-price');
    const atcPriceEl = document.getElementById('chosenhope-pdp-atc-price');
    const stickyPriceEl = document.getElementById('chosenhope-sticky-price');
    const addBtn = document.getElementById('chosenhope-pdp-add-btn');
    const unavailableEl = document.getElementById('chosenhope-pdp-unavailable');

    if (!variant) {
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.querySelector('[data-add-text]') && (addBtn.querySelector('[data-add-text]').textContent = 'Unavailable');
      }
      if (unavailableEl) unavailableEl.hidden = false;
      return;
    }

    if (unavailableEl) unavailableEl.hidden = true;

    if (priceEl) {
      priceEl.innerHTML = '';
      const priceSpan = document.createElement('span');
      priceSpan.textContent = variant.price_formatted;
      priceEl.appendChild(priceSpan);
      if (variant.compare_at_price_formatted) {
        const compareSpan = document.createElement('span');
        compareSpan.className = 'compare';
        compareSpan.textContent = variant.compare_at_price_formatted;
        priceEl.appendChild(compareSpan);
      }
    }
    if (atcPriceEl) atcPriceEl.textContent = variant.price_formatted;
    if (stickyPriceEl) stickyPriceEl.textContent = variant.price_formatted;

    if (variantIdInput) {
      variantIdInput.value = variant.id;
      variantIdInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (variant.featured_image_url) {
      setMainImage(variant.featured_image_url, variant.featured_image_alt || '');
      const stickyThumb = document.getElementById('chosenhope-sticky-thumb');
      if (stickyThumb) {
        stickyThumb.innerHTML = `<img src="${variant.featured_image_url}" alt="" loading="lazy">`;
      }
    }

    if (addBtn) {
      addBtn.disabled = !variant.available;
      const textEl = addBtn.querySelector('[data-add-text]');
      if (textEl) textEl.textContent = variant.available ? 'Add to Cart' : 'Sold out';
    }
  }

  function onOptionSelect(btn) {
    const index = Number(btn.getAttribute('data-option-index'));
    const value = btn.getAttribute('data-option-value');
    selectedOptions[index] = value;

    const labelTarget = document.querySelector(`[data-option-label="${index}"]`);
    if (labelTarget) labelTarget.textContent = value;

    updateOptionControlsUI(index, value);
    renderVariant(findVariant(selectedOptions));
  }

  root.addEventListener('click', (event) => {
    const optionBtn = event.target.closest('[data-option-index]');
    if (optionBtn && !optionBtn.disabled) {
      onOptionSelect(optionBtn);
    }
  });

  /* ---------------------------------------------------------------------
     Quantity stepper — every stepper on the page (main panel + sticky
     bar) shares the same value via [data-qty-input].
  --------------------------------------------------------------------- */
  let qty = 1;

  function renderQty() {
    root.querySelectorAll('[data-qty-input]').forEach((input) => {
      input.value = String(qty);
    });
    root.querySelectorAll('[data-qty-decrease]').forEach((btn) => {
      btn.disabled = qty <= 1;
    });
  }

  root.addEventListener('click', (event) => {
    const inc = event.target.closest('[data-qty-increase]');
    const dec = event.target.closest('[data-qty-decrease]');
    if (inc) {
      qty += 1;
      renderQty();
    } else if (dec) {
      qty = Math.max(1, qty - 1);
      renderQty();
    }
  });

  renderQty();

  /* ---------------------------------------------------------------------
     Gallery — thumbnail click swaps the main image and scrolls itself
     into view; the main image and lightbox share one "current index"
     into the thumbnail list so prev/next navigation stays in sync.
  --------------------------------------------------------------------- */
  let currentGalleryIndex = 0;

  function galleryThumbs() {
    return Array.from(root.querySelectorAll('.pdp-thumb'));
  }

  function setMainImage(url, alt) {
    const mediaWrap = document.getElementById('chosenhope-pdp-main-media');
    if (!mediaWrap) return;
    mediaWrap.innerHTML = `<img src="${url}" alt="${(alt || '').replace(/"/g, '&quot;')}" loading="eager">`;
  }

  function showGalleryIndex(index) {
    const thumbs = galleryThumbs();
    if (thumbs.length === 0) return;
    currentGalleryIndex = (index + thumbs.length) % thumbs.length;
    const thumb = thumbs[currentGalleryIndex];

    thumbs.forEach((t) => t.classList.remove('active'));
    thumb.classList.add('active');
    thumb.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });

    setMainImage(thumb.getAttribute('data-image'), thumb.getAttribute('data-alt') || '');

    const backdrop = document.getElementById('chosenhope-lightbox-backdrop');
    if (backdrop && backdrop.classList.contains('open')) {
      renderLightboxMedia();
    }
  }

  root.addEventListener('click', (event) => {
    const thumb = event.target.closest('.pdp-thumb');
    if (thumb) {
      showGalleryIndex(galleryThumbs().indexOf(thumb));
      return;
    }

    const mainImage = event.target.closest('#chosenhope-pdp-main-image');
    if (mainImage) {
      openLightbox();
    }
  });

  function renderLightboxMedia() {
    const mediaWrap = document.getElementById('chosenhope-pdp-main-media');
    const lightboxMedia = document.getElementById('chosenhope-lightbox-media');
    if (!mediaWrap || !lightboxMedia) return;
    lightboxMedia.innerHTML = mediaWrap.innerHTML;
  }

  function openLightbox() {
    const backdrop = document.getElementById('chosenhope-lightbox-backdrop');
    if (!backdrop) return;
    renderLightboxMedia();
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const backdrop = document.getElementById('chosenhope-lightbox-backdrop');
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-lightbox-close]')) {
      closeLightbox();
      return;
    }
    if (event.target.closest('[data-lightbox-prev]')) {
      showGalleryIndex(currentGalleryIndex - 1);
      return;
    }
    if (event.target.closest('[data-lightbox-next]')) {
      showGalleryIndex(currentGalleryIndex + 1);
      return;
    }
    if (event.target.id === 'chosenhope-lightbox-backdrop') {
      closeLightbox();
    }
  });

  root.addEventListener('keydown', (event) => {
    const backdrop = document.getElementById('chosenhope-lightbox-backdrop');
    const isOpen = backdrop && backdrop.classList.contains('open');

    if (event.key === 'Escape') {
      closeLightbox();
      return;
    }
    if (isOpen && event.key === 'ArrowLeft') {
      showGalleryIndex(currentGalleryIndex - 1);
      return;
    }
    if (isOpen && event.key === 'ArrowRight') {
      showGalleryIndex(currentGalleryIndex + 1);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.id === 'chosenhope-pdp-main-image') {
      event.preventDefault();
      openLightbox();
    }
  });

  /* ---------------------------------------------------------------------
     Add to cart — real /cart/add.js AJAX call, then dispatch the theme's
     native shopify:cart:lines-update event so the existing header cart
     bubble + cart drawer pick it up exactly like a native add-to-cart.
  --------------------------------------------------------------------- */
  function showToast(message) {
    const toast = document.getElementById('chosenhope-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  if (form) {
    form.addEventListener('submit', (event) => {
      if (event.submitter && event.submitter.name === 'checkout') return; // let dynamic checkout proceed natively
      event.preventDefault();

      const addBtn = document.getElementById('chosenhope-pdp-add-btn');
      const formData = new FormData(form);

      if (addBtn) addBtn.disabled = true;

      fetch(`${window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/'}cart/add.js`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      })
        .then((response) => response.json())
        .then((result) => {
          if (result.status) {
            showToast(result.message || result.description || 'Could not add to cart');
            return;
          }

          return fetch(`${window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/'}cart.js`)
            .then((r) => r.json())
            .then((cart) => {
              showToast(`${result.quantity} × ${result.product_title || result.title} added to cart`);

              const evt = new Event('shopify:cart:lines-update', { bubbles: true, cancelable: false });
              evt.action = 'add';
              evt.context = 'product';
              evt.lines = [{ merchandiseId: String(result.variant_id), quantity: result.quantity }];
              evt.promise = Promise.resolve({
                cart: { totalQuantity: cart.item_count },
                detail: { itemCount: cart.item_count, items: cart.items },
              });
              document.dispatchEvent(evt);
            });
        })
        .catch(() => {
          showToast('Network error — please try again');
        })
        .finally(() => {
          if (addBtn) addBtn.disabled = false;
        });
    });
  }

  /* ---------------------------------------------------------------------
     Sticky add-to-cart bar — shows once the main add-to-cart row has
     scrolled out of view below the fold.
  --------------------------------------------------------------------- */
  const atcAnchor = document.getElementById('chosenhope-pdp-atc-anchor');
  const stickyBar = document.getElementById('chosenhope-sticky-atc');

  if (atcAnchor && stickyBar && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            stickyBar.classList.remove('show');
            stickyBar.setAttribute('aria-hidden', 'true');
          } else if (entry.boundingClientRect.top < 0) {
            stickyBar.classList.add('show');
            stickyBar.setAttribute('aria-hidden', 'false');
          }
        });
      },
      { threshold: 0 }
    );
    io.observe(atcAnchor);
  }

  /* ---------------------------------------------------------------------
     Recently viewed — records this product in localStorage, and (on the
     recently-viewed section) renders cards for previously viewed
     products fetched live from Shopify's product JSON endpoint.
  --------------------------------------------------------------------- */
  const STORAGE_KEY = 'chosenhope:recently-viewed';

  function readRecentlyViewed() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function recordRecentlyViewed(handle) {
    if (!handle) return;
    let list = readRecentlyViewed().filter((h) => h !== handle);
    list.unshift(handle);
    list = list.slice(0, 12);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* localStorage unavailable */
    }
  }

  const currentHandleEl = document.getElementById('chosenhope-pdp-current-handle');
  if (currentHandleEl) {
    recordRecentlyViewed(currentHandleEl.getAttribute('data-handle'));
  }

  const recentTrack = document.getElementById('chosenhope-recent-track');
  if (recentTrack) {
    const excludeHandle = recentTrack.getAttribute('data-exclude-handle');
    const limit = Number(recentTrack.getAttribute('data-limit')) || 4;
    const handles = readRecentlyViewed()
      .filter((h) => h !== excludeHandle)
      .slice(0, limit);

    if (handles.length === 0) {
      const wrap = recentTrack.closest('.chosenhope-recently-viewed-section');
      if (wrap) wrap.hidden = true;
    } else {
      Promise.all(
        handles.map((handle) =>
          fetch(`/products/${handle}.js`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      ).then((products) => {
        const frag = document.createDocumentFragment();
        products.filter(Boolean).forEach((product) => {
          const image = product.featured_image || (product.images && product.images[0]);
          const price = (product.price / 100).toLocaleString(undefined, { style: 'currency', currency: window.Shopify?.currency?.active || 'USD' });
          const card = document.createElement('article');
          card.className = 'product-card';
          card.innerHTML = `
            <a href="${product.url}" class="product-media" style="display:block;">
              ${image ? `<img src="${image}" alt="${product.title.replace(/"/g, '&quot;')}" loading="lazy">` : '<div class="fallback-photo"><span class="fallback-symbol">+</span></div>'}
            </a>
            <div class="product-info">
              <h3><a href="${product.url}">${product.title}</a></h3>
              <div class="product-meta"><span class="product-price">${price}</span></div>
            </div>
          `;
          frag.appendChild(card);
        });
        recentTrack.innerHTML = '';
        recentTrack.appendChild(frag);
      });
    }
  }
})();
