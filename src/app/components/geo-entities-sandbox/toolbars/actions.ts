import type { ComponentType } from 'react';
import type { IconProps } from '@/lib/icons/central';
import {
  Compass,
  Droplets,
  Hand,
  Maximize2,
  Pencil,
  RotateCcw,
  Save,
  Tag,
  Trash2,
} from '@/lib/icons/central';
import type { ToolbarActionId } from './types';

/**
 * Post-creation action descriptors. Used by every toolbar variant so the
 * options line stays in lockstep across designs.
 *
 * Order is deliberate — manipulation actions (Move / Rotate / Scale) lead
 * because they're the most common "I just drew this and want to position
 * it" gestures. Edit actions (name / description / fill / coordinates) sit
 * in the middle. Delete is last and tone-tagged so it stays visually
 * separated as a destructive action.
 */
export interface ActionDescriptor {
  id: ToolbarActionId;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Short tooltip / dropdown subtitle. */
  hint: string;
  /** `caution` keeps Delete visually separated as a destructive action. */
  tone?: 'caution';
}

export const SHAPE_ACTIONS: ActionDescriptor[] = [
  {
    id: 'move',
    label: 'Move',
    Icon: Hand,
    hint: 'Drag the shape body to move',
  },
  {
    id: 'rotate',
    label: 'Rotate',
    Icon: RotateCcw,
    hint: 'Drag the top handle on the shape to rotate',
  },
  {
    id: 'scale',
    label: 'Scale',
    Icon: Maximize2,
    hint: 'Drag a corner handle on the shape to scale',
  },
  { id: 'rename', label: 'Name', Icon: Tag, hint: 'Rename this shape' },
  { id: 'description', label: 'Notes', Icon: Pencil, hint: 'Add description' },
  { id: 'color', label: 'Fill', Icon: Droplets, hint: 'Change fill color & opacity' },
  { id: 'coords', label: 'Coords', Icon: Compass, hint: 'View coordinates' },
  { id: 'save', label: 'Save', Icon: Save, hint: 'Save shape & close editor' },
  { id: 'delete', label: 'Delete', Icon: Trash2, hint: 'Delete shape', tone: 'caution' },
];
