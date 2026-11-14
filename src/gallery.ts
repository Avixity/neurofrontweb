type Photo = {
  title: string;
  caption: string;
  alt: string;
  original: string;
  edit?: string;
};

const photos: Record<string, Photo> = {
  controller: {
    title: 'The enclosure',
    caption: 'The real controller, closed. The headband connects through visible leads.',
    alt: 'The black NeuroFront enclosure with its white wordmark, hinge and visible lead',
    original: '/assets/prototype-4.webp',
    edit: '/assets/prototype-controller-editorial.webp'
  },
  interior: {
    title: 'Under the lid',
    caption: 'Development boards, a rechargeable cell and hand-routed wiring inside the hinged enclosure.',
    alt: 'The open NeuroFront controller showing its battery, red sensor board, ESP32, charging board and connecting wires',
    original: '/assets/prototype-1.webp',
    edit: '/assets/prototype-interior-editorial.webp'
  },
  headband: {
    title: 'At the surface',
    caption: 'A soft fabric band holds the contacts. Visible leads connect it to the separate controller.',
    alt: 'The actual black fabric headband with red and yellow contacts, cable ties, tape and white leads',
    original: '/assets/prototype-2.webp'
  }
};

export function initGallery(onModalChange: (open: boolean) => void) {
  const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
  const image = $<HTMLImageElement>('#archive-image');
  const figure = $('#prototype-photograph');
  const dialog = $<HTMLDialogElement>('#photo-viewer');
  const expand = $<HTMLButtonElement>('#photo-expand');
  const selectors = [...document.querySelectorAll<HTMLButtonElement>('[data-photo]')];
  const modes = [...document.querySelectorAll<HTMLButtonElement>('[data-photo-mode]')];
  const close = $('#close-photo');
  let current = 'controller', mode: 'edit' | 'original' = 'edit', request = 0;
  let priorOverflow = '';

  async function select(key: string, requestedMode = mode) {
    const photo = photos[key];
    if (!photo) return;
    const nextMode = requestedMode === 'edit' && photo.edit ? 'edit' : 'original';
    const source = nextMode === 'edit' ? photo.edit! : photo.original;
    const token = ++request;
    figure.setAttribute('aria-busy', 'true');
    try {
      const next = new Image();
      next.src = source;
      await next.decode();
      if (token !== request) return;
      current = key; mode = nextMode;
      image.src = source;
      image.alt = `${mode === 'edit' ? 'AI-retouched photograph. ' : 'Original photograph. '}${photo.alt}`;
      selectors.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.photo === key)));
      modes.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.photoMode === mode));
        button.disabled = button.dataset.photoMode === 'edit' && !photo.edit;
        button.title = button.disabled ? 'The original photograph is shown for this view' : '';
      });
      $('#photo-index').textContent = `0${Object.keys(photos).indexOf(key) + 1} / 03`;
      $('#photo-title').textContent = photo.title.toUpperCase();
      $('#photo-caption').textContent = photo.caption;
      $<HTMLAnchorElement>('#photo-original-link').href = photo.original;
      $('#photo-retouch-note').textContent = mode === 'edit'
        ? 'AI-assisted lighting and background edits. Original photographs are available for comparison.'
        : 'Original prototype photograph. The physical build, as photographed.';
      expand.setAttribute('aria-label', `Expand photograph: ${photo.title}`);
      figure.dataset.photo = key;
      figure.dataset.mode = mode;
    } catch {
      if (token === request) $('#photo-retouch-note').textContent = 'This photograph could not load. Select the view again to retry, or open the source photo.';
    } finally {
      if (token === request) figure.removeAttribute('aria-busy');
    }
  }

  selectors.forEach(button => button.addEventListener('click', () => void select(button.dataset.photo!, 'edit')));
  modes.forEach(button => button.addEventListener('click', () => void select(current, button.dataset.photoMode as typeof mode)));
  expand.addEventListener('click', () => {
    const photo = photos[current];
    const large = $<HTMLImageElement>('#photo-viewer-image');
    large.src = image.src; large.alt = image.alt;
    $('#photo-viewer-title').textContent = photo.title;
    $('#photo-viewer-version').textContent = mode === 'edit' ? 'AI-ASSISTED STUDIO EDIT' : 'ORIGINAL PHOTOGRAPH';
    $('#photo-viewer-caption').textContent = photo.caption;
    $<HTMLAnchorElement>('#photo-viewer-source').href = photo.original;
    priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal(); onModalChange(true);
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = priorOverflow;
    onModalChange(false);
    expand.focus({ preventScroll: true });
  });
  image.addEventListener('error', () => {
    if (image.getAttribute('src') !== photos[current].original) void select(current, 'original');
  });
}
