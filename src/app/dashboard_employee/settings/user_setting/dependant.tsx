"use client";

import React, { useEffect, useState } from "react";
import FormInput from "@/components/forms/FormInput";
import { Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";

const DependantsSection = () => {
  const [dependents, setDependents] = useState<any[]>([]);

  // Dependent form fields
  const [dependentFirstName, setDependentFirstName] = useState("");
  const [dependentLastName, setDependentLastName] = useState("");
  const [dependentEmail, setDependentEmail] = useState("");
  const [dependentContactInfo, setDependentContactInfo] = useState("");
  const [dependentRelationship, setDependentRelationship] = useState("");
  const [dependentRelationshipSpecify, setDependentRelationshipSpecify] = useState("");
  const [dependentHomeAddress, setDependentHomeAddress] = useState("");
  const [dependentRegion, setDependentRegion] = useState("");
  const [dependentProvince, setDependentProvince] = useState("");
  const [dependentCity, setDependentCity] = useState("");
  const [dependentErrors, setDependentErrors] = useState<any>({});

  // Locations
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Load PH location data
  useEffect(() => {
    async function loadPhLocations() {
      try {
        const res = await fetch("/data/ph_locations.json");
        if (!res.ok) throw new Error(`Failed to load PH locations (${res.status})`);
        const data = await res.json();
        setPhLocationsData(data);
        setRegions(data.map((r: any) => r.region));
      } catch (err) {
        console.error("Error loading PH locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    }
    loadPhLocations();
  }, []);

  // Update provinces & cities dynamically
  useEffect(() => {
    if (dependentRegion) {
      const regionObj = phLocationsData.find((r: any) => r.region === dependentRegion);
      setDependentProvinces(regionObj ? regionObj.provinces.map((p: any) => p.province) : []);
      setDependentProvince("");
      setDependentCity("");
      setDependentCities([]);
    }
  }, [dependentRegion, phLocationsData]);

  useEffect(() => {
    if (dependentProvince && dependentRegion) {
      const regionObj = phLocationsData.find((r: any) => r.region === dependentRegion);
      const provObj = regionObj?.provinces.find((p: any) => p.province === dependentProvince);
      setDependentCities(provObj ? provObj.cities : []);
      setDependentCity("");
    }
  }, [dependentProvince, dependentRegion, phLocationsData]);

  // ✅ Validation
  const validateDependent = (
    firstName: string,
    lastName: string,
    relationship: string,
    email: string,
    contactInfo: string,
    homeAddress: string,
    region: string,
    province: string,
    city: string
  ) => {
    const errors: any = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!relationship.trim()) errors.relationship = "Relationship is required";

    if (!email.trim() && !contactInfo.trim()) {
      errors.email = "Either email or contact number is required";
      errors.contactInfo = "Either email or contact number is required";
    }

    if (email && !/\S+@\S+\.\S+/.test(email)) errors.email = "Invalid email address";
    if (contactInfo && !/^\+?\d{7,15}$/.test(contactInfo)) errors.contactInfo = "Invalid contact number";

    if (!homeAddress.trim()) errors.homeAddress = "Home address is required";
    if (!region.trim()) errors.region = "Region is required";
    if (!province.trim()) errors.province = "Province is required";
    if (!city.trim()) errors.city = "City is required";

    return errors;
  };

  // ✅ Add dependent
  const handleAddDependent = () => {
    const newErrors = validateDependent(
      dependentFirstName,
      dependentLastName,
      dependentRelationship,
      dependentEmail,
      dependentContactInfo,
      dependentHomeAddress,
      dependentRegion,
      dependentProvince,
      dependentCity
    );

    if (Object.keys(newErrors).length > 0) {
      setDependentErrors(newErrors);
      return;
    }

    const newDependent = {
      id: Date.now().toString(),
      firstName: dependentFirstName,
      lastName: dependentLastName,
      email: dependentEmail,
      contactInfo: dependentContactInfo,
      relationship: dependentRelationship,
      relationshipSpecify: dependentRelationship === "Other" ? dependentRelationshipSpecify : "",
      homeAddress: dependentHomeAddress,
      region: dependentRegion,
      province: dependentProvince,
      city: dependentCity,
    };

    setDependents((prev) => [...prev, newDependent]);
    resetForm();
  };

  const resetForm = () => {
    setDependentFirstName("");
    setDependentLastName("");
    setDependentEmail("");
    setDependentContactInfo("");
    setDependentRelationship("");
    setDependentRelationshipSpecify("");
    setDependentHomeAddress("");
    setDependentRegion("");
    setDependentProvince("");
    setDependentCity("");
    setDependentErrors({});
  };

  // ✅ Handle Save (mock)
  const handleSave = () => {
    if (dependents.length === 0) {
      alert("Please add at least one dependent before saving.");
      return;
    }

    console.log("✅ Dependents Saved:", dependents);
    alert("Dependents data has been saved and logged in the console.");
  };

  return (
    <div className="space-y-6 text-gray-900 relative">
      <h3 className="text-xl font-semibold mb-6">Emergency Contacts</h3>

      <div className="border-t-2 border-[#e6d2b5] pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#3b2b1c] font-semibold">
            Employee Dependent Information <span className="text-red-500">*</span>
          </h3>
          <span className="text-xs text-[#6b5344]">
            ({dependents.length} added)
          </span>
        </div>

        {/* Add Dependent Form */}
        <div className="bg-[#FFF2E0] p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <FormInput label="First Name:" type="text" value={dependentFirstName} onChange={(e) => setDependentFirstName(e.target.value)} placeholder="Enter first name" error={dependentErrors.firstName} />
            <FormInput label="Last Name:" type="text" value={dependentLastName} onChange={(e) => setDependentLastName(e.target.value)} placeholder="Enter last name" error={dependentErrors.lastName} />
            <FormInput label="Email:" type="email" value={dependentEmail} onChange={(e) => setDependentEmail(e.target.value)} placeholder="Enter email" error={dependentErrors.email} />
            <FormInput label="Contact Info:" type="text" value={dependentContactInfo} onChange={(e) => setDependentContactInfo(e.target.value)} placeholder="Phone number" error={dependentErrors.contactInfo} />

            {/* Relationship */}
            <div>
              <label className="block mb-1 font-medium text-gray-900">Relationship:</label>
              <select
                value={dependentRelationship}
                onChange={(e) => setDependentRelationship(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Relationship</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
              {dependentErrors.relationship && (
                <p className="text-red-600 text-xs mt-1">
                  {dependentErrors.relationship}
                </p>
              )}
            </div>

            {dependentRelationship === "Other" && (
              <FormInput
                label="Specify Relationship:"
                type="text"
                value={dependentRelationshipSpecify}
                onChange={(e) => setDependentRelationshipSpecify(e.target.value)}
                placeholder="Please specify"
              />
            )}
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm py-4">
            <div className="md:col-span-2">
              <FormInput
                label="Home Address:"
                type="text"
                value={dependentHomeAddress}
                onChange={(e) => setDependentHomeAddress(e.target.value)}
                placeholder="Enter home address"
                error={dependentErrors.homeAddress}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900">Region:</label>
              <select
                value={dependentRegion}
                onChange={(e) => setDependentRegion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                disabled={loadingLocations}
              >
                <option value="">
                  {loadingLocations ? "Loading..." : "Select Region"}
                </option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {dependentErrors.region && <p className="text-red-600 text-xs mt-1">{dependentErrors.region}</p>}
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900">Province:</label>
              <select
                value={dependentProvince}
                onChange={(e) => setDependentProvince(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                disabled={!dependentRegion}
              >
                <option value="">
                  {dependentRegion ? "Select Province" : "Select Region first"}
                </option>
                {dependentProvinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {dependentErrors.province && <p className="text-red-600 text-xs mt-1">{dependentErrors.province}</p>}
            </div>

            <div>
              <label className="block mb-1 font-medium text-gray-900">City:</label>
              <select
                value={dependentCity}
                onChange={(e) => setDependentCity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                disabled={!dependentProvince}
              >
                <option value="">
                  {dependentProvince ? "Select City" : "Select Province first"}
                </option>
                {dependentCities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {dependentErrors.city && <p className="text-red-600 text-xs mt-1">{dependentErrors.city}</p>}
            </div>
          </div>

          {/* Add Button */}
          <button
            type="button"
            onClick={handleAddDependent}
            className="w-full px-4 py-2 bg-[#073532] text-white rounded-lg hover:bg-[#6b0b1f] transition-colors font-semibold"
          >
            Add Dependent
          </button>
        </div>

        {/* Dependents List (Scrollable) */}
        {dependents.length > 0 && (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
            <h4 className="text-[#3b2b1c] font-semibold">Added Dependents:</h4>
            {dependents.map((d) => (
              <div key={d.id} className="bg-[#f5e6d3] p-4 rounded-lg border border-[#e6d2b5]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-[#3b2b1c]">
                      {d.firstName} {d.lastName}
                    </p>
                    <p className="text-xs text-[#6b5344]">
                      Relationship: {d.relationship}
                      {d.relationshipSpecify && ` (${d.relationshipSpecify})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDependents((prev) => prev.filter((x) => x.id !== d.id))
                    }
                    className="text-red-500 hover:text-red-700 font-semibold text-sm"
                  >
                    Remove
                  </button>
                </div>
                {d.email && <p className="text-xs text-[#6b5344]">Email: {d.email}</p>}
                {d.contactInfo && <p className="text-xs text-[#6b5344]">Contact: {d.contactInfo}</p>}
                {d.homeAddress && <p className="text-xs text-[#6b5344]">Address: {d.homeAddress}</p>}
                {(d.city || d.province || d.region) && (
                  <p className="text-xs text-[#6b5344]">
                    Location: {[d.city, d.province, d.region].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Save Button */}
      <div className="sticky bottom-0 py-4 border-t border-[#e6d2b5] flex justify-end">
        <ActionButton
          onClick={handleSave}
          label="Save Dependents"
          icon={Save}
          className="bg-[#073532] hover:opacity-90 transition"
        />
      </div>
    </div>
  );
};

export default DependantsSection;
