// ============================================
// Nepali Racer - Vehicle Data
// ============================================

const vehicleSpecs = [
  ['tempo', 'Tempo', 'tempo', 300, 120, 180, 2, 1000, 1, 1, 100, 50, 20, 2.5, 0, 'tempo.svg'],
  ['jeep', 'Jeep', 'jeep', 280, 100, 200, 2, 1500, 1.2, 1.1, 90, 50, 18, 2, 300, 'jeep.svg'],
  ['sajha_bus', 'Sajha Bus', 'bus', 220, 80, 250, 2, 3000, 0.8, 0.9, 120, 60, 20, 1.5, 50, 'sajha_bus.svg'],
  ['pickup', 'Pickup', 'pickup', 320, 130, 170, 2, 1200, 1.1, 1, 85, 45, 16, 2.8, 500, 'pickup.svg'],
  ['mountain_suv', 'Mountain SUV', 'suv', 260, 90, 220, 2, 2000, 1.3, 1.2, 95, 55, 22, 1.8, 100, 'mountain_suv.svg'],
  ['himalayan_bike', 'Himalayan Bike', 'motorcycle', 350, 155, 130, 1.5, 220, 1, 1.15, 55, 35, 14, 3.1, 700, 'himalayan_bike.svg'],
  ['terai_motorbike', 'Terai Motorbike', 'motorcycle', 360, 165, 125, 1.8, 190, 0.9, 1.05, 52, 32, 13, 3.2, 720],
  ['city_scooter', 'City Scooter', 'scooter', 260, 115, 145, 1.4, 170, 0.8, 1.1, 48, 35, 13, 2.8, 350, 'city_scooter.svg'],
  ['dirt_bike', 'Dirt Bike', 'dirt_bike', 330, 145, 140, 1.7, 210, 1.3, 1.2, 58, 38, 15, 3, 760],
  ['rural_tractor', 'Rural Tractor', 'tractor', 180, 70, 230, 3, 2600, 1.4, 1.3, 105, 65, 24, 1.4, 600, 'rural_tractor.svg'],
  ['farm_tractor', 'Farm Tractor', 'tractor', 170, 65, 240, 3.2, 2800, 1.5, 1.25, 110, 68, 25, 1.3, 650],
  ['bolero_style_pickup', 'Hill Pickup', 'pickup', 290, 110, 190, 2.2, 1700, 1.3, 1.15, 92, 52, 19, 2.2, 800],
  ['local_4x4', 'Local 4x4', '4x4', 270, 105, 215, 2.4, 2100, 1.5, 1.3, 98, 58, 21, 2, 850],
  ['offroad_jeep', 'Offroad Jeep', 'offroad', 310, 125, 205, 2.5, 1850, 1.6, 1.4, 94, 55, 20, 2.4, 900],
  ['village_microbus', 'Village Microbus', 'microbus', 240, 85, 230, 2.6, 2400, 1.1, 1, 115, 65, 21, 1.7, 900],
  ['city_microbus', 'City Microbus', 'microbus', 250, 90, 220, 2.4, 2300, 1, 1.05, 110, 62, 20, 1.8, 950],
  ['tourist_bus', 'Tourist Bus', 'bus', 210, 75, 260, 3.4, 4200, 0.9, 0.95, 135, 72, 24, 1.3, 1100],
  ['mountain_bus', 'Mountain Bus', 'bus', 190, 70, 280, 3.5, 4500, 1.2, 1.1, 140, 75, 25, 1.2, 1200],
  ['cargo_truck', 'Cargo Truck', 'truck', 230, 80, 250, 3.2, 3800, 1, 1, 130, 70, 23, 1.4, 1050],
  ['heavy_cargo_truck', 'Heavy Cargo Truck', 'cargo_truck', 200, 65, 290, 4, 6000, 0.9, 0.9, 150, 80, 27, 1.1, 1300],
  ['electric_micro', 'Electric Micro', 'electric', 275, 120, 180, 0.8, 1500, 1.1, 1.15, 100, 55, 19, 2.4, 1000],
  ['electric_scooter', 'Electric Scooter', 'electric', 290, 130, 145, 0.7, 180, 1, 1.2, 50, 34, 13, 2.9, 1050],
  ['electric_tempo', 'Electric Tempo', 'electric', 260, 115, 185, 0.9, 1150, 1.1, 1.1, 100, 50, 20, 2.3, 1100],
  ['rally_jeep', 'Rally Jeep', 'rally', 370, 165, 180, 2.8, 1400, 1.5, 1.35, 92, 50, 18, 3.4, 1400],
  ['himalayan_rally', 'Himalayan Rally Car', 'rally', 390, 175, 175, 3, 1250, 1.4, 1.4, 90, 48, 17, 3.5, 1500],
  ['mountain_taxi', 'Mountain Taxi', 'taxi', 285, 105, 175, 2, 1350, 1.1, 1.05, 88, 48, 18, 2.3, 500],
  ['kathmandu_taxi', 'Kathmandu Taxi', 'taxi', 300, 115, 165, 1.9, 1250, 1, 1.1, 86, 46, 17, 2.5, 550],
  ['sajha_electric_bus', 'Sajha Electric Bus', 'electric_bus', 225, 80, 255, 1.1, 3300, 1, 1, 125, 68, 22, 1.5, 1250],
  ['school_bus', 'School Bus', 'bus', 205, 75, 250, 3.1, 3600, 0.9, 0.95, 130, 70, 23, 1.3, 700],
  ['water_tanker', 'Water Tanker', 'truck', 215, 70, 270, 3.6, 4800, 0.8, 0.9, 140, 75, 24, 1.2, 1350],
  ['ambulance', 'Mountain Ambulance', 'utility', 275, 100, 200, 2.3, 1800, 1.2, 1.15, 102, 58, 20, 2.1, 1150],
  ['police_jeep', 'Highway Patrol Jeep', 'utility', 300, 125, 210, 2.5, 1750, 1.4, 1.2, 96, 55, 20, 2.6, 1000],
  ['postal_van', 'Postal Van', 'van', 250, 90, 205, 2.2, 1900, 1.1, 1, 105, 60, 20, 1.9, 850],
  ['delivery_van', 'Delivery Van', 'van', 265, 100, 195, 2.1, 1750, 1.1, 1.05, 100, 58, 19, 2.1, 900],
  ['mountain_pickup', 'Mountain Pickup', 'pickup', 305, 120, 190, 2.4, 1550, 1.4, 1.25, 90, 50, 19, 2.7, 950],
  ['construction_truck', 'Construction Truck', 'truck', 185, 60, 300, 4.2, 6500, 0.8, 0.85, 155, 82, 28, 1, 1400],
  ['mini_truck', 'Mini Truck', 'truck', 245, 95, 220, 2.6, 2300, 1, 1, 112, 62, 21, 1.8, 800],
  ['rural_three_wheeler', 'Rural Three Wheeler', 'three_wheeler', 225, 85, 190, 2, 650, 0.9, 0.95, 78, 45, 17, 2.2, 400],
  ['electric_three_wheeler', 'Electric Three Wheeler', 'electric', 235, 95, 180, 0.9, 600, 1, 1.05, 80, 46, 17, 2.4, 750],
  ['mountain_moped', 'Mountain Moped', 'motorcycle', 240, 100, 150, 1.3, 145, 1.1, 1.1, 46, 32, 12, 2.6, 300],
  ['trail_motorcycle', 'Trail Motorcycle', 'motorcycle', 345, 150, 135, 1.6, 230, 1.4, 1.3, 56, 36, 15, 3.1, 900],
  ['hill_crawler', 'Hill Crawler', 'offroad', 255, 95, 240, 2.9, 2250, 1.7, 1.35, 100, 60, 23, 1.9, 1250],
  ['rock_crawler', 'Rock Crawler', 'offroad', 235, 85, 260, 3.1, 2500, 1.8, 1.4, 105, 65, 24, 1.7, 1350],
  ['expressway_sedan', 'Expressway Sedan', 'car', 340, 145, 155, 2, 1400, 1, 1.1, 92, 45, 17, 3, 1000],
  ['fastback_ev', 'Fastback EV', 'electric', 380, 170, 160, 0.8, 1550, 1.1, 1.2, 96, 48, 18, 3.3, 1450],
  ['rally_pickup', 'Rally Pickup', 'rally', 355, 150, 185, 2.7, 1600, 1.5, 1.3, 98, 54, 20, 3.2, 1300],
  ['forest_rescue', 'Forest Rescue Truck', 'utility', 220, 80, 275, 3.5, 3900, 1.3, 1.15, 128, 70, 24, 1.4, 1200],
  ['terai_loader', 'Terai Loader', 'cargo', 190, 60, 245, 3.8, 3000, 1, 0.95, 120, 68, 22, 1.2, 650],
  ['village_cart', 'Village Utility Cart', 'utility', 160, 55, 210, 2.5, 900, 1.2, 1, 82, 48, 19, 1.6, 250],
  ['solar_shuttle', 'Solar Shuttle', 'electric', 215, 85, 200, 0.6, 1300, 1, 1.05, 98, 52, 19, 2, 1150],
  ['nepal_racer', 'Nepal Racer X', 'rally', 400, 185, 170, 2.9, 1100, 1.5, 1.45, 88, 46, 17, 3.7, 1800]
];

function createVehicle([id, name, category, maxSpeed, acceleration, brakeForce, fuelConsumption, mass, suspension, grip, width, height, wheelRadius, airRotationSpeed, unlockAmount, asset]) {
  const thumbnail = asset ? `/assets/images/vehicles/${asset}` : null;
  const legacyCurrency = { jeep: 'coins', sajha_bus: 'diamonds', pickup: 'coins', mountain_suv: 'diamonds' }[id];
  const unlockType = unlockAmount === 0 ? 'free' : legacyCurrency || (unlockAmount % 2 === 0 ? 'diamonds' : 'coins');
  return {
    id, name, description: `A Nepali-inspired ${category} for varied roads and terrain.`, category,
    assets: { thumbnail, sprite: thumbnail }, unlock: { type: unlockType, amount: unlockAmount },
    unlocked: unlockAmount === 0, cost: unlockAmount, currency: unlockType === 'diamonds' ? 'diamonds' : 'coins', thumbnail,
    stats: { maxSpeed, acceleration, brakeForce, fuelCapacity: 100, fuelConsumption, mass, suspension, grip, width, height, wheelRadius, airRotationSpeed }
  };
}

export const vehicles = vehicleSpecs.map(createVehicle);
