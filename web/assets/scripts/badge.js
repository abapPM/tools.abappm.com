document.getElementById('shield-form').addEventListener('submit', async function (event) {
  event.preventDefault();
  const platform = document.getElementById('platform').value;
  const repo = document.getElementById('repo').value;
  let branch = document.getElementById('branch').value;
  if (branch !== '') {
    branch = '/-' + branch;
  }
  const path = document.getElementById('path').value;
  let constant = document.getElementById('constant').value;
  if (constant !== '') {
    constant = '/' + constant;
  }

  const url = `/${platform}/${repo}${branch}/${path}${constant}`.replace(/#/g, '%23');

  document.getElementById('certificate-result').innerHTML = '';
  document.getElementById('badge-result').innerHTML = '';
  document.getElementById('mailgun-result').innerHTML = '';
  updateCopyButtonVisibility('badge-markdown', 'copy-badge-btn');

  document.getElementById('badge-markdown').innerHTML = 'Loading...';

  try {
    const response = await fetch(url);
    const data = await response.json();

    // const baddgeUrl = `https://img.shields.io/endpoint?url=https://shield.abappm.com${url}`.replace(/%/g, '%25');
    const baddgeUrl = `https://img.shields.io/endpoint?url=https://shield.abappm.com${url}`;
    const escapedUrl = escapeHtml(baddgeUrl);
    document.getElementById('badge-result').innerHTML =
      `<pre>Image:<br/><br/><img src="${escapedUrl}" /></pre>`;
    document.getElementById('badge-markdown').innerHTML =
      `<pre class="markdown-pre">Markdown:<br/><br/><span class="markdown-code">![Version](${escapedUrl})</span></pre><br/>`;
    updateCopyButtonVisibility('badge-markdown', 'copy-badge-btn');
  } catch (error) {
    document.getElementById('badge-result').innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  }

});

