// ===== NAVBAR SCROLL =====
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });
}

// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const closeMenu = document.getElementById('closeMenu');

function openMenu() {
  if (!mobileMenu) return;
  mobileMenu.classList.add('open');
  // overlay
  let overlay = document.getElementById('menuOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.id = 'menuOverlay';
    overlay.onclick = closeMenuFn;
    document.body.appendChild(overlay);
  }
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenuFn() {
  if (!mobileMenu) return;
  mobileMenu.classList.remove('open');
  const overlay = document.getElementById('menuOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', openMenu);
if (closeMenu) closeMenu.addEventListener('click', closeMenuFn);

// Close on mobile menu links
if (mobileMenu) {
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenuFn));
}

// ===== BANNER SLIDER =====
let currentSlide = 0;
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
let slideTimer;

function goToSlide(idx) {
  if (!slides.length) return;
  slides[currentSlide].classList.remove('active');
  dots[currentSlide]?.classList.remove('active');
  currentSlide = (idx + slides.length) % slides.length;
  slides[currentSlide].classList.add('active');
  dots[currentSlide]?.classList.add('active');
}

function startSlider() {
  slideTimer = setInterval(() => goToSlide(currentSlide + 1), 5000);
}

const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

if (prevBtn) prevBtn.addEventListener('click', () => { clearInterval(slideTimer); goToSlide(currentSlide - 1); startSlider(); });
if (nextBtn) nextBtn.addEventListener('click', () => { clearInterval(slideTimer); goToSlide(currentSlide + 1); startSlider(); });

dots.forEach(dot => {
  dot.addEventListener('click', () => {
    clearInterval(slideTimer);
    goToSlide(parseInt(dot.dataset.idx));
    startSlider();
  });
});

if (slides.length) startSlider();

// ===== FORMAT TABS =====
window.switchFormat = function(format, el) {
  document.querySelectorAll('.fmt-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.format-panel').forEach(p => p.classList.remove('active'));
  if (el) el.classList.add('active');
  const panel = document.getElementById('panel-' + format);
  if (panel) panel.classList.add('active');

  // scroll to books if not visible
  const booksSection = document.getElementById('books');
  if (booksSection) {
    const rect = booksSection.getBoundingClientRect();
    if (rect.top < -100 || rect.top > window.innerHeight) {
      booksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

// ===== THUMBNAIL GALLERY =====
window.changeImg = function(el, src) {
  const mainImg = document.getElementById('mainBookImg');
  if (mainImg) mainImg.src = src;
  document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
};

// ===== NOTIFY ME =====
window.notifyMe = function() {
  const emailInput = document.getElementById('notifyEmail');
  if (!emailInput) return;
  const email = emailInput.value.trim();
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  emailInput.value = '';
  showToast('🎧 We\'ll notify you when the audiobook is ready!', 'success');
};

// ===== TOAST NOTIFICATION =====
function showToast(msg, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = `
    position: fixed; bottom: 32px; right: 24px; z-index: 9999;
    background: ${type === 'success' ? '#1a2e1a' : '#2e1a1a'};
    color: ${type === 'success' ? '#4caf50' : '#ef5350'};
    border: 1px solid ${type === 'success' ? 'rgba(76,175,80,0.3)' : 'rgba(239,83,80,0.3)'};
    border-radius: 10px; padding: 14px 24px;
    font-size: 0.9rem; font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    max-width: 360px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);

  const style = document.createElement('style');
  style.textContent = '@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
  document.head.appendChild(style);

  setTimeout(() => toast.remove(), 3500);
}

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ===== CHECKOUT STEPS (shared utility) =====
window.validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
window.validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone.replace(/\s/g, ''));

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href').slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ===== INTERSECTION OBSERVER - Animate on scroll =====
const animateElements = document.querySelectorAll('.inside-card, .review-card, .chapter-item, .cta-card');
if (animateElements.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animateElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

// ===== COUPON CODE HANDLER =====
window.applyCoupon = function(inputId, discountId) {
  const code = document.getElementById(inputId)?.value?.trim().toUpperCase();
  const validCoupons = {
    'SHELF10': 10,
    'BELIEF20': 20,
    'FIRST15': 15,
    'ANUJ5': 5,
  };

  if (validCoupons[code]) {
    const discount = validCoupons[code];
    if (discountId) {
      const el = document.getElementById(discountId);
      if (el) {
        el.textContent = `- ₹${discount}`;
        el.style.color = '#4caf50';
      }
    }
    showToast(`✅ Coupon applied! You saved ₹${discount}`, 'success');
    return discount;
  } else {
    showToast('❌ Invalid coupon code.', 'error');
    return 0;
  }
};

// ===== RAZORPAY PAYMENT HANDLER =====
window.initiatePayment = async function(options) {
  const { amount, name, email, phone, productName, onSuccess } = options;

  try {
    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, productName, name, email, phone })
    });

    if (!response.ok) throw new Error('Order creation failed');
    const order = await response.json();

    const rzpOptions = {
      key: order.key,
      amount: order.amount,
      currency: 'INR',
      name: 'AmbikaShelf Library',
      description: productName,
      order_id: order.id,
      image: 'https://ambikashelf.in/icons/ambikashelf.png',
      prefill: { name, email, contact: phone },
      theme: { color: '#00bcd4' },
      handler: async function(rzpResponse) {
        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: rzpResponse.razorpay_order_id,
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_signature: rzpResponse.razorpay_signature,
              orderData: { name, email, phone, productName, amount }
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            if (onSuccess) onSuccess(verifyData);
          } else {
            showToast('Payment verification failed. Contact support.', 'error');
          }
        } catch (err) {
          showToast('Verification error. Contact support@ambikashelf.in', 'error');
        }
      },
      modal: {
        ondismiss: function() {
          showToast('Payment cancelled.', 'error');
        }
      }
    };

    const rzp = new Razorpay(rzpOptions);
    rzp.open();
  } catch (err) {
    showToast('Could not connect to payment server. Try again.', 'error');
    console.error(err);
  }
};
