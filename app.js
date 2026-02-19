// ============================================================
//  Isla's Dream Room Designer — app.js
//  Drag, drop, colour, sparkle!
// ============================================================

// --- Element references ---
const room      = document.getElementById('room');
const wall      = document.getElementById('wall');
const floor     = document.getElementById('floor');
const tray      = document.getElementById('tray');
const saveStatus = document.getElementById('save-status');
const slotButtons = document.querySelectorAll('.slot-btn');
const slotEditButtons = document.querySelectorAll('.slot-edit-btn');
const projectTitleText = document.getElementById('project-title-text');
const editProjectNameBtn = document.getElementById('edit-project-name-btn');
const renameDialog = document.getElementById('rename-dialog');
const renameForm = document.getElementById('rename-form');
const renameDialogTitle = document.getElementById('rename-dialog-title');
const renameDialogHelp = document.getElementById('rename-dialog-help');
const renameInput = document.getElementById('rename-input');
const renameCancelBtn = document.getElementById('rename-cancel-btn');
const renameSaveBtn = document.getElementById('rename-save-btn');

const btnSparkle = document.getElementById('btn-sparkle');
const btnUndo    = document.getElementById('btn-undo');
const btnClear   = document.getElementById('btn-clear');

const wallSwatches  = document.querySelectorAll('#wall-colours .swatch');
const floorSwatches = document.querySelectorAll('#floor-colours .swatch');
const LEGACY_STORAGE_KEY = 'isla_dream_room_state_v1';
const PROJECT_NAME_KEY = 'isla_project_name_v1';
const STORAGE_KEY_PREFIX = 'isla_dream_room_state_slot_v1_';
const ACTIVE_SLOT_KEY = 'isla_dream_room_active_slot_v1';
const DEFAULT_PROJECT_NAME = "Isla's Dream Room";
const DEFAULT_WALL_COLOR = '#A8D8EA';
const DEFAULT_FLOOR_COLOR = '#D2A679';
const MAX_SLOTS = 3;
const MIN_ITEM_SIZE = 26;
const MAX_ITEM_SIZE = 84;
const PICTURE_EMOJI = '🖼️';
const MIN_VISIBLE_PICTURE_PX = 18;

// --- State ---
let placedItems = [];   // keeps track of every item in the room (for undo)
let activePlacedItem = null;
let placedItemTopZ = 20;
let activeSlot = 1;
let renameDialogSaveHandler = null;

function applyProjectName(name) {
  if (!projectTitleText) return;
  projectTitleText.textContent = name || DEFAULT_PROJECT_NAME;
}

function getProjectName() {
  const stored = localStorage.getItem(PROJECT_NAME_KEY);
  const trimmed = typeof stored === 'string' ? stored.trim() : '';
  return trimmed || DEFAULT_PROJECT_NAME;
}

function loadProjectName() {
  applyProjectName(getProjectName());
}

function saveProjectName(value) {
  const trimmed = (value || '').trim().slice(0, 30);
  if (!trimmed || trimmed === DEFAULT_PROJECT_NAME) {
    localStorage.removeItem(PROJECT_NAME_KEY);
    applyProjectName(DEFAULT_PROJECT_NAME);
    setSaveStatus('Project name reset');
    return;
  }
  localStorage.setItem(PROJECT_NAME_KEY, trimmed);
  applyProjectName(trimmed);
  setSaveStatus('Project name updated');
}

function closeRenameDialog() {
  if (!renameDialog) return;
  renameDialog.classList.remove('show');
  renameDialog.setAttribute('aria-hidden', 'true');
  renameDialogSaveHandler = null;
}

function openRenameDialog(config) {
  if (!renameDialog || !renameInput || !renameDialogTitle || !renameDialogHelp || !renameSaveBtn) return;

  renameDialogTitle.textContent = config.title;
  renameDialogHelp.textContent = config.help;
  renameInput.value = (config.initialValue || '').slice(0, 30);
  renameInput.placeholder = config.placeholder || '';
  renameSaveBtn.textContent = config.saveText || 'Save';
  renameDialogSaveHandler = config.onSave;

  renameDialog.classList.add('show');
  renameDialog.setAttribute('aria-hidden', 'false');

  requestAnimationFrame(() => {
    renameInput.focus();
    renameInput.select();
  });
}

