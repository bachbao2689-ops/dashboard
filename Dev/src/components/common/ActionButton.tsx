import {Children, isValidElement, type ComponentPropsWithRef, type ReactNode} from 'react';

type Props = ComponentPropsWithRef<'button'> & {icon: ReactNode; label?: string; badge?: ReactNode; mobileOnlyIcon?: boolean};
function textOf(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return isValidElement<{children?: ReactNode}>(child) ? textOf(child.props.children) : '';
  }).join(' ').replace(/\s+/g, ' ').trim();
}

/** Desktop labels stay visible; mobile labels are announced and shown on tap. */
export function ActionButton({icon, label, badge, mobileOnlyIcon = false, children, className = '', ...props}: Props) {
  const accessibleLabel = props['aria-label'] || label || props.title || textOf(children);
  return <button type="button" {...props} aria-label={accessibleLabel || undefined}
    data-mobile-label={accessibleLabel} className={`${className} mobile-icon-action`}>
    <span className={`mobile-icon-action-glyph ${mobileOnlyIcon ? 'mobile-only-glyph' : ''}`} aria-hidden="true">{icon}</span>
    {children != null && <span className="mobile-icon-action-label">{children}</span>}
    {badge != null && <span className="mobile-action-badge">{badge}</span>}
  </button>;
}
