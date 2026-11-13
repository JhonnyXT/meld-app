import type { SpaceDoc } from './mappers';
import type { SpaceRole } from '@/domain/category';

export function myRole(data: SpaceDoc, uid: string): SpaceRole {
  return (data.editorUids ?? data.memberUids).includes(uid) ? 'editor' : 'viewer';
}

export function resolveCompletedByUidForPush(
  current: string | null,
  isDone: boolean,
  uid: string | null,
): string | null {
  if (!isDone) return null;
  if (current) return current;
  return uid;
}
