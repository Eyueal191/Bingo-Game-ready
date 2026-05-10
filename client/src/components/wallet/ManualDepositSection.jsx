import { Box, Button, Modal } from "@mui/material";
import DepositAccountDetails from "./DepositAccountDetails";
import UploadReceipt from "./UploadReceipt";

const ManualDepositSection = ({ paymentAccounts, isUploadModalOpen, openUploadModal, closeUploadModal }) => {
  return (
    <Box>
      <DepositAccountDetails accounts={paymentAccounts} />
      <Button
        variant="contained"
        color="primary"
        onClick={openUploadModal}
        sx={{ mb: 4, py: 1.5, backgroundColor: "#1e88e5", color: "#fff" }}
      >
        Upload Receipt
      </Button>
      <Modal open={isUploadModalOpen} onClose={closeUploadModal} aria-labelledby="upload-receipt-modal">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            borderRadius: 2,
            boxShadow: 24,
            p: 4,
            width: "90%",
            maxWidth: 600,
          }}
        >
          <UploadReceipt />
        </Box>
      </Modal>
    </Box>
  );
};

export default ManualDepositSection;