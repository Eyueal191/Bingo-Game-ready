import React from "react";
import Select from "react-select";

const VoiceSelect = ({
  voiceOption,
  handleVoiceChange,
  theme,
  voiceOptions,
}) => {
  return (
    <Select
      value={voiceOptions.find((option) => option.value === voiceOption)}
      onChange={handleVoiceChange}
      options={voiceOptions}
      className="w-[120px] text-xs sm:text-sm font-medium relative"
      isSearchable={false}
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
      formatOptionLabel={({ icon, label }) => (
        <div className="flex items-center space-x-1.5">
          {icon} {/* Display the icon */}
          <span className={`${theme === "dark" ? "text-white" : "text-black"}`}>
            {label}
          </span>
        </div>
      )}
      styles={{
        control: (provided, state) => ({
          ...provided,
          backgroundColor: theme === "dark" ? "#2D3748" : "#3D6580FF",
          borderColor: state.isFocused ? "#4A5568" : "#E2E8F0",
          boxShadow: state.isFocused
            ? "0 0 0 2px rgba(66, 153, 225, 0.5)"
            : "none",
          borderRadius: "6px",
          minHeight: "32px",
          padding: "2px",
          "&:hover": {
            borderColor: "#4A5568",
          },
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected
            ? "#4299E1"
            : state.isFocused
            ? "#EBF8FF"
            : theme === "dark"
            ? "#2D3748"
            : "#FFFFFF",
          color: state.isSelected
            ? "#FFFFFF"
            : theme === "dark"
            ? "#FFFFFF"
            : "#1A202C",
          padding: "6px 8px",
          fontSize: "0.875rem",
          "&:hover": {
            backgroundColor: state.isSelected ? "#4299E1" : "#EBF8FF",
          },
        }),
        singleValue: (provided) => ({
          ...provided,
          color: theme === "dark" ? "#FFFFFF" : "#1A202C",
          fontSize: "0.875rem",
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: theme === "dark" ? "#2D3748" : "#FFFFFF",
          border: `1px solid ${theme === "dark" ? "#4A5568" : "#E2E8F0"}`,
          borderRadius: "6px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          marginTop: "4px",
          position: "absolute", // Ensure it appears over other elements
          zIndex: 9999, // High z-index to overlay everything
          width: "max-content", // Ensures it doesn't shrink
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999, // Ensures it appears above all elements
        }),
        dropdownIndicator: (provided) => ({
          ...provided,
          color: theme === "dark" ? "#A0AEC0" : "#718096",
          padding: "4px",
          "&:hover": {
            color: theme === "dark" ? "#CBD5E0" : "#4A5568",
          },
        }),
        indicatorSeparator: () => ({
          display: "none",
        }),
      }}
      menuPortalTarget={document.body} // Ensures dropdown renders outside parent container
    />
  );
};

export default VoiceSelect;
