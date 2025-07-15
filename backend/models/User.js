const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    fullname: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    birthDate: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
        },
            resetPasswordCode: String,
    resetPasswordExpires: Date,
    resetPasswordAttempts: {
      type: Number,
      default: 0
    },
    emailConfirmed: {
      type: Boolean,
      default: false
    },
    activationToken: String,
    activationExpires: Date
  },
  {
    timestamps: true // otomatik createdAt & updatedAt
  }
);

module.exports = mongoose.model('User', UserSchema);
