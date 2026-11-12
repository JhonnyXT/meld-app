import type { IconName } from './iconNames';

export type SpaceRole = 'editor' | 'viewer';

export interface CategorySpaceLink {
  spaceId: string;
  role: SpaceRole;
  ownerUid: string;
}

export interface Category {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  sortOrder: number;
  space?: CategorySpaceLink;
}
