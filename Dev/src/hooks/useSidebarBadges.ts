import {useNotificationCenter} from './useNotificationCenter';
export type {SidebarBadgeCounts} from '../store/notificationStore';
// Sidebar, Header and Mobile share one request and one realtime connection.
export function useSidebarBadges(){return useNotificationCenter().counts;}
