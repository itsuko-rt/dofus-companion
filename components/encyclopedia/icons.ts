import { Castle, MapPin, Package, Shirt, Skull, type LucideIcon } from 'lucide-react';
import type { EncyKind } from '../../src/encyclopedia-shared.ts';

export const KIND_ICON: Record<EncyKind, LucideIcon> = { item: Package, monster: Skull, dungeon: Castle, zone: MapPin, set: Shirt };
