document.getElementById('certificate-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const domain = document.getElementById('domain').value;

  document.getElementById('badge-result').innerHTML = '';
  document.getElementById('badge-markdown').innerHTML = '';
  document.getElementById('mailgun-result').innerHTML = '';
  updateCopyButtonVisibility('certificate-result', 'copy-cert-btn');

  const resultDiv = document.getElementById('certificate-result');
  resultDiv.innerHTML = 'Loading...';

  try {
    const response = await fetch(`/api/v1/certificates?domain=${domain}`);
    const data = await response.json();
    resultDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    updateCopyButtonVisibility('certificate-result', 'copy-cert-btn');
  } catch (error) {
    resultDiv.innerHTML = `<span class="error">${error.message}</span>`;
  }
});