function setupRenameDialog() {
  if (!renameForm || !renameInput || !renameCancelBtn || !renameDialog) return;

  renameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = renameInput.value.trim().slice(0, 30);
    if (renameDialogSaveHandler) {
      renameDialogSaveHandler(value);
    }
    closeRenameDialog();
  });

  renameCancelBtn.addEventListener('click', () => {
    closeRenameDialog();
  });

  renameDialog.addEventListener('click', (e) => {
    if (e.target === renameDialog) {
      closeRenameDialog();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && renameDialog.classList.contains('show')) {
      closeRenameDialog();
    }
  });
}

function getStorageKeyForSlot(slot) {
  return `${STORAGE_KEY_PREFIX}${slot}`;
}

function getSlotData(slot) {
  try {
    const raw = localStorage.getItem(getStorageKeyForSlot(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    return null;
  }
}

function getDefaultSlotLabel(slot) {
  return `Room ${slot}`;
}

function getCustomSlotName(slot) {
  const data = getSlotData(slot);
  const value = typeof data?.roomName === 'string' ? data.roomName.trim() : '';
  return value.slice(0, 30);
}

function getStoredSlotLabel(slot) {
  const value = getCustomSlotName(slot);
  return value || getDefaultSlotLabel(slot);
}

function refreshSlotLabels() {
  slotButtons.forEach((button) => {
    const slot = Number(button.dataset.slot);
    button.textContent = getStoredSlotLabel(slot);
  });
}

function getActiveSlotLabel() {
  const activeButton = Array.from(slotButtons).find((button) => Number(button.dataset.slot) === activeSlot);
  return activeButton?.textContent?.trim() || getDefaultSlotLabel(activeSlot);
}

function renameSlot(slot) {
  const defaultLabel = getDefaultSlotLabel(slot);
  const currentName = getCustomSlotName(slot);

  openRenameDialog({
    title: `Rename ${defaultLabel}`,
    help: 'Pick a fun name. Leave blank to reset.',
    initialValue: currentName || defaultLabel,
    placeholder: defaultLabel,
    saveText: 'Save Name',
    onSave: (trimmed) => {
      const data = getSlotData(slot) || {
        slot,
        roomName: '',
        wallColor: DEFAULT_WALL_COLOR,
        floorColor: DEFAULT_FLOOR_COLOR,
        items: [],
        savedAt: Date.now(),
      };

      data.roomName = trimmed && trimmed !== defaultLabel ? trimmed : '';
      data.savedAt = Date.now();

      try {
        localStorage.setItem(getStorageKeyForSlot(slot), JSON.stringify(data));
        refreshSlotLabels();
        if (slot === activeSlot) {
          setSaveStatus(`Saved ${getActiveSlotLabel()}`);
        }
      } catch (error) {
        setSaveStatus('Could not rename this room');
      }
    }
  });
}

function setActiveSlotUI() {
  slotButtons.forEach((button) => {
    const slot = Number(button.dataset.slot);
    button.classList.toggle('active', slot === activeSlot);
  });
}

function clearPlacedItems() {
  clearActivePlacedItem();
  placedItems.forEach((item) => item.remove());
  placedItems = [];
}

function applyDefaultRoomLook() {
  wall.style.background = DEFAULT_WALL_COLOR;
  setActiveSwatch(wallSwatches, DEFAULT_WALL_COLOR);

  floor.style.backgroundImage = `
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 60px,
      rgba(0,0,0,0.04) 60px,
      rgba(0,0,0,0.04) 62px
    )`;
  floor.style.backgroundColor = DEFAULT_FLOOR_COLOR;
  setActiveSwatch(floorSwatches, DEFAULT_FLOOR_COLOR);
}

function switchToSlot(nextSlot) {
  if (nextSlot === activeSlot) return;
  saveRoomState();
  activeSlot = nextSlot;
  localStorage.setItem(ACTIVE_SLOT_KEY, String(activeSlot));
  setActiveSlotUI();
  loadRoomState();
  showToast(`Now editing ${getActiveSlotLabel()} ✨`);
}

function setupSlots() {
  const slotOneKey = getStorageKeyForSlot(1);
  if (!localStorage.getItem(slotOneKey)) {
    const legacySave = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySave) {
      localStorage.setItem(slotOneKey, legacySave);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  const storedSlot = Number(localStorage.getItem(ACTIVE_SLOT_KEY));
  if (storedSlot >= 1 && storedSlot <= MAX_SLOTS) {
    activeSlot = storedSlot;
  }

  refreshSlotLabels();
  setActiveSlotUI();

  slotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextSlot = Number(button.dataset.slot);
      if (nextSlot < 1 || nextSlot > MAX_SLOTS) return;
      switchToSlot(nextSlot);
    });
  });

  slotEditButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const slot = Number(button.dataset.slot);
      if (slot < 1 || slot > MAX_SLOTS) return;
      renameSlot(slot);
    });
  });

  if (editProjectNameBtn) {
    editProjectNameBtn.addEventListener('click', () => {
      const currentName = getProjectName();
      openRenameDialog({
        title: 'Rename your project',
        help: 'This changes the big title at the top.',
        initialValue: currentName,
        placeholder: DEFAULT_PROJECT_NAME,
        saveText: 'Save Title',
        onSave: (value) => {
          saveProjectName(value);
          showToast('Project title updated ✨');
        }
      });
    });
  }
}

