import React from 'react'

interface StylizedPinIconProps {
  size?: number
  pinned?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Stylized, tilted pushpin icon (nghiêng ~38deg, tối giản, đồng bộ toàn hệ thống).
 * - Khi `pinned = true`: tô đặc phần thân ghim (filled), giữ màu đơn sắc tinh tế.
 * - Khi `pinned = false`: nét mảnh (outline), nghiêng nhẹ hiện đại.
 */
export const StylizedPinIcon: React.FC<StylizedPinIconProps> = ({
  size = 15,
  pinned = false,
  className = '',
  style,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 ${className}`.trim()}
      style={{
        transform: 'rotate(38deg)',
        ...style,
      }}
      aria-hidden="true"
    >
      {/* Mũ ghim bo tròn phía trên + thân ghim thắt eo cách điệu */}
      <path
        d="M9 3.5H15C15.5523 3.5 16 3.94772 16 4.5C16 5.05228 15.5523 5.5 15 5.5H14.4L15.2 10.6C16.6 11.4 17.5 12.7 17.5 14.2V14.5C17.5 15.0523 17.0523 15.5 16.5 15.5H7.5C6.94772 15.5 6.5 15.0523 6.5 14.5V14.2C6.5 12.7 7.4 11.4 8.8 10.6L9.6 5.5H9C8.44772 5.5 8 5.05228 8 4.5C8 3.94772 8.44772 3.5 9 3.5Z"
        fill={pinned ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={pinned ? '1.8' : '1.75'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mũi kim nhọn phía dưới */}
      <path
        d="M12 15.5V21"
        stroke="currentColor"
        strokeWidth={pinned ? '2' : '1.75'}
        strokeLinecap="round"
      />
    </svg>
  )
}
