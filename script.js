(function () {
  var form = document.getElementById('lead-form');
  var success = document.querySelector('.form-success');
  var errorBox = form.querySelector('.form-error');
  var submitBtn = form.querySelector('button[type="submit"]');

  document.getElementById('year').textContent = new Date().getFullYear();

  // Capture UTM / Meta click params so leads can be tied back to ad angles
  var params = new URLSearchParams(window.location.search);
  var tracking = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'].forEach(function (k) {
    if (params.get(k)) tracking[k] = params.get(k);
  });

  function isValid(el) {
    var v = el.type === 'checkbox' ? el.checked : el.value.trim();
    if (!v) return false;
    if (el.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    if (el.type === 'tel') return el.value.replace(/\D/g, '').length >= 10;
    return true;
  }

  function markField(el) {
    var wrap = el.type === 'checkbox' ? el.closest('.consent') : el.closest('.field');
    var ok = isValid(el);
    wrap.classList.toggle('invalid', !ok);
    el.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  }

  Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
    el.addEventListener('change', function () { markField(el); });
    el.addEventListener('blur', function () { if (el.value) markField(el); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = form.querySelectorAll('[required]');
    var firstBad = null;
    Array.prototype.forEach.call(fields, function (el) {
      if (!markField(el) && !firstBad) firstBad = el;
    });
    if (firstBad) {
      errorBox.textContent = firstBad.type === 'checkbox'
        ? 'Please check the consent box to continue.'
        : 'Please complete the highlighted fields.';
      errorBox.hidden = false;
      firstBad.focus();
      return;
    }
    errorBox.hidden = true;

    var data = Object.fromEntries(new FormData(form).entries());
    Object.assign(data, tracking, { page: window.location.href, submitted_at: new Date().toISOString() });

    // Set data-endpoint on the form to your CRM / Zapier / GoHighLevel webhook URL
    var endpoint = form.getAttribute('data-endpoint');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    var send = endpoint
      ? fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); })
      : Promise.resolve(console.warn('No form endpoint configured; lead not sent.', data));

    send.then(function () {
      if (window.fbq) window.fbq('track', 'Lead');
      form.hidden = true;
      form.parentNode.querySelector('h2').hidden = true;
      success.hidden = false;
      success.focus();
    }).catch(function () {
      errorBox.textContent = 'Something went wrong. Please try again.';
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Me the Information';
    });
  });

  // Hide the mobile sticky CTA while the form is on screen
  var sticky = document.querySelector('.sticky-cta');
  var card = document.getElementById('get-info');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sticky.classList.toggle('hidden', entries[0].isIntersecting);
    }).observe(card);
  }

  // CTA buttons scroll to the form and focus the first field
  Array.prototype.forEach.call(document.querySelectorAll('.js-to-form'), function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () {
        var first = document.getElementById('first_name');
        if (first && !form.hidden) first.focus({ preventScroll: true });
      }, 500);
    });
  });
})();
