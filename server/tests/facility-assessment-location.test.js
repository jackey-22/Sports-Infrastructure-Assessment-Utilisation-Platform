const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  parsePhotoMetadata,
  validatePhotoLocations,
} = require("../Controller/FacilityAssessmentController");

test("assessment photos can be analysed without location metadata for demos", () => {
  const parsed = parsePhotoMetadata(undefined, 2);

  assert.deepEqual(parsed, { metadata: [] });
  assert.deepEqual(validatePhotoLocations(parsed.metadata, {}), { metadata: [] });
});

test("provided assessment photo locations remain validated against the facility", () => {
  const parsed = parsePhotoMetadata(
    JSON.stringify([{
      source: "camera",
      latitude: 22,
      longitude: 72,
      accuracy: 10,
      capturedAt: "2026-11-26T10:00:00.000Z",
    }]),
    1
  );

  assert.equal(parsed.error, undefined);
  assert.deepEqual(
    validatePhotoLocations(parsed.metadata, { latitude: "22", longitude: "72" }),
    {
      metadata: [{
        source: "camera",
        latitude: 22,
        longitude: 72,
        accuracy: 10,
        capturedAt: "2026-11-26T10:00:00.000Z",
        distanceFromFacilityMeters: 0,
      }],
    }
  );
  assert.match(
    validatePhotoLocations(
      [{ ...parsed.metadata[0], latitude: 25 }],
      { latitude: "22", longitude: "72" }
    ).error,
    /within 1000 metres/
  );
});
