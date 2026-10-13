/**
 * Cyber-Organic Liquid Glass Design System Tokens
 * Standard tokens extracted and normalized from K COFFEE Dashboard
 */

export const DESIGN_TOKENS = {
  colors: {
    brand: {
      primary: '#002e6d', // Brand Blue / Deep Corporate Navy
      primaryHover: '#001f4d',
      lightBg: '#f0f6ff',
      cyanGlow: '#38bdf8',
      accentGreen: '#4eb648',
    },
    surfaces: {
      light: {
        pageBg: '#ffffff',
        cardHubBg: 'radial-gradient(circle at 100% 100%, #eff6ff 0%, rgba(239, 246, 255, 0) 50%), #ffffff',
        cardBorder: '#e0eaff',
        glassBorder: 'rgba(255, 255, 255, 0.88)',
        glassShadow: '0 12px 32px rgba(18, 48, 94, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
      },
      dark: {
        pageBg: '#0b1120',
        cardHubBg: 'radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0) 50%), #0f172a',
        cardBorder: 'rgba(59, 130, 246, 0.15)',
        glassBorder: 'rgba(59, 130, 246, 0.22)',
        glassShadow: '0 14px 36px rgba(0, 8, 24, 0.36), inset 0 1px 0 rgba(215, 235, 255, 0.12)',
      }
    },
    status: {
      backlog: {
        key: 'backlog',
        label: 'Backlog',
        marketingTitle: 'Backlog (Ý tưởng & Chờ duyệt)',
        color: '#F59E0B',
        textColor: 'text-amber-700 dark:text-amber-300',
        bgLight: 'bg-amber-50',
        bgDark: 'dark:bg-amber-950/40',
        borderClass: 'border-amber-300 dark:border-amber-700',
        glowColor: '245, 158, 11',
      },
      planned: {
        key: 'planned',
        label: 'Planned',
        marketingTitle: 'Planned (Đã lên kế hoạch)',
        color: '#6B7280',
        textColor: 'text-gray-600 dark:text-gray-300',
        bgLight: 'bg-gray-50',
        bgDark: 'dark:bg-slate-800',
        borderClass: 'border-gray-300 dark:border-slate-600',
        glowColor: '107, 114, 128',
      },
      scoping: {
        key: 'scoping',
        label: 'Scoping',
        marketingTitle: 'Scoping (Làm rõ Brief & Phạm vi)',
        color: '#F43F5E',
        textColor: 'text-rose-700 dark:text-rose-300',
        bgLight: 'bg-rose-50',
        bgDark: 'dark:bg-rose-950/40',
        borderClass: 'border-rose-300 dark:border-rose-700',
        glowColor: '244, 63, 94',
      },
      in_progress: {
        key: 'in_progress',
        label: 'In Progress',
        marketingTitle: 'In Progress (Đang triển khai)',
        color: '#EAB308',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        bgLight: 'bg-yellow-50',
        bgDark: 'dark:bg-yellow-950/40',
        borderClass: 'border-yellow-300 dark:border-yellow-700',
        glowColor: '234, 179, 8',
      },
      in_qa: {
        key: 'in_qa',
        label: 'In QA',
        marketingTitle: 'In QA (Rà soát & Duyệt nội dung)',
        color: '#10B981',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        bgLight: 'bg-emerald-50',
        bgDark: 'dark:bg-emerald-950/40',
        borderClass: 'border-emerald-300 dark:border-emerald-700',
        glowColor: '16, 185, 129',
      },
      completed: {
        key: 'completed',
        label: 'Completed',
        marketingTitle: 'Completed (Đã nghiệm thu & Hoàn tất)',
        color: '#6366F1',
        textColor: 'text-indigo-700 dark:text-indigo-300',
        bgLight: 'bg-indigo-50',
        bgDark: 'dark:bg-indigo-950/40',
        borderClass: 'border-indigo-300 dark:border-indigo-700',
        glowColor: '99, 102, 241',
      },
      canceled: {
        key: 'canceled',
        label: 'Canceled',
        marketingTitle: 'Canceled (Đã hủy bỏ)',
        color: '#4B5563',
        textColor: 'text-gray-500 dark:text-gray-400',
        bgLight: 'bg-gray-100',
        bgDark: 'dark:bg-slate-800',
        borderClass: 'border-gray-300 dark:border-slate-700',
        glowColor: '75, 85, 99',
      }
    }
  },
  borderRadius: {
    hub: '16px', // rounded-2xl
    input: '12px', // rounded-xl
    button: '12px',
    pill: '9999px', // rounded-full
    badge: '8px' // rounded-lg
  },
  blur: {
    subtle: '8px',
    glass: '20px',
    deepGlass: '28px',
    frostedPopover: '32px' // backdrop-blur-2xl
  },
  spring: {
    soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
    bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  }
} as const;

export type WorkflowStatusKey = keyof typeof DESIGN_TOKENS.colors.status;
