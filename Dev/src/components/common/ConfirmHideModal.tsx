import React from 'react';
import { EyeOff } from 'lucide-react';
import { AnchoredConfirmPopover } from './AnchoredConfirmPopover';
import type { AnchorRectSnapshot } from '../../lib/anchoredPopoverPosition';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  anchorEl?: HTMLElement | null;
  anchorRect?: AnchorRectSnapshot | null;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  extraNotice?: React.ReactNode;
}

export const ConfirmHideModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  anchorEl = null,
  anchorRect = null,
  confirmLabel = 'Ẩn ngay',
  cancelLabel = 'Hủy',
  busy = false,
  extraNotice,
}) => (
  <AnchoredConfirmPopover
    isOpen={isOpen}
    tone="warning"
    icon={<EyeOff size={15} strokeWidth={2.2} />}
    title={title}
    message={message}
    confirmLabel={confirmLabel}
    cancelLabel={cancelLabel}
    onConfirm={onConfirm}
    onCancel={onCancel}
    anchorEl={anchorEl}
    anchorRect={anchorRect}
    busy={busy}
    extraNotice={extraNotice}
  />
);
