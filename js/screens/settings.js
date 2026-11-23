// screens/settings.js — Settings.
//   1. Google Sheets: URL y token del Apps Script, probar conexión, sincronizar.
//   2. Height: estatura (se ingresa una vez; se sincroniza a la pestaña settings).
//   3. Backup: exportar / importar todos los datos en un archivo JSON.
//
// La URL y el token se guardan SOLO en el teléfono (nunca en el código ni en el respaldo).

import { h, showToast, parseDecimal } from '../ui.js';
import { getSetting, setSetting, exportAll, importAll } from '../data.js';
import { getSyncConfig, getSyncStatus, syncNow, testConnection } from '../sync.js';
import { todayISO } from '../weeks.js';

export const title = 'Settings';
export const tab = null; // no corresponde a ninguna pestaña inferior

export async function render(container) {
  const redraw = () => { container.replaceChildren(); return render(container); };
  container.append(
    await syncCard(redraw),
    await heightCard(),
    backupCard(redraw),
    aboutCard(),
  );
}

// ---------------------------------------------------------------------
// 1. Google Sheets

async function syncCard(redraw) {
  const { url, token } = await getSyncConfig();
  const status = await getSyncStatus();

  const urlInput = h('input', {
    class: 'text-input', type: 'url', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off',
    spellcheck: 'false', placeholder: 'https://script.google.com/macros/s/…/exec', value: url,
  });
  const tokenInput = h('input', {
    class: 'text-input', type: 'password', autocomplete: 'off', autocapitalize: 'off',
    spellcheck: 'false', placeholder: 'Paste your token', value: token,
  });
  const showToken = h('button', {
    class: 'link-btn small-btn',
    onclick: () => {
      tokenInput.type = tokenInput.type === 'password' ? 'text' : 'password';
      showToken.textContent = tokenInput.type === 'password' ? 'Show' : 'Hide';
    },
  }, 'Show');

  const message = h('p', { class: 'form-message', hidden: true });
  const say = (text, kind) => {
    message.textContent = text;
    message.className = `form-message ${kind}`;
    message.hidden = false;
  };

  async function saveAndTest(event) {
    const button = event.currentTarget;
    const newUrl = urlInput.value.trim();
    const newToken = tokenInput.value.trim();
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(newUrl)) {
      say('The URL must start with https://script.google.com/ and end with /exec.', 'error');
      return;
    }
    if (!newToken) {
      say('Paste the token.', 'error');
      return;
    }
    button.disabled = true;
    say('Testing connection…', 'info');
    try {
      await testConnection(newUrl, newToken);
      await setSetting('sync_url', newUrl);
      await setSetting('sync_token', newToken);
      say('Connected ✓ Saved.', 'ok');
      await syncNow();
      setTimeout(redraw, 1200);
    } catch (err) {
      const text = err instanceof TypeError
        ? 'Could not reach the server. Check your connection and the URL.'
        : err.message;
      say(`Not saved: ${text}`, 'error');
      button.disabled = false;
    }
  }

  async function syncClick(event) {
    event.currentTarget.disabled = true;
    const result = await syncNow();
    const texts = {
      ok: `Synced ${result.sent} change(s) ✓`,
      nothing: 'Everything is already synced ✓',
      offline: 'You are offline. It will sync when you are back online.',
      not_configured: 'Add the URL and token first.',
      error: result.error,
    };
    showToast(texts[result.status]);
    await redraw();
  }

  const statusLine = !status.configured
    ? h('p', { class: 'muted small' }, 'Not connected. Your data is safe on this phone.')
    : h('div', { class: 'sync-status' },
        h('div', {}, h('span', { class: 'muted' }, 'Pending changes: '), h('strong', {}, String(status.pending))),
        h('div', {}, h('span', { class: 'muted' }, 'Last sync: '), h('strong', {}, status.lastSyncAt ?? 'never')),
        status.lastError ? h('p', { class: 'form-message error' }, status.lastError) : null,
      );

  return h('section', { class: 'card' },
    h('h3', { class: 'card-title' }, 'Google Sheets'),
    statusLine,
    h('label', { class: 'date-field' }, h('span', { class: 'measure-label' }, 'Apps Script URL'), urlInput),
    h('label', { class: 'date-field' },
      h('span', { class: 'measure-label label-row' }, 'Token', showToken),
      tokenInput,
    ),
    message,
    h('button', { class: 'btn secondary', onclick: saveAndTest }, 'Save & test connection'),
    status.configured ? h('button', { class: 'btn top-gap', onclick: syncClick }, 'Sync now') : null,
  );
}

// ---------------------------------------------------------------------
// 2. Estatura

async function heightCard() {
  const height = await getSetting('height_cm');
  const input = h('input', {
    class: 'text-input', type: 'text', inputmode: 'decimal', placeholder: '–', value: height ?? '',
  });
  const error = h('p', { class: 'field-error', hidden: true }, 'Enter your height in cm (e.g. 165).');

  async function save() {
    const value = parseDecimal(input.value);
    if (value === null || Number.isNaN(value) || value < 100 || value > 230) {
      error.hidden = false;
      return;
    }
    error.hidden = true;
    await setSetting('height_cm', value, { sync: true });
    showToast('Height saved');
  }

  return h('section', { class: 'card' },
    h('h3', { class: 'card-title' }, 'Height'),
    h('div', { class: 'inline-form' },
      h('span', { class: 'measure-input' }, input, h('span', { class: 'unit-small' }, 'cm')),
      h('button', { class: 'btn small', onclick: save }, 'Save'),
    ),
    error,
  );
}

// ---------------------------------------------------------------------
// 3. Respaldo

function backupCard(redraw) {
  async function exportClick() {
    const backup = await exportAll();
    const text = JSON.stringify(backup, null, 2);
    const fileName = `workoutbody-backup-${todayISO()}.json`;
    const file = new File([text], fileName, { type: 'application/json' });

    // En iPhone: abre el menú Compartir (→ "Guardar en Archivos", AirDrop, Mail…)
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'WorkOutBody backup' });
      } catch (err) {
        if (err.name !== 'AbortError') showToast('Could not share the file');
      }
      return;
    }
    // En computador: descarga normal
    const link = h('a', { href: URL.createObjectURL(file), download: fileName });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true,
    onchange: async () => {
      const file = fileInput.files[0];
      fileInput.value = ''; // permite elegir el mismo archivo otra vez
      if (!file) return;
      try {
        const backup = JSON.parse(await file.text());
        if (!confirm('Replace ALL data on this phone with this backup? This cannot be undone.')) return;
        const counts = await importAll(backup);
        showToast(`Imported ${counts.sessions} workouts and ${counts.measurements} measurements`);
        await redraw();
      } catch (err) {
        showToast(err instanceof SyntaxError ? 'This file is not valid JSON' : err.message);
      }
    },
  });

  return h('section', { class: 'card' },
    h('h3', { class: 'card-title' }, 'Backup'),
    h('p', { class: 'muted small' }, 'A JSON file with all your workouts, measurements and height. The URL and token are not included.'),
    h('div', { class: 'button-row' },
      h('button', { class: 'btn secondary', onclick: exportClick }, 'Export'),
      h('button', { class: 'btn secondary', onclick: () => fileInput.click() }, 'Import'),
    ),
    fileInput,
  );
}

// ---------------------------------------------------------------------
// 4. Información

function aboutCard() {
  return h('section', { class: 'card' },
    h('p', { class: 'muted small' }, 'Offline mode: ',
      h('strong', {}, navigator.serviceWorker?.controller ? 'ready ✓' : 'not yet (reopen the app)'),
    ),
  );
}
