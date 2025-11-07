# 🗺️ Cascading Address Selection - User Guide

## Overview

The Employee Add Modal now features a **cascading address selection system** that guides users through selecting their location in a structured, hierarchical manner.

---

## 🎯 How It Works

### Step-by-Step Flow:

```
1. User selects REGION
   ↓
2. Province dropdown ENABLES
   ↓
3. User selects PROVINCE
   ↓
4. City dropdown ENABLES
   ↓
5. User selects CITY
   ↓
6. User enters Barangay (optional)
   ↓
7. User enters Street Address (optional)
```

---

## 📋 Field Descriptions

### 1. **Region** (Required)
- **Type:** Dropdown
- **Status:** Always enabled
- **Options:** All Philippine regions (sorted alphabetically)
- **Example:** "Region I (Ilocos Region)", "NCR", "CAR"

### 2. **Province** (Required)
- **Type:** Dropdown
- **Status:** Disabled until Region is selected
- **Options:** Provinces within the selected region (sorted alphabetically)
- **Example:** If Region = "Region I", options include "Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"

### 3. **City/Municipality** (Required)
- **Type:** Dropdown
- **Status:** Disabled until Province is selected
- **Options:** Cities/municipalities within the selected province (sorted alphabetically)
- **Example:** If Province = "Ilocos Norte", options include "Adams", "Bacarra", "Badoc", "City of Batac", etc.

### 4. **Barangay** (Optional)
- **Type:** Text input
- **Status:** Always enabled
- **Example:** "Barangay San Nicolas", "Brgy. 1", etc.

### 5. **Street Address** (Optional)
- **Type:** Text input
- **Status:** Always enabled
- **Spans:** 2 columns for more space
- **Example:** "123 Main Street", "Unit 4B, Building A", etc.

---

## 🔄 Reset Behavior

### When Region Changes:
- Province dropdown **resets** to empty
- City dropdown **resets** to empty
- Province dropdown **re-enables** with new options
- City dropdown **disables** until province is selected

### When Province Changes:
- City dropdown **resets** to empty
- City dropdown **re-enables** with new options

---

## 🎨 Visual States

### Enabled Dropdown:
```
┌─────────────────────────────────┐
│ -- Select Region --         ▼  │
├─────────────────────────────────┤
│ CAR                             │
│ NCR                             │
│ Region I (Ilocos Region)        │
│ Region II (Cagayan Valley)      │
│ ...                             │
└─────────────────────────────────┘
```

### Disabled Dropdown:
```
┌─────────────────────────────────┐
│ Select Region First         ▼  │  (Grayed out, not clickable)
└─────────────────────────────────┘
```

### With Error:
```
┌─────────────────────────────────┐
│ -- Select Region --         ▼  │  (Red border)
└─────────────────────────────────┘
⚠️ Region is required
```

---

## 💾 Data Storage

### Database Schema:

**Table:** `employee_addresses`

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `region_code` | VARCHAR(9) | Region name | "Region I (Ilocos Region)" |
| `province_code` | VARCHAR(9) | Province name | "Ilocos Norte" |
| `city_code` | VARCHAR(9) | City/Municipality name | "City of Batac" |
| `barangay` | VARCHAR(255) | Barangay name | "Barangay San Nicolas" |
| `street_address` | VARCHAR(255) | Street address | "123 Main Street" |

**Note:** Currently storing **names** as codes. Future enhancement: Use actual PSGC codes.

---

## 🔍 Example Scenarios

### Scenario 1: Complete Address
```
Region: Region I (Ilocos Region)
Province: Ilocos Norte
City: City of Batac
Barangay: Barangay Quiling Norte
Street Address: 456 Rizal Street

Stored as:
{
  region_code: "Region I (Ilocos Region)",
  province_code: "Ilocos Norte",
  city_code: "City of Batac",
  barangay: "Barangay Quiling Norte",
  street_address: "456 Rizal Street"
}
```

### Scenario 2: Minimal Address (No Barangay/Street)
```
Region: NCR
Province: Metro Manila
City: Quezon City
Barangay: (empty)
Street Address: (empty)

Stored as:
{
  region_code: "NCR",
  province_code: "Metro Manila",
  city_code: "Quezon City",
  barangay: null,
  street_address: null
}
```

