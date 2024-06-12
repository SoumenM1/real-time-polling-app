// models/Poll.js
const mongoose = require('mongoose');

const PollSchema = new mongoose.Schema({
  optionA: { type: Number, default: 0 },
  optionB: { type: Number, default: 0 },
  votedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const Poll = mongoose.model('Poll', PollSchema);
module.exports = Poll;
