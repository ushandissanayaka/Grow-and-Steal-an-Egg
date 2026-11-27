import { Schema, MapSchema, defineTypes } from '@colyseus/schema';

export class PlayerState extends Schema {
  constructor() {
    super();
    this.userId = '';
    this.name = '';
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.ry = 0;
    this.anim = 'idle';
    this.avatar = '{}'; // JSON of Legion.SDK.avatar.getEquipped()
    this.props = '{}';  // JSON of Legion.SDK.avatar.getProportions()
    this.plot = -1;
    this.carried = '[]'; // JSON [{ type, luck, size }]
    this.pad = '[]';     // JSON [{ type, luck }] eggs waiting on the drop pad
    this.stage = 'idle'; // shredding | launch | growing | ready | hatching | idle
    this.eggType = '';
    this.eggLuck = 1;
    this.pets = '[]';    // JSON [{ id, cash }], the pets shown in the pen (and earning)
    this.cash = 0;
    this.income = 0;     // $ per second
    this.speed = 0;
    this.axe = 'fists';
    this.axes = '["fists"]';
    this.allPets = '[]';  // JSON [{ uid, id, cash, egg }] every pet the player owns (pets panel)
    this.trail = '';      // the trail streaming behind the player
    this.emote = '';      // 'emoteId:n' - a new value plays that emote on this player for everyone
    this.tool = 'scythe'; // scythe | bat: what is in the player's hands
    this.tread = 1;       // treadmill (and frame) level, 1..5
    this.meta = '{}';     // JSON: passes, potions, slots, index, rebirths, timers (see progress.metaOf)
  }
}
defineTypes(PlayerState, {
  userId: 'string',
  name: 'string',
  x: 'float32',
  y: 'float32',
  z: 'float32',
  ry: 'float32',
  anim: 'string',
  avatar: 'string',
  props: 'string',
  plot: 'int8',
  carried: 'string',
  pad: 'string',
  stage: 'string',
  eggType: 'string',
  eggLuck: 'float32',
  pets: 'string',
  cash: 'number',
  income: 'number',
  speed: 'number',
  axe: 'string',
  axes: 'string',
  allPets: 'string',
  meta: 'string',
  trail: 'string',
  emote: 'string',
  tool: 'string',
  tread: 'uint8',
});

export class TreeState extends Schema {
  constructor(hp = 0) {
    super();
    this.hp = hp;
  }
}
defineTypes(TreeState, { hp: 'number' });

export class GroundEgg extends Schema {
  constructor({ type, luck, size = 1, x, z, ox = x, oz = z, pet = '' }) {
    super();
    this.type = type;
    this.pet = pet; // JSON of the pet that hatched (an item from a hatched giant egg), or ''
    this.luck = luck;
    this.size = size; // bigger trees drop bigger eggs
    this.x = x;
    this.z = z;
    this.ox = ox; // where it flew from
    this.oz = oz;
  }
}
defineTypes(GroundEgg, { type: 'string', pet: 'string', luck: 'float32', size: 'float32', x: 'float32', z: 'float32', ox: 'float32', oz: 'float32' });

export class AnimalState extends Schema {
  constructor(type, x, z) {
    super();
    this.type = type;
    this.x = x;
    this.z = z;
    this.ry = 0;
    this.mood = 'idle';  // idle | alert | chase | return
    this.target = '';    // sessionId being chased
    this.carrying = '';  // egg type taken from a player
  }
}
defineTypes(AnimalState, {
  type: 'string', x: 'float32', z: 'float32', ry: 'float32', mood: 'string', target: 'string', carrying: 'string',
});

export class StartingPlaceState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.trees = new MapSchema();
    this.eggs = new MapSchema();
    this.animals = new MapSchema();
    this.weather = 'snow';  // snow | rain (changes every WEATHER.switchMs)
    this.weatherLeft = 0;   // seconds until it changes
  }
}
defineTypes(StartingPlaceState, {
  players: { map: PlayerState },
  trees: { map: TreeState },
  eggs: { map: GroundEgg },
  animals: { map: AnimalState },
  weather: 'string',
  weatherLeft: 'uint16',
});
