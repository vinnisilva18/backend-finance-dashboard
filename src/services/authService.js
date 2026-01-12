const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const authService = {
    registerUser: async (userData) => {
        try {
            // Check if user exists
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Create user
            const user = new User(userData);
            await user.save();

            // Generate token
            const token = generateToken(user._id, user.email);

            return {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    currency: user.currency
                },
                token
            };

        } catch (error) {
            logger.error('Auth Service - Register error:', error);
            throw error;
        }
    },

    loginUser: async (email, password) => {
        try {
            // Find user with password
            const user = await User.findOne({ email }).select('+password');
            if (!user) {
                throw new Error('Invalid credentials');
            }

            // Check password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            user.lastLogin = new Date();
            await user.save();

            // Generate token
            const token = generateToken(user._id, user.email);

            return {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    currency: user.currency,
                    profilePicture: user.profilePicture,
                    monthlyBudget: user.monthlyBudget
                },
                token
            };

        } catch (error) {
            logger.error('Auth Service - Login error:', error);
            throw error;
        }
    },

    getUserProfile: async (userId) => {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            logger.error('Auth Service - Get profile error:', error);
            throw error;
        }
    },

    updateUserProfile: async (userId, updateData) => {
        try {
            const user = await User.findByIdAndUpdate(
                userId,
                updateData,
                { new: true, runValidators: true }
            );
            
            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            logger.error('Auth Service - Update profile error:', error);
            throw error;
        }
    },

    changePassword: async (userId, currentPassword, newPassword) => {
        try {
            const user = await User.findById(userId).select('+password');
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            user.password = newPassword;
            await user.save();

            return true;
        } catch (error) {
            logger.error('Auth Service - Change password error:', error);
            throw error;
        }
    }
};

module.exports = authService;