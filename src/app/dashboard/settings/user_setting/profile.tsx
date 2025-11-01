"use client";

import React, { useEffect, useState } from "react";
import ActionButton from "@/components/buttons/ActionButton";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { Save } from "lucide-react";

const ProfileSection = () => {
  // Personal info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [extensionName, setExtensionName] = useState("");
  const [gender, setGender] = useState("");
  const [civilStatus, setCivilStatus] = useState("");

  // Dynamic emails and contacts
  const [emails, setEmails] = useState<string[]>([""]);
  const [contacts, setContacts] = useState<string[]>([""]);

  // Address data
  const [homeAddress, setHomeAddress] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [phLocationsData, setPhLocationsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch PH Locations
  useEffect(() => {
    async function loadPhLocations() {
      try {
        setLoading(true);
        const res = await fetch("/data/ph_locations.json");
        const data = await res.json();
        setPhLocationsData(data);
        setRegions(data.map((r: any) => r.region));
      } catch (err) {
        console.error("Error loading PH locations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPhLocations();
  }, []);

  // Update provinces and cities
  useEffect(() => {
    if (region) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
      setProvinces(selectedRegion ? selectedRegion.provinces.map((p: any) => p.province) : []);
      setProvince("");
      setCity("");
      setCities([]);
    }
  }, [region, phLocationsData]);

  useEffect(() => {
    if (province && region) {
      const selectedRegion = phLocationsData.find((r: any) => r.region === region);
      const selectedProvince = selectedRegion?.provinces.find((p: any) => p.province === province);
      setCities(selectedProvince ? selectedProvince.cities : []);
      setCity("");
    }
  }, [province, region, phLocationsData]);

  // Email handlers
  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => {
    const updated = [...emails];
    updated[index] = value;
    setEmails(updated);
  };

  // Contact handlers
  const addContact = () => setContacts([...contacts, ""]);
  const removeContact = (index: number) => setContacts(contacts.filter((_, i) => i !== index));
  const updateContact = (index: number, value: string) => {
    const updated = [...contacts];
    updated[index] = value;
    setContacts(updated);
  };

  // Validation
  const validateProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!gender) newErrors.gender = "Gender is required.";
    if (!civilStatus) newErrors.civilStatus = "Civil status is required.";
    if (!homeAddress.trim()) newErrors.homeAddress = "Street / Barangay is required.";
    if (!region) newErrors.region = "Region is required.";
    if (!province) newErrors.province = "Province is required.";
    if (!city) newErrors.city = "City / Municipality is required.";

    const hasEmail = emails.some((e) => e.trim() !== "");
    const hasContact = contacts.some((c) => c.trim() !== "");
    if (!hasEmail && !hasContact)
      newErrors.emailContact = "At least one email or contact number is required.";

    return newErrors;
  };

  // Save Handler
  const handleSave = () => {
    const newErrors = validateProfile();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const profileData = {
      firstName,
      lastName,
      middleName,
      extensionName,
      gender,
      civilStatus,
      emails: emails.filter((e) => e.trim() !== ""),
      contacts: contacts.filter((c) => c.trim() !== ""),
      address: { homeAddress, region, province, city },
    };

    console.log("✅ Profile Saved Successfully!");
    console.log("Profile Data:", profileData);
    alert("Profile data has been logged to console.");
  };

  return (
    <div className="space-y-6 text-gray-900">
      {/* BASIC INFO */}
      <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
        <div className="col-span-3">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Basic Information</h3>
        </div>

        <FormInput
          label="First Name"
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: "" }));
          }}
          error={errors.firstName}
        />

        <FormInput
          label="Last Name"
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            if (errors.lastName) setErrors((prev) => ({ ...prev, lastName: "" }));
          }}
          error={errors.lastName}
        />

        <FormInput label="Middle Name" type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} error="" />

        <FormInput label="Extension Name" type="text" placeholder="Jr., Sr., etc." value={extensionName} onChange={(e) => setExtensionName(e.target.value)} error="" />

        <FormSelect
          label="Gender"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            if (errors.gender) setErrors((prev) => ({ ...prev, gender: "" }));
          }}
          options={["Male", "Female", "Other"]}
          error={errors.gender}
        />

        <FormSelect
          label="Civil Status"
          value={civilStatus}
          onChange={(e) => {
            setCivilStatus(e.target.value);
            if (errors.civilStatus) setErrors((prev) => ({ ...prev, civilStatus: "" }));
          }}
          options={["Single", "Married", "Widowed", "Divorced"]}
          error={errors.civilStatus}
        />
      </div>

      {/* EMAILS */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-md font-semibold text-gray-900 mb-3">Email Addresses</h3>
        {emails.map((email, index) => (
          <div key={index} className="flex items-center gap-3 mb-3">
            <input
              type="email"
              value={email}
              onChange={(e) => updateEmail(index, e.target.value)}
              className={`flex-1 px-4 py-2 border rounded-lg ${
                errors.emailContact ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter email address"
            />
            {emails.length > 1 && (
              <button
                onClick={() => removeEmail(index)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addEmail}
          className="px-4 py-2 bg-[#4B0B14] text-white rounded-lg hover:bg-[#4B0B14]/80"
        >
          + Add Another Email
        </button>
      </div>

      {/* CONTACTS */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-md font-semibold text-gray-900 mb-3">Contact Numbers</h3>
        {contacts.map((contact, index) => (
          <div key={index} className="flex items-center gap-3 mb-3">
            <input
              type="text"
              value={contact}
              onChange={(e) => updateContact(index, e.target.value)}
              className={`flex-1 px-4 py-2 border rounded-lg ${
                errors.emailContact ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter contact number"
            />
            {contacts.length > 1 && (
              <button
                onClick={() => removeContact(index)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addContact}
          className="px-4 py-2 bg-[#4B0B14] text-white rounded-lg hover:bg-[#4B0B14]/80"
        >
          + Add Another Contact
        </button>
        {errors.emailContact && (
          <p className="text-red-500 text-sm mt-2">{errors.emailContact}</p>
        )}
      </div>

      {/* ADDRESS */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-md font-semibold text-gray-900 mb-3">Home Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormInput
            label="Street / Barangay"
            type="text"
            value={homeAddress}
            onChange={(e) => {
              setHomeAddress(e.target.value);
              if (errors.homeAddress) setErrors((prev) => ({ ...prev, homeAddress: "" }));
            }}
            error={errors.homeAddress}
          />
          <FormSelect
            label="Region"
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              if (errors.region) setErrors((prev) => ({ ...prev, region: "" }));
            }}
            options={regions}
            error={errors.region}
          />
          <FormSelect
            label="Province"
            value={province}
            onChange={(e) => {
              setProvince(e.target.value);
              if (errors.province) setErrors((prev) => ({ ...prev, province: "" }));
            }}
            options={provinces}
            error={errors.province}
          />
          <FormSelect
            label="City / Municipality"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
            }}
            options={cities}
            error={errors.city}
          />
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="pt-6 border-t border-gray-200 flex justify-end">
        <ActionButton
          onClick={handleSave}
          label="Save Profile"
          icon={Save}
          className="bg-[#4B0B14] hover:opacity-90 transition"
        />
      </div>
    </div>
  );
};

export default ProfileSection;
