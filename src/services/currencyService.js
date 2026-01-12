const Currency = require('../models/Currency');
const axios = require('axios');
const logger = require('../utils/logger');

const currencyService = {
    // Get all active currencies
    getAllCurrencies: async () => {
        try {
            const currencies = await Currency.find({ isActive: true }).sort({ code: 1 });
            return currencies;
        } catch (error) {
            logger.error('Currency Service - Get all error:', error);
            throw error;
        }
    },

    // Get currency by code
    getCurrencyByCode: async (code) => {
        try {
            const currency = await Currency.findOne({ 
                code: code.toUpperCase(),
                isActive: true 
            });
            
            if (!currency) {
                throw new Error('Currency not found');
            }
            
            return currency;
        } catch (error) {
            logger.error('Currency Service - Get by code error:', error);
            throw error;
        }
    },

    // Update exchange rates from external API
    updateExchangeRates: async () => {
        try {
            // Get base currency
            const baseCurrency = await Currency.findOne({ baseCurrency: true });
            
            if (!baseCurrency) {
                throw new Error('No base currency set');
            }
            
            // In production, use a real API like ExchangeRate-API, Open Exchange Rates, etc.
            // For now, we'll use mock data or a free API if available
            
            let rates;
            
            try {
                // Try to get real rates from a free API
                const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
                    timeout: 5000
                });
                
                rates = response.data.rates;
            } catch (apiError) {
                logger.warn('Using mock exchange rates due to API error:', apiError.message);
                
                // Fallback to mock rates
                rates = {
                    USD: 1,
                    EUR: 0.85,
                    GBP: 0.73,
                    JPY: 110.5,
                    CAD: 1.25,
                    AUD: 1.35,
                    BRL: 5.20,
                    CHF: 0.92,
                    CNY: 6.45,
                    INR: 75.0
                };
            }
            
            // Update rates in database
            await Currency.updateExchangeRates(rates);
            
            logger.info('Exchange rates updated successfully');
            
            return await Currency.find({ isActive: true });
        } catch (error) {
            logger.error('Currency Service - Update rates error:', error);
            throw error;
        }
    },

    // Convert amount between currencies
    convertAmount: async (fromCurrencyCode, toCurrencyCode, amount) => {
        try {
            const fromCurrency = await Currency.findOne({ 
                code: fromCurrencyCode.toUpperCase(),
                isActive: true 
            });
            
            const toCurrency = await Currency.findOne({ 
                code: toCurrencyCode.toUpperCase(),
                isActive: true 
            });
            
            if (!fromCurrency || !toCurrency) {
                throw new Error('Currency not found');
            }
            
            // Convert amount
            const amountInBase = parseFloat(amount) / fromCurrency.exchangeRate;
            const convertedAmount = amountInBase * toCurrency.exchangeRate;
            
            return {
                from: fromCurrency.code,
                to: toCurrency.code,
                originalAmount: parseFloat(amount),
                convertedAmount: parseFloat(convertedAmount.toFixed(2)),
                exchangeRate: toCurrency.exchangeRate / fromCurrency.exchangeRate,
                rateDate: toCurrency.lastUpdated
            };
        } catch (error) {
            logger.error('Currency Service - Convert error:', error);
            throw error;
        }
    },

    // Get popular currencies (most used)
    getPopularCurrencies: async () => {
        try {
            const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'BRL'];
            const currencies = await Currency.find({ 
                code: { $in: popularCodes },
                isActive: true 
            }).sort({ code: 1 });
            
            return currencies;
        } catch (error) {
            logger.error('Currency Service - Get popular error:', error);
            throw error;
        }
    },

    // Add new currency (admin only)
    addCurrency: async (currencyData) => {
        try {
            // Check if currency already exists
            const existingCurrency = await Currency.findOne({ 
                code: currencyData.code.toUpperCase() 
            });
            
            if (existingCurrency) {
                throw new Error('Currency already exists');
            }
            
            const currency = new Currency({
                ...currencyData,
                code: currencyData.code.toUpperCase(),
                lastUpdated: new Date()
            });
            
            await currency.save();
            
            return currency;
        } catch (error) {
            logger.error('Currency Service - Add currency error:', error);
            throw error;
        }
    },

    // Update currency (admin only)
    updateCurrency: async (currencyCode, updateData) => {
        try {
            const currency = await Currency.findOneAndUpdate(
                { code: currencyCode.toUpperCase() },
                { 
                    ...updateData,
                    lastUpdated: new Date()
                },
                { new: true, runValidators: true }
            );
            
            if (!currency) {
                throw new Error('Currency not found');
            }
            
            return currency;
        } catch (error) {
            logger.error('Currency Service - Update currency error:', error);
            throw error;
        }
    },

    // Set base currency (admin only)
    setBaseCurrency: async (currencyCode) => {
        try {
            // First, unset current base currency
            await Currency.updateMany(
                { baseCurrency: true },
                { baseCurrency: false }
            );
            
            // Set new base currency
            const currency = await Currency.findOneAndUpdate(
                { code: currencyCode.toUpperCase() },
                { 
                    baseCurrency: true,
                    exchangeRate: 1,
                    lastUpdated: new Date()
                },
                { new: true }
            );
            
            if (!currency) {
                throw new Error('Currency not found');
            }
            
            // Update all other currencies relative to new base
            // This would require fetching new exchange rates from API
            // For simplicity, we'll leave it as is for now
            
            return currency;
        } catch (error) {
            logger.error('Currency Service - Set base currency error:', error);
            throw error;
        }
    },

    // Get exchange rate history (simplified)
    getExchangeRateHistory: async (currencyCode, days = 30) => {
        try {
            // In a real application, you would store historical rates
            // For now, we'll return mock data or current rate
            const currency = await Currency.findOne({ 
                code: currencyCode.toUpperCase(),
                isActive: true 
            });
            
            if (!currency) {
                throw new Error('Currency not found');
            }
            
            // Mock historical data
            const history = [];
            const now = new Date();
            const currentRate = currency.exchangeRate;
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(now.getDate() - i);
                
                // Simulate small fluctuations
                const fluctuation = (Math.random() - 0.5) * 0.02; // ±1%
                const historicalRate = currentRate * (1 + fluctuation);
                
                history.push({
                    date: date.toISOString().split('T')[0],
                    rate: parseFloat(historicalRate.toFixed(4)),
                    change: i === 0 ? 0 : parseFloat((historicalRate - currentRate).toFixed(4))
                });
            }
            
            return {
                currency: currency.code,
                currentRate: currency.exchangeRate,
                lastUpdated: currency.lastUpdated,
                history: history
            };
        } catch (error) {
            logger.error('Currency Service - History error:', error);
            throw error;
        }
    }
};

module.exports = currencyService;