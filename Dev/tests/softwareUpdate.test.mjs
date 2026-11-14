import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { appUpdateService, SOFTWARE_RELEASE_LABEL } from '../src/services/appUpdateService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEV_SRC_ROOT = path.resolve(__dirname, '../src');

test('appUpdateService tracks release label and update notification subscribers cleanly', () => {
  assert.equal(SOFTWARE_RELEASE_LABEL, 'Ver 1.02');
  assert.equal(appUpdateService.getReleaseLabel(), 'Ver 1.02');

  const events = [];
  const unsubscribe = appUpdateService.subscribe((info) => events.push(info));
  try {
    appUpdateService.triggerUpdate({ version: 'v1.03', title: 'Update Test' });
    const current = appUpdateService.getUpdateInfo();
    assert.ok(current);
    assert.equal(current.version, 'v1.03');
    assert.equal(current.title, 'Update Test');

    appUpdateService.dismissUpdate();
    assert.equal(appUpdateService.getUpdateInfo(), null);
    assert.equal(events.at(-1), null);
  } finally {
    unsubscribe();
    appUpdateService.dismissUpdate();
  }
});

test('appUpdateService.checkForUpdates(true) detects waiting Service Worker when checking manually', async () => {
  const prevWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const prevNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const prevFetch = globalThis.fetch;

  const mockWaitingWorker = { postMessage() {} };
  try {
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          getRegistration: async () => ({
            waiting: mockWaitingWorker,
            update: async () => {},
          }),
          getRegistrations: async () => [{ waiting: mockWaitingWorker, update: async () => {} }],
        },
      },
      configurable: true,
      writable: true,
    });
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ version: '1799999999999', builtAt: '2026-11-14T04:00:00Z' }),
    });

    const hasWaiting = await appUpdateService.hasWaitingServiceWorker();
    assert.equal(hasWaiting, true);

    const detected = await appUpdateService.checkForUpdates(true);
    assert.equal(detected, true);
    assert.ok(appUpdateService.getUpdateInfo());
  } finally {
    appUpdateService.dismissUpdate();
    if (prevWindow) Object.defineProperty(globalThis, 'window', prevWindow);
    else delete globalThis.window;
    if (prevNavigator) Object.defineProperty(globalThis, 'navigator', prevNavigator);
    else delete globalThis.navigator;
    globalThis.fetch = prevFetch;
  }
});

test('Software Update tab uses checking default state, Sparkles-free badge, inline Mechanism, and Zero Flexbox', () => {
  const appSrc = fs.readFileSync(path.join(DEV_SRC_ROOT, 'App.tsx'), 'utf8');
  const pageSrc = fs.readFileSync(path.join(DEV_SRC_ROOT, 'pages/SoftwareUpdate.tsx'), 'utf8');
  const mechSrc = fs.readFileSync(
    path.join(DEV_SRC_ROOT, 'components/layouts/SidebarMechanismModal.tsx'),
    'utf8'
  );
  const popupStackSrc = fs.readFileSync(
    path.join(DEV_SRC_ROOT, 'components/features/notifications/NotificationPopupStack.tsx'),
    'utf8'
  );
  const sidebarSrc = fs.readFileSync(path.join(DEV_SRC_ROOT, 'components/layouts/Sidebar.tsx'), 'utf8');

  // 1. Route registered & Software Update UX matches feedback
  assert.equal(appSrc.includes('path="software-update"'), true);
  assert.equal(pageSrc.includes('Software Update'), true);
  assert.equal(pageSrc.includes("useState<UpdateStatusPhase>('checking')"), true);
  assert.equal(pageSrc.includes('Checking for update...'), true);
  assert.equal(pageSrc.includes('Update now'), true);
  assert.equal(pageSrc.includes('Sparkles'), false, 'Sparkles icon must be removed from Update pill');
  assert.equal(pageSrc.includes('SidebarMechanismModal'), true);
  assert.match(pageSrc, /<SidebarMechanismModal[\s\S]*\binline\b/, 'Mechanism guide must render inline without popup');
  assert.equal(pageSrc.includes('SOFTWARE_UPDATE_NOTES_VI'), true);
  assert.equal(pageSrc.includes('SOFTWARE_UPDATE_NOTES_EN'), true);
  assert.equal(pageSrc.includes('Light Mode & Giao diện mới'), true);
  assert.equal(pageSrc.includes('Smart UX/UI'), true);
  assert.equal(pageSrc.includes('Software Update & Cơ chế'), true);
  assert.equal(pageSrc.includes('Hồ sơ & Thông báo nâng cấp'), true);
  assert.equal(pageSrc.includes('Tinh chỉnh UX/UI các tab'), true);
  assert.equal(/\b(?:inline-)?flex\b/.test(pageSrc), false, 'SoftwareUpdate.tsx must be Zero Flexbox');

  // 2. SidebarMechanismModal supports inline mode cleanly without popup overlay when inline=true
  assert.equal(/\binline\s*=/.test(mechSrc), true);
  assert.equal(/\b(?:inline-)?flex\b/.test(mechSrc), false, 'SidebarMechanismModal.tsx must be Zero Flexbox');

  // 3. External forcing popup removed from NotificationPopupStack
  assert.equal(popupStackSrc.includes('APP UPDATE NOTIFICATION POPUP'), false);
  assert.equal(popupStackSrc.includes('Tải lại ngay'), false);

  // 4. Read me / Cơ chế moved out of Sidebar footer, Software Update menu item added to Sidebar
  assert.equal(sidebarSrc.includes('Read me / Cơ chế'), false);
  assert.equal(sidebarSrc.includes("navigate('/software-update')"), true);
});

