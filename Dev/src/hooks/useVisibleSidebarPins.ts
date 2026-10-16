import { useAuthStore } from '../store/authStore';
import { useSidebarPinStore } from '../store/sidebarPinStore';
import { useSharedResource } from './useSharedResource';
import { workflowResource, workspaceScope } from '../services/workspaceResources';

// A saved pin is a preference, never a permission grant. Resolve its current title from scoped data.
export function useVisibleSidebarPins() {
  const id = useAuthStore(s => s.profile?.id);
  const { ownerId, pinnedEntities } = useSidebarPinStore();
  const tracks = useSharedResource(workflowResource, workspaceScope(), Boolean(id)).data || [];
  if (ownerId !== String(id)) return [];
  return pinnedEntities.flatMap(pin => {
    const track = tracks.find(t => t.entity_type === pin.kind && t.entity_id === pin.id);
    return track ? [{...pin, name: track.name}] : [];
  });
}
