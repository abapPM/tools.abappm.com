document.getElementById('mailgun-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const company = document.getElementById('company').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;

  document.getElementById('mailgun-result').innerHTML = '';
  updateCopyButtonVisibility('mailgun-result', 'copy-mailgun-btn');

  const resultDiv = document.getElementById('mailgun-result');
  resultDiv.innerHTML = 'Loading...';

  try {
      const response = await fetch(`/api/v1/mailgun`, {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, company, email, subject, message }),
    });
    const data = await response.json();
    resultDiv.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    updateCopyButtonVisibility('mailgun-result', 'copy-mailgun-btn');
  } catch (error) {
    console.log('error', error);
    resultDiv.innerHTML = `<span class="error">${error.message}</span>`;
  }
});
