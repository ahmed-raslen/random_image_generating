const state = {
  current: null,
  frameCount: 0,
  classifier: null,
  classifierLoading: false,
  lastPredictions: null
};

const els = {
  image: document.getElementById('photoImage'),
  loading: document.getElementById('photoLoading'),
  frameIndex: document.getElementById('frameIndex'),
  caption: document.getElementById('captionText'),
  regenerateBtn: document.getElementById('regenerateBtn'),
  describeBtn: document.getElementById('describeBtn'),
  infoBtn: document.getElementById('infoBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  statusLine: document.getElementById('statusLine'),
  copyLinkBtn: document.getElementById('copyLinkBtn'),
  infoModal: document.getElementById('infoModal'),
  closeInfoModal: document.getElementById('closeInfoModal'),
  detailAuthor: document.getElementById('detailAuthor'),
  detailId: document.getElementById('detailId'),
  detailDimensions: document.getElementById('detailDimensions'),
  detailSource: document.getElementById('detailSource'),
  describeModal: document.getElementById('describeModal'),
  closeDescribeModal: document.getElementById('closeDescribeModal'),
  describeState: document.getElementById('describeState'),
  describeResult: document.getElementById('describeResult'),
  describeMain: document.getElementById('describeMain'),
  describeList: document.getElementById('describeList')
};

function setStatus(text, duration) {
  els.statusLine.textContent = text;
  if (duration) {
    setTimeout(() => {
      if (els.statusLine.textContent === text) {
        els.statusLine.textContent = '';
      }
    }, duration);
  }
}

function setControlsEnabled(enabled) {
  els.regenerateBtn.disabled = !enabled;
  els.describeBtn.disabled = !enabled;
  els.infoBtn.disabled = !enabled;
  els.downloadBtn.disabled = !enabled;
}

async function fetchRandomEntry() {
  const page = 1 + Math.floor(Math.random() * 30);
  const response = await fetch(`https://picsum.photos/v2/list?page=${page}&limit=100`);
  if (!response.ok) {
    throw new Error('list request failed');
  }
  const list = await response.json();
  const entry = list[Math.floor(Math.random() * list.length)];
  return entry;
}

function buildImageUrl(entry) {
  const width = 900;
  const height = 1125;
  const cacheBust = Date.now();
  return `https://picsum.photos/id/${entry.id}/${width}/${height}?cb=${cacheBust}`;
}

async function loadNewImage() {
  setControlsEnabled(false);
  els.image.classList.remove('loaded');
  els.loading.classList.remove('hidden');
  els.caption.textContent = 'loading frame';
  state.lastPredictions = null;
  setStatus('fetching image data');

  try {
    const entry = await fetchRandomEntry();
    const url = buildImageUrl(entry);

    await new Promise((resolve, reject) => {
      const testImage = new Image();
      testImage.crossOrigin = 'anonymous';
      testImage.onload = resolve;
      testImage.onerror = reject;
      testImage.src = url;
    });

    els.image.src = url;
    els.image.onload = () => {
      els.image.classList.add('loaded');
      els.loading.classList.add('hidden');
      runCaptionOnly();
    };

    state.current = {
      id: entry.id,
      author: entry.author,
      url: url,
      sourcePage: entry.url,
      width: entry.width,
      height: entry.height
    };

    state.frameCount += 1;
    els.frameIndex.textContent = `No. ${String(state.frameCount).padStart(3, '0')}`;
    setStatus('');
  } catch (error) {
    setStatus('could not load image, retrying', 2000);
    setTimeout(loadNewImage, 800);
    return;
  } finally {
    setControlsEnabled(true);
  }
}

function openModal(modal) {
  modal.classList.add('open');
}

function closeModal(modal) {
  modal.classList.remove('open');
}

function showDetails() {
  if (!state.current) return;
  els.detailAuthor.textContent = state.current.author || 'unknown';
  els.detailId.textContent = state.current.id;
  els.detailDimensions.textContent = `${state.current.width} × ${state.current.height}`;
  els.detailSource.textContent = state.current.sourcePage || 'not provided';
  openModal(els.infoModal);
}

async function ensureClassifier() {
  if (state.classifier) return state.classifier;
  if (state.classifierLoading) {
    while (state.classifierLoading) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return state.classifier;
  }
  state.classifierLoading = true;
  try {
    state.classifier = await mobilenet.load({ version: 2, alpha: 1.0 });
    return state.classifier;
  } finally {
    state.classifierLoading = false;
  }
}

function describeFromPredictions(predictions) {
  if (!predictions || predictions.length === 0) {
    return 'no clear subject could be identified in this frame';
  }
  const top = predictions[0];
  const label = top.className.split(',')[0].trim();
  const confidence = Math.round(top.probability * 100);
  let sentence = `this frame most likely shows ${label}`;
  if (confidence < 40) {
    sentence = `this frame may show something resembling ${label}, though the model is not fully confident`;
  } else if (confidence >= 80) {
    sentence = `this frame clearly shows ${label}`;
  }
  return sentence;
}

async function runCaptionOnly() {
  if (!state.current) return;
  els.caption.textContent = 'analyzing frame';
  try {
    const classifier = await ensureClassifier();
    const predictions = await classifier.classify(els.image, 5);
    state.lastPredictions = predictions;
    els.caption.textContent = describeFromPredictions(predictions);
  } catch (error) {
    els.caption.textContent = 'automatic description is unavailable right now';
  }
}

function renderDescribeModal(predictions) {
  els.describeMain.textContent = describeFromPredictions(predictions);
  els.describeList.innerHTML = '';

  predictions.forEach((prediction) => {
    const row = document.createElement('div');
    row.className = 'describe-item';

    const label = document.createElement('span');
    label.className = 'describe-item-label';
    label.textContent = prediction.className.split(',')[0].trim();

    const score = document.createElement('span');
    score.className = 'describe-item-score';
    score.textContent = `${Math.round(prediction.probability * 100)}%`;

    row.appendChild(label);
    row.appendChild(score);
    els.describeList.appendChild(row);
  });
}

async function runDescription() {
  if (!state.current) return;
  openModal(els.describeModal);

  if (state.lastPredictions) {
    els.describeState.style.display = 'none';
    els.describeResult.style.display = 'block';
    renderDescribeModal(state.lastPredictions);
    return;
  }

  els.describeState.style.display = 'flex';
  els.describeResult.style.display = 'none';

  try {
    const classifier = await ensureClassifier();
    const predictions = await classifier.classify(els.image, 5);
    state.lastPredictions = predictions;

    renderDescribeModal(predictions);
    els.caption.textContent = describeFromPredictions(predictions);
    els.describeState.style.display = 'none';
    els.describeResult.style.display = 'block';
  } catch (error) {
    els.describeState.style.display = 'none';
    els.describeResult.style.display = 'block';
    els.describeMain.textContent = 'automatic description is unavailable right now';
    els.describeList.innerHTML = '';
  }
}

async function handleDownload() {
  if (!state.current) return;
  setStatus('preparing download');
  try {
    const response = await fetch(state.current.url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `frame-${state.current.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setStatus('image downloaded', 2500);
  } catch (error) {
    setStatus('could not download image', 3000);
  }
}

async function handleCopyLink() {
  if (!state.current) return;
  try {
    await navigator.clipboard.writeText(state.current.url);
    setStatus('image link copied to clipboard', 3000);
  } catch (error) {
    setStatus('could not copy link', 3000);
  }
}

els.regenerateBtn.addEventListener('click', loadNewImage);
els.describeBtn.addEventListener('click', runDescription);
els.infoBtn.addEventListener('click', showDetails);
els.downloadBtn.addEventListener('click', handleDownload);
els.closeInfoModal.addEventListener('click', () => closeModal(els.infoModal));
els.closeDescribeModal.addEventListener('click', () => closeModal(els.describeModal));
els.copyLinkBtn.addEventListener('click', handleCopyLink);

[els.infoModal, els.describeModal].forEach((modal) => {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal(modal);
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal(els.infoModal);
    closeModal(els.describeModal);
  }
});

loadNewImage();
ensureClassifier();