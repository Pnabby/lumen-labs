(() => {
  'use strict';
  const nav = document.querySelector('#navigation');
  const menu = document.querySelector('.menu-toggle');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation'); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  window.matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { for (const entry of entries) { if (!entry.isIntersecting) continue; nav.querySelectorAll('a').forEach(link => { if (link.getAttribute('href') === '#' + entry.target.id) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }); } }, { rootMargin: '-15% 0px -55% 0px' });
    document.querySelectorAll('.section-anchor').forEach(section => observer.observe(section));
  }
  const capabilities = {
    understand: { mode: 'SCENE UNDERSTANDING', text: 'There is a cup on the table in front of you.', label: 'Cup' },
    read: { mode: 'TEXT READING', text: 'Your appointment is on Monday at ten in the morning.', label: 'Text detected' },
    recognize: { mode: 'CURRENCY RECOGNITION', text: 'This is a twenty Ghana cedi note.', label: 'GH₵20' },
    move: { mode: 'OBSTACLE AWARENESS', text: 'There is an obstacle ahead of you.', label: 'Obstacle ahead' }
  };
  let selected = 'understand';
  const tabs = [...document.querySelectorAll('[data-capability]')];
  const listen = document.querySelector('#listen-example');
  function stopSpeech() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); listen.setAttribute('aria-label', 'Listen to illustrative audio example'); listen.removeAttribute('data-playing'); }
  function selectCapability(key) { stopSpeech(); selected = key; tabs.forEach(tab => { const active = tab.dataset.capability === key; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; }); const info = capabilities[key]; document.querySelector('#demo-mode').textContent = info.mode; document.querySelector('#demo-text').textContent = '“' + info.text + '”'; document.querySelector('#demo-scene').dataset.scene = key; document.querySelector('.scene-label').textContent = info.label; document.querySelector('#capability-panel').setAttribute('aria-labelledby', 'tab-' + key); document.querySelector('#audio-status').textContent = ''; }
  tabs.forEach((tab, index) => { tab.addEventListener('click', () => selectCapability(tab.dataset.capability)); tab.addEventListener('keydown', event => { let next; if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length; if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index - 1 + tabs.length) % tabs.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1; if (next !== undefined) { event.preventDefault(); selectCapability(tabs[next].dataset.capability); tabs[next].focus(); } }); });
  listen.addEventListener('click', () => { const status = document.querySelector('#audio-status'); if (!('speechSynthesis' in window)) { status.textContent = 'Audio playback is not supported by this browser. The example is written above.'; return; } if (listen.hasAttribute('data-playing')) { stopSpeech(); status.textContent = 'Playback stopped.'; return; } const utterance = new SpeechSynthesisUtterance(capabilities[selected].text); utterance.lang = 'en-GB'; utterance.rate = 0.9; utterance.onend = stopSpeech; utterance.onerror = () => { stopSpeech(); status.textContent = 'Audio could not play. The example is written above.'; }; listen.setAttribute('data-playing', 'true'); listen.setAttribute('aria-label', 'Stop illustrative audio example'); status.textContent = 'Playing illustrative audio example.'; window.speechSynthesis.speak(utterance); });
  window.addEventListener('pagehide', stopSpeech);
  document.querySelectorAll('[data-enquiry]').forEach(link => link.addEventListener('click', () => { document.querySelector('#reason').value = link.dataset.enquiry; }));
  const privacy = document.querySelector('#privacy-dialog');
  document.querySelectorAll('[data-open-privacy]').forEach(button => button.addEventListener('click', () => privacy.showModal()));
  document.querySelector('#close-privacy').addEventListener('click', () => privacy.close());
  document.querySelector('#privacy-done').addEventListener('click', () => privacy.close());
  privacy.addEventListener('click', event => { if (event.target === privacy) { const box = privacy.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) privacy.close(); } });
  document.querySelector('#year').textContent = new Date().getUTCFullYear();
  const form = document.querySelector('#contact-form');
  let pendingId = null;
  form.addEventListener('input', () => { pendingId = null; });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    const status = document.querySelector('#form-status');
    const emailCopy = document.querySelector('#email-copy');
    const data = Object.fromEntries(new FormData(form));
    data.consent = document.querySelector('#consent').checked;
    pendingId ||= crypto.randomUUID(); data.id = pendingId;
    const body = `Name: ${data.name}\r\nEmail: ${data.email}\r\nOrganization: ${data.organization || 'Not provided'}\r\nTopic: ${data.reason}\r\n\r\n${data.message}`;
    emailCopy.href = 'mailto:lumenlabs@gmail.com?subject=' + encodeURIComponent('Website enquiry: ' + data.reason) + '&body=' + encodeURIComponent(body);
    button.disabled = true; button.textContent = 'Saving your enquiry…'; status.className = 'form-status'; status.textContent = ''; emailCopy.hidden = true;
    try {
      const response = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Your enquiry could not be saved. Please try again or email the team directly.');
      status.className = 'form-status success'; status.textContent = `Thank you, ${data.name.trim().split(/\s+/)[0]}. Your enquiry has been saved for the team. Reference: ${result.reference}. For a direct email, send a copy below.`;
      emailCopy.hidden = false; emailCopy.textContent = 'Email a copy to lumenlabs@gmail.com'; form.reset(); pendingId = null;
    } catch (error) {
      status.className = 'form-status error'; status.textContent = error.name === 'TimeoutError' ? 'We could not confirm your enquiry was saved. Retry safely or email it directly below.' : (error.message.includes('JSON') || error instanceof TypeError ? 'Your enquiry could not be saved. Please try again or email it directly below.' : error.message); emailCopy.hidden = false; emailCopy.textContent = 'Send your enquiry by email instead';
    } finally { button.disabled = false; button.textContent = 'Send enquiry'; }
  });
})();
