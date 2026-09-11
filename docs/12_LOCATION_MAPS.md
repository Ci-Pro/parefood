# Location & Maps Architecture

## Requirements
- customer address coordinates
- merchant coordinates
- driver location
- service area
- delivery zone
- distance estimation
- navigation handoff

## Abstraction
Create LocationService with:
- geocode
- reverseGeocode
- calculateDistance
- estimateRoute
- openNavigation

Provider is replaceable.

## Privacy
Store only location data required for the business process.
Driver live location should have controlled retention and access.
