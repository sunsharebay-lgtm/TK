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

    const focused = document.activeElement;
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
      if (focused && typeof focused.focus === 'function') focused.focus({ preventScroll: true });
    }
  }

  document.querySelectorAll('.copy-btn').forEach((button, index) => {
    const original = button.textContent;
    let resetTimer;
    let copying = false;
    const status = document.createElement('p');
    status.className = 'copy-status';
    status.id = `copy-status-${index}`;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
    const container = button.closest('.template-block') || button.closest('.readout') || button.parentElement;
    container.appendChild(status);
    const description = button.getAttribute('aria-describedby');
    button.setAttribute('aria-describedby', [description, status.id].filter(Boolean).join(' '));
    button.addEventListener('click', async () => {
      if (copying || button.disabled) return;
      const block = button.closest('.template-block');
      const source = button.dataset.copyTarget
        ? document.getElementById(button.dataset.copyTarget)
        : block && block.querySelector('.template-text');
      const value = source && source.textContent.trim();
      if (!value) {
        status.textContent = '没有可复制的内容，请查看本页资料。';
        return;
      }

      clearTimeout(resetTimer);
      copying = true;
      button.setAttribute('aria-disabled', 'true');
      button.classList.remove('copied');
      status.textContent = '正在复制…';
      let copied = false;
      try { copied = await writeClipboard(value); }
      catch (_) { /* Keep the retry path usable even if the browser rejects DOM access. */ }
      finally { copying = false; button.setAttribute('aria-disabled', 'false'); }
      button.textContent = copied ? '已复制' : '复制失败';
      status.textContent = copied ? '已复制，可粘贴使用。' : '复制失败，请选择上方文字手动复制，或再次尝试。';
      if (copied) button.classList.add('copied');
      resetTimer = setTimeout(() => {
        button.textContent = original;
        button.classList.remove('copied');
      }, 1600);
    });
  });
}());
