import axios from "axios";
import fs from "fs";

const BASE_URL = "https://psgc.cloud/api";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// helper to retry when 429 (too many requests)
async function safeGet(url, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(url);
      return data;
    } catch (err) {
      if (err.response && err.response.status === 429) {
        const wait = (i + 1) * 1000; // exponential backoff: 1s, 2s, 3s...
        console.log(`⚠️ Rate limit hit. Waiting ${wait / 1000}s then retrying...`);
        await delay(wait);
      } else {
        throw err; // not a rate limit error → fail normally
      }
    }
  }
  throw new Error("Too many retries on 429");
}

async function getRegions() {
  const data = await safeGet(`${BASE_URL}/regions`);
  return data;
}

async function getProvinces(regionCode) {
  const data = await safeGet(`${BASE_URL}/regions/${regionCode}/provinces`);
  return data;
}

async function getCities(provinceCode) {
  const data = await safeGet(`${BASE_URL}/provinces/${provinceCode}/cities-municipalities`);
  return data;
}

async function generatePHLocations() {
  console.log("📦 Fetching all regions...");
  const regions = await getRegions();
  const result = [];

  for (const region of regions) {
    console.log(`📍 Region: ${region.name}`);
    const provinces = await getProvinces(region.code);
    const provinceList = [];

    for (const province of provinces) {
      console.log(`   🏞️ Province: ${province.name}`);

      // Wait between each province call (300 ms is usually safe)
      await delay(300);

      const cities = await getCities(province.code);
      const cityNames = Array.isArray(cities) ? cities.map((c) => c.name) : [];

      provinceList.push({
        province: province.name,
        cities: cityNames,
      });
    }

    result.push({
      region: region.name,
      provinces: provinceList,
    });
  }

  fs.writeFileSync("ph_locations.json", JSON.stringify(result, null, 2));
  console.log("✅ JSON file saved as ph_locations.json");
}

generatePHLocations().catch((err) => console.error("❌ Error:", err.message));
