function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function updateCopyButtonVisibility(divId, buttonId) {
  const div = document.getElementById(divId);
  const btn = document.getElementById(buttonId);
  if (!div || !btn) return;
  // Hide if empty or only whitespace
  btn.style.display = div.textContent.trim() ? '' : 'none';
}

