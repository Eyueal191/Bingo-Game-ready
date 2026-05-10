import { Box, Tabs, Tab } from "@mui/material";

const DepositTabs = ({ activeTab, availableTabs, onChange }) => {
  const tabLabels = {
    online: "Online",
    manual: "Manual",
    automatic: "Automatic",
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
      <Tabs
        value={activeTab}
        onChange={onChange}
        aria-label="deposit tabs"
        textColor="inherit"
        indicatorColor="secondary"
        sx={{
          "& .MuiTab-root": { color: "white", opacity: 1 },
          "& .Mui-selected": { color: "white", opacity: 1 },
        }}
      >
        {availableTabs.map((tab) => (
          <Tab key={tab} label={tabLabels[tab]} value={tab} />
        ))}
      </Tabs>
    </Box>
  );
};

export default DepositTabs;