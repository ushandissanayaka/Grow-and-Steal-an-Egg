// Server-owned rules for what a grown giant egg hatches into and what shredding and hatching produce.

import { EGGS, TREE_TYPES, WORLD, combineLuck, eggSize, pickWeighted, rollEggType, rollLuck, rollPet } from '../shared/gameData.js';

// A giant egg grown to full size by scythe hits hatches: one pet pops out and lands beside it,
// ready to be grabbed and carried home. type / luck say which egg it came from.
// luckMult: the grower's extra luck (Super Lucky, Server Luck, banked Lucky Dust)
export function hatchFromEggNode(node, luckMult = 1) {
  const type = pickWeighted(TREE_TYPES[node.type].eggs);
  const luck = rollLuck(type) * luckMult;
  const pet = rollPet(type, luck);
  const angle = Math.random() * Math.PI * 2;
  const spread = 5 + 2.5 * node.scale;
  return {
    type,
    luck,
    size: eggSize(node),
    pet: JSON.stringify(pet),
    x: Math.max(-WORLD.halfX + 3, Math.min(WORLD.halfX - 3, node.x + Math.cos(angle) * spread)),
    z: Math.max(WORLD.northZ + 3, Math.min(WORLD.lineZ - 3, node.z + Math.sin(angle) * spread)),
    ox: node.x,
    oz: node.z,
  };
}

export function shredResult(eggs) {
  const luck = combineLuck(eggs);
  return { type: rollEggType(eggs, luck), luck };
}

export function hatchResult(eggType, luck) {
  return { pet: rollPet(eggType, luck), egg: EGGS[eggType].name };
}
