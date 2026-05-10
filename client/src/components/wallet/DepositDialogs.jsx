import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export const DirectDepositSuccessDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle className="text-white bg-purple-900">Complete Transaction</DialogTitle>
    <DialogContent className="bg-purple-800 text-white">
      <p>Please check your phone and enter your payment password to complete the transaction.</p>
    </DialogContent>
    <DialogActions className="bg-purple-800">
      <Button onClick={onClose} className="text-white">Close</Button>
    </DialogActions>
  </Dialog>
);