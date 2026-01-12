const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

const calculateMonthlyTotal = (transactions) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
        .filter(t => new Date(t.date) >= startOfMonth && new Date(t.date) <= now)
        .reduce((total, t) => total + t.amount, 0);
};

const calculateCategorySpending = (transactions, categoryId) => {
    return transactions
        .filter(t => t.category.toString() === categoryId.toString())
        .reduce((total, t) => total + t.amount, 0);
};

const generateRandomColor = () => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
        '#EF476F', '#26547C', '#FFD166', '#06D6A0', '#073B4C'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
};

const formatDate = (date) => {
    return new Date(date).toISOString().split('T')[0];
};

module.exports = {
    formatCurrency,
    calculateMonthlyTotal,
    calculateCategorySpending,
    generateRandomColor,
    formatDate
};