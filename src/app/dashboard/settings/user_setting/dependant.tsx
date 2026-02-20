"use client";

import React, { useEffect, useMemo, useState } from "react";
import FormInput from "@/components/forms/FormInput";
import { Save } from "lucide-react";
import ActionButton from "@/components/buttons/ActionButton";
import { authApi, employeeApi } from "@/lib/api";

type DependentForm = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  contactInfo: string;
  relationship: string;
  relationshipSpecify: string;
  homeAddress: string;
  region: string;
  province: string;
  city: string;
};

const RELATIONSHIP_OPTIONS = ["Spouse", "Child", "Parent", "Sibling"] as const;

const DependantsSection = () => {
  const [dependents, setDependents] = useState<DependentForm[]>([]);
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
  const [dependentErrors, setDependentErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [dependentProvinces, setDependentProvinces] = useState<string[]>([]);
  const [dependentCities, setDependentCities] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  // Load PH locations & dependents
  useEffect(() => {
    async function bootstrap() {
      try {
        setLoadingData(true);
        const [locationsRes, userRes] = await Promise.all([
          fetch("/data/ph_locations.json"),
          authApi.getCurrentUser(),
        ]);
        const rawLocations = await locationsRes.json();
        const processedData = rawLocations.map((region: any) => {
          const finalProvinces = (region.provinces || []).map((prov: any) => ({
            name: prov.name,
            cities: (prov.cities || []).map((city: any) => ({
              name: city.name,
              barangays: (city.barangays || []).map((b: any) => ({ name: b.name }))
            }))
          }));

          if (region.cities && region.cities.length > 0) {
            const directCities = region.cities.map((city: any) => ({
              name: city.name,
              barangays: (city.barangays || []).map((b: any) => ({ name: b.name }))
            }));

            const dummyProvinceName = region.name === "NCR" ? "Metro Manila" : "Independent Cities";
            finalProvinces.push({ name: dummyProvinceName, cities: directCities });
          }

          return { name: region.name, provinces: finalProvinces };
        });

        setPhLocationsData(processedData);
        setRegions(processedData.map((r: any) => r.name));

        if (userRes.success && userRes.data) {
          const mapped = (userRes.data.dependents || []).map((dep: any): DependentForm => {
            const relationshipRaw = dep.relationship || "";
            const normalized = relationshipRaw
              ? relationshipRaw.charAt(0).toUpperCase() + relationshipRaw.slice(1).toLowerCase()
              : "";
            const isStandard = RELATIONSHIP_OPTIONS.includes(normalized as typeof RELATIONSHIP_OPTIONS[number]);
            return {
              id: dep.dependant_id ? String(dep.dependant_id) : `${Date.now()}-${Math.random()}`,
              firstName: dep.firstname || "",
              lastName: dep.lastname || "",
              email: dep.email || "",
              contactInfo: dep.contact_no || "",
              relationship: isStandard ? normalized : normalized ? "Other" : "",
              relationshipSpecify: isStandard ? "" : (relationshipRaw || ""),
              homeAddress: dep.home_address || dep?.address || "",
              region: dep.region_name || "",
              province: dep.province_name || "",
              city: dep.city_name || "",
            };
          });
          setDependents(mapped);
        }
      } catch (err) {
        console.error(err);
        setGeneralError("Failed to load dependents data. Please try again later.");
      } finally {
        setLoadingLocations(false);
        setLoadingData(false);
      }
    }
    bootstrap();
  }, []);

  // Update provinces & cities
  useEffect(() => {
    if (dependentRegion) {
      const regionObj = phLocationsData.find((r: any) => r.name === dependentRegion);
      setDependentProvinces(regionObj ? regionObj.provinces.map((p: any) => p.name) : []);
      setDependentProvince("");
      setDependentCity("");
      setDependentCities([]);
    }
  }, [dependentRegion, phLocationsData]);

  useEffect(() => {
    if (dependentProvince && dependentRegion) {
      const regionObj = phLocationsData.find((r: any) => r.name === dependentRegion);
      const provObj = regionObj?.provinces.find((p: any) => p.name === dependentProvince);
      setDependentCities(provObj ? provObj.cities.map((c: any) => (typeof c === 'string' ? c : c.name)) : []);
      setDependentCity("");
    }
  }, [dependentProvince, dependentRegion, phLocationsData]);

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

    // Contact number is required
    if (!contactInfo.trim()) {
      errors.contactInfo = "Contact number is required";
    } else if (!/^\+?\d{7,15}$/.test(contactInfo)) {
      errors.contactInfo = "Invalid contact number";
    }

    // Email is optional but must be a valid Gmail if provided
    if (email && !/^[\w.+-]+@gmail\.com$/i.test(email)) {
      errors.email = "Email must be a valid Gmail address";
    }

    if (!homeAddress.trim()) errors.homeAddress = "Home address is required";
    if (!region.trim()) errors.region = "Region is required";
    if (!province.trim()) errors.province = "Province is required";
    if (!city.trim()) errors.city = "City is required";

    return errors;
  };

  const formatPHContact = (value: string) => {
    // Remove all non-digit characters
    let digits = value.replace(/\D/g, "");

    // Ensure it starts with 09
    if (!digits.startsWith("09")) {
      digits = "09" + digits.replace(/^0?9?/, "");
    }

    // Limit to 11 digits
    if (digits.length > 11) digits = digits.slice(0, 11);

    // Format as 09XX XXX XXXX
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  };



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

    const newDependent: DependentForm = {
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

    setDependents(prev => [...prev, newDependent]);
    resetForm();
    setShowModal(false);
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

  const payloadDependents = useMemo(
    () =>
      dependents.map(d => ({
        firstName: d.firstName.trim(),
        lastName: d.lastName.trim(),
        relationship: d.relationship,
        relationshipSpecify: d.relationship === "Other" ? d.relationshipSpecify.trim() : "",
        email: d.email.trim(),
        contactInfo: d.contactInfo.trim(),
        homeAddress: d.homeAddress.trim(),
        region: d.region,
        province: d.province,
        city: d.city,
      })),
    [dependents]
  );

  const validateNameFormat = (value: string, setValue: (v: string) => void, maxLength: number = 50 ) => {
    if (/^[A-Za-zñÑ\s'-]*$/.test(value) && value.length <= maxLength) {
      setValue(value);
    }
  };


  const handleSave = async () => {
    if (dependents.length === 0) {
      alert("Please add at least one dependent before saving.");
      return;
    }
    setSaving(true);
    try {
      const result = await employeeApi.updateMe({ dependents: payloadDependents });
      if (result.success) {
        alert("Dependents saved successfully!");
      } else {
        alert(result.message || "Failed to save dependents");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while saving dependents");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-900 relative">
      <h3 className="text-xl font-semibold mb-6">Emergency Contacts</h3>

      {loadingData && <div className="py-8 text-center text-[#4B0B14] font-medium">Loading dependents...</div>}
      {generalError && <div className="py-4 text-center text-red-600 text-sm font-medium">{generalError}</div>}

      <div className="border-t-2 border-[#e6d2b5] pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#3b2b1c] font-semibold">Employee Dependent Information <span className="text-red-500">*</span></h3>
          <span className="text-xs text-[#6b5344]">({dependents.length} added)</span>
        </div>

        {/* Open Modal Button */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="bg-[#4b0b14] text-white px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-[#6b0b1f] transition"
          >
            Add Dependent
          </button>
        </div>

        {/* Dependents List */}
        {dependents.length > 0 && (
          <div className="space-y-3 h-[300px] overflow-y-scroll pr-2 pb-4">
            <h4 className="text-[#3b2b1c] font-semibold">Added Dependents:</h4>
            {dependents.map(d => (
              <div key={d.id} className="bg-[#f5e6d3] p-4 rounded-lg border border-[#e6d2b5]">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-[#3b2b1c]">{d.firstName} {d.lastName}</p>
                    <p className="text-xs text-[#6b5344]">
                      Relationship: {d.relationship}{d.relationshipSpecify && ` (${d.relationshipSpecify})`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDependents(prev => prev.filter(x => x.id !== d.id))}
                    className="text-red-500 hover:text-red-700 font-semibold text-sm"
                  >
                    Remove
                  </button>
                </div>
                {d.email && <p className="text-xs text-[#6b5344]">Email: {d.email}</p>}
                {d.contactInfo && <p className="text-xs text-[#6b5344]">Contact: {d.contactInfo}</p>}
                {d.homeAddress && <p className="text-xs text-[#6b5344]">Address: {d.homeAddress}</p>}
                {(d.city || d.province || d.region) && (
                  <p className="text-xs text-[#6b5344]">Location: {[d.city, d.province, d.region].filter(Boolean).join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 min-h-screen">
          <div className="bg-[#FFF2E0] p-6 rounded-lg w-full max-w-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }
              }
              className="absolute top-3 right-3 text-gray-700 font-bold text-xl cursor-pointer"
            >
              ×
            </button>

            <h3 className="text-lg font-semibold mb-4">Add Dependent</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <FormInput label="First Name:" type="text" value={dependentFirstName} onChange={(e) => validateNameFormat(e.target.value, setDependentFirstName)} placeholder="Enter first name" error={dependentErrors.firstName} />
              <FormInput label="Last Name:" type="text" value={dependentLastName} onChange={(e) => validateNameFormat(e.target.value, setDependentLastName)} placeholder="Enter last name" error={dependentErrors.lastName} />
              <FormInput label="Email:" type="email" value={dependentEmail} onChange={(e) => setDependentEmail(e.target.value)} placeholder="optional (use gmail)" error={dependentErrors.email} />
              <FormInput
                label="Contact Info:"
                type="text"
                value={dependentContactInfo}
                onChange={(e) => setDependentContactInfo(formatPHContact(e.target.value))}
                placeholder="required"
                error={dependentErrors.contactInfo}
              />


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
                  <p className="text-red-600 text-xs mt-1">{dependentErrors.relationship}</p>
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
                  <option value="">{loadingLocations ? "Loading..." : "Select Region"}</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
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
                  <option value="">{dependentRegion ? "Select Province" : "Select Region first"}</option>
                  {dependentProvinces.map(p => <option key={p} value={p}>{p}</option>)}
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
                  <option value="">{dependentProvince ? "Select City" : "Select Province first"}</option>
                  {dependentCities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {dependentErrors.city && <p className="text-red-600 text-xs mt-1">{dependentErrors.city}</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddDependent}
              className="w-full px-4 py-2 bg-[#4b0b14] text-white rounded-lg hover:bg-[#6b0b1f] transition-colors font-semibold"
            >
              Add Dependent
            </button>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 py-4 border-t border-[#e6d2b5] flex justify-end">
        <ActionButton
          onClick={handleSave}
          label={saving ? "Saving..." : "Save Dependents"}
          icon={saving ? undefined : Save}
          disabled={saving}
          className={`bg-[#4B0B14] hover:opacity-90 transition ${saving ? "opacity-75 cursor-not-allowed" : ""}`}
        />
      </div>
    </div>
  );
};

export default DependantsSection;