function setActivePlacedItem(el) {
  if (!el) return;
  if (activePlacedItem && activePlacedItem !== el) {
    activePlacedItem.classList.remove('is-active');
  }
  activePlacedItem = el;
  activePlacedItem.classList.add('is-active');
  placedItemTopZ += 1;
  activePlacedItem.style.zIndex = String(placedItemTopZ);
}

function clearActivePlacedItem() {
  if (!activePlacedItem) return;
  activePlacedItem.classList.remove('is-active');
  activePlacedItem = null;
}

function setSaveStatus(message) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
}

let toastTimeoutId;

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <img class="toast-mascot" src="toast-mascot.svg" alt="Toast mascot" draggable="false">
      <div class="toast-bubble">
        <span class="toast-text"></span>
      </div>
    `;
    document.body.appendChild(toast);
  }

  const textEl = toast.querySelector('.toast-text');
  if (textEl) {
    textEl.textContent = message;
  }

  // Re-trigger animation by removing and re-adding the class
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function getPlacedEmoji(el) {
  return el.dataset.emoji || (el.childNodes[0] && el.childNodes[0].nodeValue ? el.childNodes[0].nodeValue : '');
}

function normalizeEmoji(value) {
  return String(value || '').replace(/\uFE0F/g, '');
}

function isPictureItem(el) {
  return normalizeEmoji(getPlacedEmoji(el)) === normalizeEmoji(PICTURE_EMOJI);
}

function clampItemPositionInsideRoom(el, left, top) {
  const itemWidth = el.offsetWidth || parseFloat(getComputedStyle(el).fontSize) || 40;
  const itemHeight = el.offsetHeight || parseFloat(getComputedStyle(el).fontSize) || 40;
  const maxLeft = Math.max(0, room.clientWidth - itemWidth);
  const maxTop = Math.max(0, room.clientHeight - itemHeight);

  return {
    left: Math.max(0, Math.min(left, maxLeft)),
    top: Math.max(0, Math.min(top, maxTop)),
  };
}

function clampPicturePositionNearRoom(el, left, top) {
  const itemWidth = el.offsetWidth || parseFloat(getComputedStyle(el).fontSize) || 40;
  const itemHeight = el.offsetHeight || parseFloat(getComputedStyle(el).fontSize) || 40;

  const minLeft = -itemWidth + MIN_VISIBLE_PICTURE_PX;
  const maxLeft = room.clientWidth - MIN_VISIBLE_PICTURE_PX;
  const minTop = -itemHeight + MIN_VISIBLE_PICTURE_PX;
  const maxTop = room.clientHeight - MIN_VISIBLE_PICTURE_PX;

  return {
    left: Math.max(minLeft, Math.min(left, maxLeft)),
    top: Math.max(minTop, Math.min(top, maxTop)),
  };
}

function saveRoomState() {
  const items = placedItems.map((el) => ({
    emoji: getPlacedEmoji(el),
    left: parseInt(el.style.left, 10) || 0,
    top: parseInt(el.style.top, 10) || 0,
    size: parseFloat(el.dataset.size || getComputedStyle(el).fontSize) || 40,
  }));

  const data = {
    slot: activeSlot,
    roomName: getCustomSlotName(activeSlot),
    wallColor: wall.style.background || DEFAULT_WALL_COLOR,
    floorColor: floor.style.backgroundColor || floor.style.background || DEFAULT_FLOOR_COLOR,
    items,
    savedAt: Date.now(),
  };

  try {
    localStorage.setItem(getStorageKeyForSlot(activeSlot), JSON.stringify(data));
    refreshSlotLabels();
    setSaveStatus(`Saved ${getActiveSlotLabel()}`);
  } catch (error) {
    setSaveStatus('Could not save on this browser');
  }
}

function setActiveSwatch(swatches, colorValue) {
  swatches.forEach((swatch) => {
    const isMatch = swatch.dataset.colour.toLowerCase() === String(colorValue).toLowerCase();
    swatch.classList.toggle('active', isMatch);
  });
}

function loadRoomState() {
  clearPlacedItems();
  applyDefaultRoomLook();

  try {
    const raw = localStorage.getItem(getStorageKeyForSlot(activeSlot));
    if (!raw) {
      setSaveStatus(`${getActiveSlotLabel()} is empty`);
      return;
    }

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return;

    if (data.wallColor) {
      wall.style.background = data.wallColor;
      setActiveSwatch(wallSwatches, data.wallColor);
    }

    if (data.floorColor) {
      floor.style.backgroundImage = `
        repeating-linear-gradient(
          90deg,
          transparent,
          transparent 60px,
          rgba(0,0,0,0.04) 60px,
          rgba(0,0,0,0.04) 62px
        )`;
      floor.style.backgroundColor = data.floorColor;
      setActiveSwatch(floorSwatches, data.floorColor);
    }

    if (Array.isArray(data.items)) {
      data.items.forEach((item) => {
        if (!item || !item.emoji) return;
        placeItem(item.emoji, item.left + 20, item.top + 20, {
          skipSave: true,
          skipAnimation: true,
          size: item.size,
        });
      });
    }

    refreshSlotLabels();
    setSaveStatus(`Loaded ${getActiveSlotLabel()}`);
  } catch (error) {
    setSaveStatus('Could not load saved room');
  }
}

// ============================================================
//  2) WALL & FLOOR COLOUR SWATCHES
// ============================================================
function setupSwatches(swatches, target) {
  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      // Remove active class from siblings
      swatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const colour = swatch.dataset.colour;
      target.style.background = colour;

      // Re-apply floor lines if it's the floor
      if (target === floor) {
        target.style.backgroundImage = `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 60px,
            rgba(0,0,0,0.04) 60px,
            rgba(0,0,0,0.04) 62px
          )`;
        target.style.backgroundColor = colour;
      }

      saveRoomState();
    });
  });
}

setupSwatches(wallSwatches, wall);
setupSwatches(floorSwatches, floor);

// ============================================================
//  3) DRAG & DROP — from tray into the room
// ============================================================

// --- Desktop: HTML5 Drag & Drop ---
tray.addEventListener('dragstart', (e) => {
  const item = e.target.closest('.tray-item');
  if (!item) return;
  e.dataTransfer.setData('text/plain', item.dataset.emoji);
  e.dataTransfer.effectAllowed = 'copy';
});

room.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  room.classList.add('drop-hover');
});

room.addEventListener('dragleave', () => {
  room.classList.remove('drop-hover');
});

room.addEventListener('drop', (e) => {
  e.preventDefault();
  room.classList.remove('drop-hover');

  const emoji = e.dataTransfer.getData('text/plain');
  if (!emoji) return;

  const rect = room.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  placeItem(emoji, x, y);
});

// --- Touch: for phones & tablets ---
let touchDragEmoji = null;
let touchGhost = null;
let isDraggingFromTray = false;

tray.addEventListener('touchstart', (e) => {
  const item = e.target.closest('.tray-item');
  if (!item) return;

  e.preventDefault();

  touchDragEmoji = item.dataset.emoji;
  isDraggingFromTray = true;

  // Create a floating ghost element that follows finger
  touchGhost = document.createElement('div');
  touchGhost.textContent = touchDragEmoji;
  touchGhost.style.cssText = `
    position: fixed;
    font-size: 2.5rem;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.8;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
  `;
  document.body.appendChild(touchGhost);

  const touch = e.touches[0];
  touchGhost.style.left = touch.clientX + 'px';
  touchGhost.style.top  = touch.clientY + 'px';
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (isDraggingFromTray) {
    e.preventDefault();
  }

  if (!touchGhost) return;
  const touch = e.touches[0];
  touchGhost.style.left = touch.clientX + 'px';
  touchGhost.style.top  = touch.clientY + 'px';

  // Highlight room if finger is over it
  const rect = room.getBoundingClientRect();
  const over = touch.clientX >= rect.left && touch.clientX <= rect.right &&
               touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
  room.classList.toggle('drop-hover', over);
}, { passive: false });

document.addEventListener('touchend', (e) => {
  isDraggingFromTray = false;

  if (!touchGhost) return;

  // Remove ghost
  touchGhost.remove();
  touchGhost = null;
  room.classList.remove('drop-hover');

  if (!touchDragEmoji) return;

  // Check if last known touch position was over the room
  const touch = e.changedTouches[0];
  const rect = room.getBoundingClientRect();

  if (touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top  && touch.clientY <= rect.bottom) {
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    placeItem(touchDragEmoji, x, y);
  }

  touchDragEmoji = null;
});

// ============================================================
//  4) PLACE AN ITEM IN THE ROOM
// ============================================================
function placeItem(emoji, x, y, options = {}) {
  const { skipSave = false, skipAnimation = false, size } = options;
  const el = document.createElement('div');
  el.classList.add('placed-item');
  el.dataset.emoji = emoji;
  const appliedSize = Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, Number(size) || 40));
  el.dataset.size = String(appliedSize);
  el.style.fontSize = `${appliedSize}px`;
  el.textContent = emoji;
  el.style.left = (x - 20) + 'px';
  el.style.top  = (y - 20) + 'px';

  const resizeHandle = document.createElement('button');
  resizeHandle.classList.add('resize-handle');
  resizeHandle.type = 'button';
  resizeHandle.setAttribute('aria-label', 'Resize item');
  resizeHandle.textContent = '↔';
  el.appendChild(resizeHandle);

  // Add a little X button to remove
  const removeBtn = document.createElement('button');
  removeBtn.classList.add('remove-btn');
  removeBtn.type = 'button';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removePlacedItem(el);
    saveRoomState();
  });
  el.appendChild(removeBtn);

  // Make placed items draggable within the room
  makeMovable(el);

  room.appendChild(el);
  placedItems.push(el);
  if (!skipSave) saveRoomState();

  // Little bounce animation on place
  if (!skipAnimation) {
    el.animate([
      { transform: 'scale(0.3)', opacity: 0 },
      { transform: 'scale(1.2)', opacity: 1 },
      { transform: 'scale(1)', opacity: 1 }
    ], { duration: 350, easing: 'ease-out' });
  }
}

function removePlacedItem(el) {
  if (activePlacedItem === el) {
    clearActivePlacedItem();
  }
  el.remove();
  placedItems = placedItems.filter((item) => item !== el);
}

function setPlacedItemSize(el, nextSize, skipSave = false) {
  const clamped = Math.max(MIN_ITEM_SIZE, Math.min(MAX_ITEM_SIZE, Number(nextSize) || 40));
  el.dataset.size = String(clamped);
  el.style.fontSize = `${clamped}px`;
  if (!skipSave) saveRoomState();
}

function getTouchDistance(touchA, touchB) {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.hypot(dx, dy);
}

function showDeleteZoneCue() {
  document.body.classList.add('show-delete-zone');
}

function hideDeleteZoneCue() {
  document.body.classList.remove('show-delete-zone');
  document.body.classList.remove('delete-zone-active');
}

function updateDeleteZoneCue(el) {
  const willDelete = isDroppedOutsideRoom(el);
  document.body.classList.toggle('delete-zone-active', willDelete);
}

function isDroppedOutsideRoom(el) {
  const roomRect = room.getBoundingClientRect();
  const itemRect = el.getBoundingClientRect();
  const centerX = itemRect.left + itemRect.width / 2;
  const centerY = itemRect.top + itemRect.height / 2;

  return (
    centerX < roomRect.left ||
    centerX > roomRect.right ||
    centerY < roomRect.top ||
    centerY > roomRect.bottom
  );
}

function removeIfDroppedOutsideRoom(el) {
  if (isPictureItem(el)) return false;
  if (!isDroppedOutsideRoom(el)) return false;
  removePlacedItem(el);
  saveRoomState();
  showToast('Poof! Deleted ✨');
  return true;
}

// ============================================================
//  5) MOVE PLACED ITEMS WITHIN THE ROOM
// ============================================================
function makeMovable(el) {
  let startX, startY, origLeft, origTop;
  let resizeStartX, resizeStartY, resizeStartSize;

  const resizeHandle = el.querySelector('.resize-handle');

  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setActivePlacedItem(el);
      el.classList.add('resizing');

      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartSize = parseFloat(el.dataset.size || getComputedStyle(el).fontSize) || 40;

      function onResizeMove(ev) {
        const dx = ev.clientX - resizeStartX;
        const dy = ev.clientY - resizeStartY;
        const nextSize = resizeStartSize + Math.max(dx, dy) * 0.6;
        setPlacedItemSize(el, nextSize, true);
      }

      function onResizeUp() {
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', onResizeUp);
        el.classList.remove('resizing');
        saveRoomState();
      }

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
    });
  }

  el.addEventListener('mouseenter', () => {
    setActivePlacedItem(el);
  });

  // Mouse move
  el.addEventListener('mousedown', (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.remove-btn')) return;
    e.preventDefault();
    setActivePlacedItem(el);
    el.classList.add('dragging');
    startX = e.clientX;
    startY = e.clientY;
    origLeft = parseInt(el.style.left);
    origTop  = parseInt(el.style.top);

    function onMove(ev) {
      const nextLeft = origLeft + ev.clientX - startX;
      const nextTop = origTop + ev.clientY - startY;
      const clamped = clampPicturePositionNearRoom(el, nextLeft, nextTop);
      el.style.left = `${clamped.left}px`;
      el.style.top = `${clamped.top}px`;
    }

    function onUp() {
      el.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      saveRoomState();
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Touch move (for items already placed)
  el.addEventListener('touchstart', (e) => {
    if (e.target.closest('.resize-handle') || e.target.closest('.remove-btn')) return;
    setActivePlacedItem(el);

    if (e.touches.length === 2) {
      e.preventDefault();
      el.classList.add('resizing');

      const pinchStartDistance = getTouchDistance(e.touches[0], e.touches[1]);
      if (!pinchStartDistance) {
        el.classList.remove('resizing');
        return;
      }
      const pinchStartSize = parseFloat(el.dataset.size || getComputedStyle(el).fontSize) || 40;

      function onPinchMove(ev) {
        if (ev.touches.length < 2) return;
        ev.preventDefault();
        const distance = getTouchDistance(ev.touches[0], ev.touches[1]);
        const nextSize = pinchStartSize * (distance / pinchStartDistance);
        setPlacedItemSize(el, nextSize, true);
      }

      function onPinchEnd(ev) {
        if (ev.touches.length >= 2) return;
        document.removeEventListener('touchmove', onPinchMove);
        document.removeEventListener('touchend', onPinchEnd);
        document.removeEventListener('touchcancel', onPinchEnd);
        el.classList.remove('resizing');
        saveRoomState();
      }

      document.addEventListener('touchmove', onPinchMove, { passive: false });
      document.addEventListener('touchend', onPinchEnd);
      document.addEventListener('touchcancel', onPinchEnd);
      return;
    }

    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    el.classList.add('dragging');

    startX = touch.clientX;
    startY = touch.clientY;
    origLeft = parseInt(el.style.left);
    origTop  = parseInt(el.style.top);

    function onTouchMove(ev) {
      ev.preventDefault();  // prevent scroll
      const t = ev.touches[0];
      const nextLeft = origLeft + t.clientX - startX;
      const nextTop = origTop + t.clientY - startY;
      const clamped = clampPicturePositionNearRoom(el, nextLeft, nextTop);
      el.style.left = `${clamped.left}px`;
      el.style.top = `${clamped.top}px`;
    }

    function onTouchEnd() {
      el.classList.remove('dragging');
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      saveRoomState();
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });
}

room.addEventListener('mouseleave', () => {
  clearActivePlacedItem();
});

// ============================================================
//  6) SPARKLE BUTTON ✨
// ============================================================
btnSparkle.addEventListener('click', () => {
  const sparkleEmojis = ['✨', '⭐', '💖', '🌟', '💫', '🦋', '🎀'];
  const rect = room.getBoundingClientRect();

  for (let i = 0; i < 18; i++) {
    const spark = document.createElement('div');
    spark.classList.add('sparkle');
    spark.textContent = sparkleEmojis[Math.floor(Math.random() * sparkleEmojis.length)];

    // Random position within the room
    spark.style.left = Math.random() * (rect.width - 30) + 'px';
    spark.style.top  = Math.random() * (rect.height - 30) + 'px';

    room.appendChild(spark);

    // Staggered start
    spark.style.animationDelay = (Math.random() * 0.5) + 's';

    // Clean up after animation
    setTimeout(() => spark.remove(), 1500);
  }

  // Button wiggle
  btnSparkle.animate([
    { transform: 'rotate(-5deg) scale(1.1)' },
    { transform: 'rotate(5deg) scale(1.1)' },
    { transform: 'rotate(-3deg) scale(1.05)' },
    { transform: 'rotate(0) scale(1)' },
  ], { duration: 400, easing: 'ease-out' });
});

// ============================================================
//  7) UNDO BUTTON (remove last placed item)
// ============================================================
btnUndo.addEventListener('click', () => {
  if (placedItems.length === 0) {
    // Shake the button to say "nothing to undo!"
    btnUndo.animate([
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 300 });
    return;
  }

  const last = placedItems.pop();
  // Animate out
  last.animate([
    { transform: 'scale(1)', opacity: 1 },
    { transform: 'scale(0)', opacity: 0 }
  ], { duration: 250, easing: 'ease-in' }).onfinish = () => {
    last.remove();
    saveRoomState();
  };
});

// ============================================================
//  8) CLEAR ROOM BUTTON
// ============================================================
btnClear.addEventListener('click', () => {
  if (placedItems.length === 0) return;

  // Animate all items out
  placedItems.forEach((item, i) => {
    item.animate([
      { transform: 'scale(1) rotate(0)', opacity: 1 },
      { transform: 'scale(0) rotate(90deg)', opacity: 0 }
    ], { duration: 350, delay: i * 30, easing: 'ease-in' })
    .onfinish = () => item.remove();
  });

  placedItems = [];
  saveRoomState();
});

// ============================================================
//  9) PREVENT DEFAULT DRAG BEHAVIOUR FOR IMAGES (emoji)
// ============================================================
document.addEventListener('dragover', (e) => {
  // Only allow drop on the room
  if (!room.contains(e.target) && e.target !== room) {
    e.dataTransfer.dropEffect = 'none';
  }
});

loadProjectName();
setupRenameDialog();
setupSlots();
loadRoomState();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