---

## ⚙️ Technical Implementation

### State Management:
```typescript
// Location data
const [locationData, setLocationData] = useState<any[]>([]);
const [availableProvinces, setAvailableProvinces] = useState<any[]>([]);
const [availableCities, setAvailableCities] = useState<string[]>([]);

// Selected values
const [selectedRegion, setSelectedRegion] = useState("");
const [selectedProvince, setSelectedProvince] = useState("");
const [selectedCity, setSelectedCity] = useState("");
const [barangay, setBarangay] = useState("");
const [streetAddress, setStreetAddress] = useState("");
```

### Cascading Logic:
```typescript
// When region changes
useEffect(() => {
  if (selectedRegion && locationData.length > 0) {
    const region = locationData.find(r => r.region === selectedRegion);
    if (region) {
      const sortedProvinces = [...region.provinces].sort((a, b) => 
        a.province.localeCompare(b.province)
      );
      setAvailableProvinces(sortedProvinces);
    }
  } else {
    setAvailableProvinces([]);
    setSelectedProvince("");
    setAvailableCities([]);
    setSelectedCity("");
  }
}, [selectedRegion, locationData]);

// When province changes
useEffect(() => {
  if (selectedProvince && availableProvinces.length > 0) {
    const province = availableProvinces.find(p => p.province === selectedProvince);
    if (province) {
      const sortedCities = [...province.cities].sort((a, b) => 
        a.localeCompare(b)
      );
      setAvailableCities(sortedCities);
    }
  } else {
    setAvailableCities([]);
    setSelectedCity("");
  }
}, [selectedProvince, availableProvinces]);
```

---

## 🐛 Troubleshooting

### Issue: Dropdowns not loading
**Solution:** Check that `ph_locations.json` is accessible at the correct path:
```typescript
fetch("../../../../backend/scripts/ph_locations.json")
```

### Issue: Province dropdown not enabling after region selection
**Solution:** Verify that the region name matches exactly (case-sensitive):
```typescript
const region = locationData.find(r => r.region === selectedRegion);
```

### Issue: Cities not showing after province selection
**Solution:** Check that the province object has a `cities` array:
```typescript
if (province && province.cities) {
  setAvailableCities(province.cities);
}
```

### Issue: Data not saving to database
**Solution:** Ensure backend controller is updated to handle new address fields. See `CODE_UPDATE_GUIDE.md`.

---

## 🚀 Future Enhancements

### 1. **PSGC Code Integration**
Replace names with actual Philippine Standard Geographic Codes:
```json
{
  "region_code": "010000000",
  "region_name": "Region I (Ilocos Region)",
  "provinces": [
    {
      "province_code": "012800000",
      "province_name": "Ilocos Norte",
      "cities": [
        {
          "city_code": "012801000",
          "city_name": "Adams"
        }
      ]
    }
  ]
}
```

### 2. **API Endpoint**
Create a dedicated API endpoint for location data:
```javascript
// backend/src/routes/locations.js
router.get('/api/locations/ph', (req, res) => {
  const data = require('../scripts/ph_locations.json');
  res.json(data);
});
```

### 3. **Search/Autocomplete**
Add search functionality to dropdowns for faster selection:
```typescript
<input 
  type="text" 
  placeholder="Search region..." 
  onChange={(e) => filterRegions(e.target.value)}
/>
```

### 4. **Map Integration**
Add interactive map for visual address selection:
```typescript
import { GoogleMap, Marker } from '@react-google-maps/api';
```

### 5. **Address Validation**
Validate addresses against postal codes or coordinates:
```typescript
const validateAddress = async (address) => {
  const response = await fetch(`/api/validate-address`, {
    method: 'POST',
    body: JSON.stringify(address)
  });
  return response.json();
};
```

---

## 📚 Related Documentation

- **EMPLOYEE_MODAL_UPDATE_SUMMARY.md** - Complete implementation details
- **CODE_UPDATE_GUIDE.md** - Backend controller update instructions
- **SCHEMA_CHANGES_SUMMARY.md** - Database schema changes

---

**Status:** ✅ Implemented  
**Version:** 1.0  
**Last Updated:** October 25, 2025

