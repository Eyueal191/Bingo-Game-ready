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
          backgroundColor: theme === "dark" ? "#0f1221" : "rgba(17, 110, 81, 1)",
          borderColor: state.isFocused ? "#116e51" : "#55ff77",
          boxShadow: state.isFocused
            ? "0 0 0 2px rgba(85, 255, 119, 0.5)"
            : "none",
          borderRadius: "6px",
          minHeight: "32px",
          padding: "2px",
          "&:hover": {
            borderColor: "#116e51",
          },
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected
            ? "#55ff77"
            : state.isFocused
            ? "#55ff77"
            : theme === "dark"
            ? "#0f1221"
            : "#ffffff",
          color: state.isSelected
            ? "#ffffff"
            : theme === "dark"
            ? "#ffffff"
            : "#0f1221",
          padding: "6px 8px",
          fontSize: "0.875rem",
          "&:hover": {
            backgroundColor: state.isSelected ? "#55ff77" : "#55ff77",
          },
        }),
        singleValue: (provided) => ({
          ...provided,
          color: theme === "dark" ? "#ffffff" : "#0f1221",
          fontSize: "0.875rem",
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: theme === "dark" ? "#0f1221" : "#ffffff",
          border: `1px solid ${theme === "dark" ? "#116e51" : "#55ff77"}`,
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
          color: theme === "dark" ? "#55ff77" : "#116e51",
          padding: "4px",
          "&:hover": {
            color: theme === "dark" ? "#55ff77" : "#116e51",
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
