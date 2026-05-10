const AgentPayment = require("../models/AgentPayment");
const User = require("../models/userModels");

// Create a new payment for an agent
exports.createAgentPayment = async (req, res) => {
  const { agentId, amount, notes } = req.body;

  if (!agentId || !amount) {
    return res
      .status(400)
      .json({ message: "Agent ID and amount are required" });
  }

  try {
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
      return res.status(404).json({ message: "Agent not found" });
    }

    const newPayment = new AgentPayment({
      agent: agentId,
      amount,
      notes,
    });

    await newPayment.save();

    res
      .status(201)
      .json({ message: "Payment recorded successfully", payment: newPayment });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error recording payment", error: error.message });
  }
};

// Get all payments for a specific agent
exports.getPaymentsForAgent = async (req, res) => {
  const { agentId } = req.params;

  try {
    const payments = await AgentPayment.find({ agent: agentId }).sort({
      transactionDate: -1,
    });
    res.status(200).json({ payments });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching payments", error: error.message });
  }
};

// Get all payments for the currently logged-in agent
exports.getMyPayments = async (req, res) => {
  try {
    const agentId = req.user._id;
    const payments = await AgentPayment.find({ agent: agentId }).sort({
      transactionDate: -1,
    });
    res.status(200).json({ payments });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching payments", error: error.message });
  }
};