test('All Dashboard modal popups portal to document.body at topmost z-layer above Sidebar with Liquid Glass Light Mode', () => {
  const indexCss = fs.readFileSync(path.join(DEV_SRC_ROOT, 'index.css'), 'utf8');
  assert.equal(indexCss.includes('.modal-liquid-glass'), true);
  assert.equal(indexCss.includes('[data-modal-surface="true"]'), true);

  const modalFiles = [
    { file: 'components/common/Modal.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'components/common/CropModal.tsx', zLayer: 'z-[10100]', zeroFlex: true },
    { file: 'components/features/profile/EditProfileModal.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'components/features/profile/TrashModal.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'components/features/profile/ReportHistoryModal.tsx', zLayer: 'z-[10050]', zeroFlex: false },
    { file: 'components/features/members/InviteMemberModal.tsx', zLayer: 'z-[10050]', zeroFlex: false },
    { file: 'components/features/assets/BorrowRequestDetailModal.tsx', zLayer: 'z-[10050]', zeroFlex: false },
    { file: 'components/features/assets/AssetScannerModal.tsx', zLayer: 'z-[10050]', zeroFlex: false },
    { file: 'components/features/assets/AssetQRCodeModal.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'components/features/workflow/WorkflowModals.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'components/features/comments/RichCommentBody.tsx', zLayer: 'z-[10050]', zeroFlex: false },
    { file: 'components/layouts/SidebarMechanismModal.tsx', zLayer: 'z-[10050]', zeroFlex: true },
    { file: 'pages/MemberManagement.tsx', zLayer: 'z-[10050]', zeroFlex: false },
  ];

  for (const entry of modalFiles) {
    const src = fs.readFileSync(path.join(DEV_SRC_ROOT, entry.file), 'utf8');
    assert.equal(src.includes('createPortal('), true, `${entry.file} must portal into document.body`);
    assert.equal(src.includes('document.body'), true, `${entry.file} must target document.body`);
    assert.equal(src.includes(entry.zLayer), true, `${entry.file} must use ${entry.zLayer} over Left Sidebar`);
    assert.equal(src.includes('modal-liquid-glass'), true, `${entry.file} must use .modal-liquid-glass`);
    if (entry.zeroFlex) {
      assert.equal(/\b(?:inline-)?flex\b/.test(src), false, `${entry.file} must remain Zero Flexbox`);
    }
  }

  const popoverSrc = fs.readFileSync(path.join(DEV_SRC_ROOT, 'components/common/AnchoredConfirmPopover.tsx'), 'utf8');
  assert.equal(popoverSrc.includes('zIndex: 10060'), true);
  assert.equal(popoverSrc.includes('z-[10060]'), true);
});
