const BingoCard = require('../models/bingoCardModel'); // Adjust the path to your BingoCard model
const Reservation = require('../models/reservationModel');
const logger = require('../utils/winstonLogger');
// Create multiple Bingo cards in bulk
exports.createBulkBingoCards = async (req, res) => {
  try {
    const cardsData = req.body; // Assuming req.body is an array of objects

    if (!Array.isArray(cardsData)) {
      return res.status(400).json({ message: "Invalid data format. Expected an array of cards." });
    }

    const savePromises = cardsData.map(async (card) => {
      const existingCard = await BingoCard.findOne({ cardId: card.cardId });
      if (existingCard) {
        return { error: `Duplicate cardId: ${card.cardId}`, cardId: card.cardId };
      } else {
        const bingoCard = new BingoCard(card);
        return bingoCard.save();
      }
    });

    const savedCards = await Promise.all(savePromises);

    // Filter out errors and successfully saved cards
    const successfulSaves = savedCards.filter(card => !(card.error));
    const duplicates = savedCards.filter(card => card.error);

    res.status(201).json({
      message: "Bingo cards processed",
      savedCards: successfulSaves,
      duplicates
    });
  } catch (err) {
    logger.error('bingoCardsController: error creating bingo cards (bulk)', { err });
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Get all bingo cards
exports.getAllBingoCards = async (req, res) => {
  try {
    const { roomId } = req.params; // Accept roomId as a parameter or use query if you prefer
    // Fetch all bingo cards
    const cards = await BingoCard.find();
    // Fetch reservations filtered by the provided roomId
    const reservations = await Reservation.find({ roomId });
    // Map over each card to determine if it is reserved in the specified room
    const cardsWithStatus = cards.map(card => {
      // Check if any reservation contains this cardId and has the given roomId
      const isReserved = reservations.some(reservation =>
        reservation.cardIds.includes(card.cardId)
      );
      // Return the card with the additional 'isReserved' status
      return {
        ...card.toObject(),
        isReserved,  // True if the card is reserved in the given room, false otherwise
      };
    });
    // Send the response with cards and their reservation status
    return res.status(200).json(cardsWithStatus);
  } catch (error) {
    logger.error('bingoCardsController: error fetching bingo cards', { err: error });
    return res.status(500).json({ message: "Error fetching bingo cards", error });
  }
};

// Get a bingo card by cardId (using the custom cardId field)
exports.getBingoCardByCardId = async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await BingoCard.findOne({ cardId });
    if (!card) {
      return res.status(404).json({ message: "Bingo card not found" });
    }
    return res.status(200).json(card);
  } catch (error) {
    logger.error('bingoCardsController: error fetching bingo card', { err: error });
    return res.status(500).json({ message: "Error fetching bingo card", error });
  }
};

// Update a bingo card by cardId field
exports.updateBingoCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const updatedCard = await BingoCard.findOneAndUpdate({ cardId }, req.body, { new: true });
    if (!updatedCard) {
      return res.status(404).json({ message: "Bingo card not found" });
    }
    return res.status(200).json(updatedCard);
  } catch (error) {
    logger.error('bingoCardsController: error updating bingo card', { err: error });
    return res.status(500).json({ message: "Error updating bingo card", error });
  }
};
// controllers/bingoCardsController.js

