const REQUIRED_CHARACTER_STATS = ['weight', 'handling'];
const REQUIRED_VEHICLE_STATS = [
  'maxSpeed',
  'acceleration',
  'brakeForce',
  'fuelCapacity',
  'fuelConsumption',
  'mass',
  'suspension',
  'grip',
  'width',
  'height',
  'wheelRadius',
  'airRotationSpeed'
];
const REQUIRED_STAGE_TERRAIN = [
  'profile',
  'segmentWidth',
  'minHeight',
  'maxHeight',
  'jumpChance',
  'valleyChance'
];
const UNLOCK_TYPES = new Set(['free', 'coins', 'diamonds']);
const ASSET_PATH_PATTERN = /^\/assets\/[^\s]+\.(svg|png|jpg|jpeg|webp|gif)$/i;

function addError(errors, type, item, message) {
  errors.push(`[Data Validation] ${type} "${item}": ${message}`);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateNumber(errors, type, item, field, value, { min = 0 } = {}) {
  if (!isFiniteNumber(value)) {
    addError(errors, type, item, `Invalid numeric value: ${field}`);
  } else if (value < min) {
    addError(errors, type, item, `${field} must be >= ${min}`);
  }
}

function validateAssetPath(errors, type, item, field, path) {
  if (typeof path !== 'string' || path.length === 0) {
    addError(errors, type, item, `Missing required field: ${field}`);
  } else if (!ASSET_PATH_PATTERN.test(path) || path.includes('..')) {
    addError(errors, type, item, `Invalid asset path: ${field} (${path})`);
  }
}

// P0 Step 7C: visual assets are optional when absent. The runtime already
// handles missing thumbnails/sprites/previews with graceful fallbacks (vector
// vehicle, vector driver, "IMAGE MISSING" card text), so a null/undefined/
// empty visual asset path is valid data. Any path that IS provided is still
// validated with full strictness by validateAssetPath (pattern + traversal
// checks, unchanged). Gameplay-required validation is not affected.
function validateOptionalAssetPath(errors, type, item, field, path) {
  if (path === null || path === undefined || path === '') return;
  validateAssetPath(errors, type, item, field, path);
}

function validateUnlock(errors, type, item, unlock) {
  if (!unlock || typeof unlock !== 'object') {
    addError(errors, type, item, 'Missing required field: unlock');
    return;
  }
  if (!UNLOCK_TYPES.has(unlock.type)) {
    addError(errors, type, item, `Invalid unlock.type: ${unlock.type}`);
  }
  validateNumber(errors, type, item, 'unlock.amount', unlock.amount);
  if (unlock.type === 'free' && unlock.amount !== 0) {
    addError(errors, type, item, 'unlock.amount must be 0 for free items');
  }
}

function validateIdentity(errors, type, item) {
  if (!item || typeof item !== 'object') {
    addError(errors, type, 'unknown', 'Record must be an object');
    return false;
  }
  if (typeof item.id !== 'string' || item.id.trim() === '') {
    addError(errors, type, item.id || 'unknown', 'Missing required field: id');
  }
  if (typeof item.name !== 'string' || item.name.trim() === '') {
    addError(errors, type, item.id || 'unknown', 'Missing required field: name');
  }
  return true;
}

function validateCharacters(characters, errors) {
  characters.forEach(character => {
    if (!validateIdentity(errors, 'Character', character)) return;
    const item = character.id || 'unknown';
    // P0 Step 7C: optional-if-absent / strict-if-present visual assets.
    validateOptionalAssetPath(errors, 'Character', item, 'assets.thumbnail', character.assets?.thumbnail);
    validateOptionalAssetPath(errors, 'Character', item, 'assets.sprite', character.assets?.sprite);
    validateUnlock(errors, 'Character', item, character.unlock);
    REQUIRED_CHARACTER_STATS.forEach(field => validateNumber(errors, 'Character', item, `stats.${field}`, character.stats?.[field]));
    Object.entries(character.bonuses || {}).forEach(([field, value]) => {
      validateNumber(errors, 'Character', item, `bonuses.${field}`, value, { min: -1 });
    });
  });
}

function validateVehicles(vehicles, errors) {
  vehicles.forEach(vehicle => {
    if (!validateIdentity(errors, 'Vehicle', vehicle)) return;
    const item = vehicle.id || 'unknown';
    // P0 Step 7C: optional-if-absent / strict-if-present visual assets.
    validateOptionalAssetPath(errors, 'Vehicle', item, 'assets.thumbnail', vehicle.assets?.thumbnail);
    validateOptionalAssetPath(errors, 'Vehicle', item, 'assets.sprite', vehicle.assets?.sprite);
    validateUnlock(errors, 'Vehicle', item, vehicle.unlock);
    REQUIRED_VEHICLE_STATS.forEach(field => validateNumber(errors, 'Vehicle', item, `stats.${field}`, vehicle.stats?.[field]));
  });
}

function validateStage(stage, errors, type = 'Stage') {
  if (!validateIdentity(errors, type, stage)) return;
  const item = stage.id || 'unknown';
  const isBonusStage = type === 'Bonus Stage';
  // P0 Step 7C: optional-if-absent / strict-if-present visual assets.
  validateOptionalAssetPath(errors, type, item, 'assets.preview', stage.assets?.preview);
  validateOptionalAssetPath(errors, type, item, 'assets.background', stage.assets?.background);
  if (!isBonusStage) {
    validateUnlock(errors, type, item, stage.unlock);
    validateNumber(errors, type, item, 'difficulty', stage.difficulty, { min: 1 });
    validateNumber(errors, type, item, 'distance', stage.distance, { min: 1 });
  }

  const terrain = stage.terrain;
  if (!terrain || typeof terrain !== 'object') {
    addError(errors, type, item, 'Missing required field: terrain');
  } else {
    if (typeof terrain.profile !== 'string' || terrain.profile.trim() === '') {
      addError(errors, type, item, 'Missing required field: terrain.profile');
    }
    const terrainFields = isBonusStage ? [] : REQUIRED_STAGE_TERRAIN.filter(field => field !== 'profile');
    terrainFields.forEach(field => {
      const min = field.endsWith('Chance') ? 0 : 0;
      validateNumber(errors, type, item, `terrain.${field}`, terrain[field], { min });
      if (field.endsWith('Chance') && isFiniteNumber(terrain[field]) && terrain[field] > 1) {
        addError(errors, type, item, `terrain.${field} must be <= 1`);
      }
    });
  }

  if (!stage.physics || typeof stage.physics !== 'object') {
    addError(errors, type, item, 'Missing required field: physics');
  } else {
    validateNumber(errors, type, item, 'physics.gravity', stage.physics.gravity, { min: 0 });
  }

  if (isBonusStage && !stage.collectibles) return;
  if (!stage.collectibles || typeof stage.collectibles !== 'object') {
    addError(errors, type, item, 'Missing required field: collectibles');
  } else {
    ['coinChance', 'fuelChance', 'diamondChance'].forEach(field => {
      validateNumber(errors, type, item, `collectibles.${field}`, stage.collectibles[field], { min: 0 });
      if (isFiniteNumber(stage.collectibles[field]) && stage.collectibles[field] > 1) {
        addError(errors, type, item, `collectibles.${field} must be <= 1`);
      }
    });
  }
}

function validateUniqueIds(collections, errors) {
  const seen = new Map();
  collections.forEach(({ type, items }) => {
    items.forEach(item => {
      if (!item || typeof item.id !== 'string' || item.id.trim() === '') return;
      if (seen.has(item.id)) {
        addError(errors, type, item.id, `Duplicate ID also used by ${seen.get(item.id)}`);
      } else {
        seen.set(item.id, type);
      }
    });
  });
}

export function validateData({ characters = [], vehicles = [], stages = [], bonusStages = [] } = {}) {
  const errors = [];
  const collections = [
    { type: 'Character', items: characters },
    { type: 'Vehicle', items: vehicles },
    { type: 'Stage', items: stages },
    { type: 'Bonus Stage', items: bonusStages }
  ];

  collections.forEach(({ type, items }) => {
    if (!Array.isArray(items)) addError(errors, type, 'collection', 'Collection must be an array');
  });

  if (Array.isArray(characters)) validateCharacters(characters, errors);
  if (Array.isArray(vehicles)) validateVehicles(vehicles, errors);
  if (Array.isArray(stages)) stages.forEach(stage => validateStage(stage, errors));
  if (Array.isArray(bonusStages)) bonusStages.forEach(stage => validateStage(stage, errors, 'Bonus Stage'));
  validateUniqueIds(collections.filter(collection => Array.isArray(collection.items)), errors);

  return { valid: errors.length === 0, errors };
}

export async function validateAssetPaths({ characters = [], vehicles = [], stages = [], bonusStages = [] } = {}, fetchImplementation = globalThis.fetch) {
  const missingAssets = [];
  if (typeof fetchImplementation !== 'function') {
    return { checked: false, missingAssets, reason: 'fetch is unavailable in this environment' };
  }

  const assets = [];
  characters.forEach(item => assets.push({ type: 'Character', id: item.id, field: 'thumbnail', path: item.assets?.thumbnail }, { type: 'Character', id: item.id, field: 'sprite', path: item.assets?.sprite }));
  vehicles.forEach(item => assets.push({ type: 'Vehicle', id: item.id, field: 'thumbnail', path: item.assets?.thumbnail }, { type: 'Vehicle', id: item.id, field: 'sprite', path: item.assets?.sprite }));
  stages.forEach(item => assets.push({ type: 'Stage', id: item.id, field: 'preview', path: item.assets?.preview }, { type: 'Stage', id: item.id, field: 'background', path: item.assets?.background }));
  bonusStages.forEach(item => assets.push({ type: 'Bonus Stage', id: item.id, field: 'preview', path: item.assets?.preview }, { type: 'Bonus Stage', id: item.id, field: 'background', path: item.assets?.background }));

  await Promise.all(assets.filter(asset => typeof asset.path === 'string').map(async asset => {
    try {
      const response = await fetchImplementation(asset.path, { method: 'HEAD' });
      if (!response.ok) missingAssets.push(`[Data Validation] ${asset.type} "${asset.id}": Missing asset ${asset.field} (${asset.path})`);
    } catch (error) {
      missingAssets.push(`[Data Validation] ${asset.type} "${asset.id}": Could not verify asset ${asset.field} (${asset.path})`);
    }
  }));

  missingAssets.forEach(message => console.warn(message));
  return { checked: true, missingAssets, valid: missingAssets.length === 0 };
}

export function reportValidation(result) {
  if (result.valid) {
    console.info('[Data Validation] All data records are valid.');
    return;
  }
  result.errors.forEach(error => console.error(error));
}

export default validateData;
