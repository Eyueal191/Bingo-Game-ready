class UserService {
  constructor(UserModel) {
    this.User = UserModel;
  }

  async getUserById(userId) {
    return this.User.findById(userId);
  }

  async updateUserWallet(userId, amount) {
    return this.User.findByIdAndUpdate(userId, { $set: { wallet: amount } }, { new: true });
  }

  // Add more methods as needed for authentication, referral, etc.
}

module.exports = UserService; 