exports.getCardsData = async (req, res) => {
  try {
    const { cardIds } = req.body;

    // Validate that cardIds exists and is an array
    if (!cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ message: "Invalid request. 'cardIds' must be provided as an array." });
    }

    // Query the database for all bingo cards with a cardId in the provided array
    const cards = await BingoCard.find({ cardId: { $in: cardIds } });

    // Return the card data in the response
    return res.status(200).json({ cards });
  } catch (error) {
    logger.error('bingoCardsController: error fetching bingo cards data', { err: error });
    return res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Delete a bingo card by cardId fieldconst BingoCard = require('../models/BingoCard'); // Adjust the path as necessary

exports.deleteAllBingoCards = async (req, res) => {
  try {
    const result = await BingoCard.deleteMany({}); // Deletes all documents in the collection
    return res.status(200).json({
      message: `${result.deletedCount} bingo cards deleted successfully`,
    });
  } catch (error) {
    logger.error('bingoCardsController: error deleting bingo cards', { err: error });
    return res.status(500).json({ message: 'Error deleting bingo cards', error });
  }
};

// Return number of bingo cards in DB
exports.getCardsCount = async (req, res) => {
  try {
    const count = await BingoCard.countDocuments();
    return res.status(200).json({ count });
  } catch (error) {
    logger.error('bingoCardsController: error counting bingo cards', { err: error });
    return res.status(500).json({ message: 'Error counting bingo cards', error });
  }
};

// Insert cards from local bundled files (100Cards or allCards)
exports.insertCardsFromFile = async (req, res) => {
  try {
    // Accept count via query or body (default 200)
    const count = parseInt(req.query.count || req.body.count, 10) || 200;
    const override = req.body.override === true || req.query.override === 'true';

    // Choose data file based on requested count
    let bingoCardsData;
    if (count === 100) {
      bingoCardsData = require('../data/100Cards');
    }  else if (count === 200) {
      bingoCardsData = require('../data/200Cards');
    }
    else if (count === 300) {
      bingoCardsData = require('../data/300Cards');
    }
    else if (count === 400) {
      bingoCardsData = require('../data/400Cards');
    }
    else{
      return res.status(400).json({ message: 'Invalid count specified. Supported counts are 100, 200, 300, or 400.' });
    }

    if (!bingoCardsData || !Array.isArray(bingoCardsData.cards)) {
      return res.status(400).json({ message: 'Data file is missing or invalid. Expected an object with a "cards" array.' });
    }

    // Prepare cards (strip _id and __v if present)
    const cardsToInsert = bingoCardsData.cards.map(card => {
      const { _id, __v, ...cardData } = card;
      return cardData;
    });

    if (!cardsToInsert.length) {
      logger.warn('bingoCardsController: no cards found in data file to insert');
      return res.status(400).json({ message: 'No cards found to insert.' });
    }

    // Optional override: delete existing cards first
    if (override) {
      const del = await BingoCard.deleteMany({});
      logger.info('bingoCardsController: override enabled, deleted existing bingo cards', {
        deletedCount: del.deletedCount,
      });
    }

    // Insert in bulk; ordered:false so duplicates don't stop the batch
    try {
      const result = await BingoCard.insertMany(cardsToInsert, { ordered: false });
      const insertedCount = Array.isArray(result) ? result.length : 0;
      logger.info('bingoCardsController: inserted cards from file', {
        insertedCount,
        countRequested: count,
      });
      return res.status(200).json({ message: `Inserted ${insertedCount} cards.`, insertedCount });
    } catch (bulkErr) {
      // Handle partial success / duplicate key bulk write errors
      logger.error('bingoCardsController: bulk insert error', { err: bulkErr });
      let insertedCount = 0;
      // Mongoose may expose insertedDocs when partial success occurred
      if (bulkErr && Array.isArray(bulkErr.insertedDocs)) {
        insertedCount = bulkErr.insertedDocs.length;
      }
      // Older Mongo driver errors may have result.result.nInserted
      if (!insertedCount && bulkErr && bulkErr.result && bulkErr.result.result && typeof bulkErr.result.result.nInserted === 'number') {
        insertedCount = bulkErr.result.result.nInserted;
      }
      // As a last resort, if error contains writeErrors only (all duplicates), insertedCount stays 0
      return res.status(200).json({
        message: `Inserted ${insertedCount} cards. Partial/duplicate errors occurred. See server logs for details.`,
        insertedCount,
        error: bulkErr.message,
      });
    }
  } catch (error) {
    logger.error('bingoCardsController: error inserting cards from file', { err: error });
    return res.status(500).json({ message: 'Error inserting cards', error: error.message });
  }
};