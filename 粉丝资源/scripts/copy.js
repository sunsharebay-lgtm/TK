(function setupCopy() {
  async function writeClipboard(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch (_) {
      // A denied clipboard permission can still allow the legacy copy command.
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    try {
      textarea.select();
      return document.execCommand('copy') === true;
    } catch (_) {
      return false;
    } finally {
      textarea.remove();
    }
  }

  document.querySelectorAll('.copy-btn').forEach((button) => {
    const original = button.textContent;
    let resetTimer;
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      const block = button.closest('.template-block');
      const source = button.dataset.copyTarget
        ? document.getElementById(button.dataset.copyTarget)
        : block && block.querySelector('.template-text');
      if (!source || button.disabled) return;

      clearTimeout(resetTimer);
      button.disabled = true;
      const copied = await writeClipboard(source.textContent.trim());
      button.textContent = copied ? '已复制' : '复制失败，请手动复制';
      if (copied) button.classList.add('copied');
      else button.disabled = false;
      resetTimer = setTimeout(() => {
        button.textContent = original;
        button.classList.remove('copied');
        button.disabled = false;
      }, 1600);
    });
  });
}());
