const form = document.querySelector('#demo-form');
const status = document.querySelector('#form-status');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  const data = Object.fromEntries(new FormData(form));
  if (!data.email || !form.email.checkValidity()) {
    status.textContent = 'Lütfen geçerli bir e-posta adresi girin.';
    status.dataset.state = 'error';
    form.email.focus();
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Gönderiliyor…';
  status.textContent = '';
  try {
    const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    form.reset();
    status.textContent = 'Mesajınız alındı. Size en kısa sürede dönüş yapacağız.';
    status.dataset.state = 'success';
  } catch (error) {
    status.textContent = error.message || 'Bir sorun oluştu. Lütfen tekrar deneyin.';
    status.dataset.state = 'error';
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Mesajı gönder <span>→</span>';
  }
});
