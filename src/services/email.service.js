const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        // Configure email transporter
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: process.env.EMAIL_PORT || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@financedashboard.com';
    }

    // Send welcome email
    async sendWelcomeEmail(user) {
        try {
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: 'Welcome to Finance Dashboard! 🎉',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4ECDC4;">Welcome to Finance Dashboard!</h1>
                        <p>Hi ${user.name},</p>
                        <p>Thank you for joining Finance Dashboard! We're excited to help you take control of your finances.</p>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333;">Getting Started:</h3>
                            <ul>
                                <li>👉 Add your first transaction</li>
                                <li>👉 Set up your budget categories</li>
                                <li>👉 Create financial goals</li>
                                <li>👉 Connect your credit cards (optional)</li>
                            </ul>
                        </div>
                        
                        <p>If you have any questions, feel free to reply to this email.</p>
                        
                        <p>Best regards,<br>The Finance Dashboard Team</p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            This email was sent to ${user.email}.<br>
                            You're receiving this email because you signed up for Finance Dashboard.
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Welcome email sent to: ${user.email}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending welcome email:', error);
            throw error;
        }
    }

    // Send password reset email
    async sendPasswordResetEmail(user, resetToken) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: 'Password Reset Request 🔐',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4ECDC4;">Password Reset</h1>
                        <p>Hi ${user.name},</p>
                        <p>You requested to reset your password for your Finance Dashboard account.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" 
                               style="background-color: #4ECDC4; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Reset Your Password
                            </a>
                        </div>
                        
                        <p style="color: #666;">
                            Or copy and paste this link in your browser:<br>
                            <code style="background-color: #f5f5f5; padding: 5px; border-radius: 3px;">
                                ${resetUrl}
                            </code>
                        </p>
                        
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        
                        <p>If you didn't request a password reset, please ignore this email.</p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            This email was sent to ${user.email}.<br>
                            For security reasons, please do not forward this email.
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Password reset email sent to: ${user.email}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending password reset email:', error);
            throw error;
        }
    }

    // Send budget alert email
    async sendBudgetAlertEmail(user, category, spent, budget) {
        try {
            const percentage = (spent / budget) * 100;
            let subject, message;
            
            if (percentage >= 100) {
                subject = `Budget Exceeded: ${category.name} ⚠️`;
                message = `You've exceeded your ${category.name} budget by ${Math.round(percentage - 100)}%.`;
            } else if (percentage >= 90) {
                subject = `Budget Warning: ${category.name}`;
                message = `You've used ${Math.round(percentage)}% of your ${category.name} budget.`;
            } else {
                return; // Only send for significant alerts
            }
            
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: ${percentage >= 100 ? '#FF6B6B' : '#FFD166'};">${subject}</h1>
                        <p>Hi ${user.name},</p>
                        <p>${message}</p>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333;">Budget Details:</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Budget:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${budget.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Spent:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${spent.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Utilization:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                                        <span style="color: ${percentage >= 100 ? '#FF6B6B' : percentage >= 90 ? '#FFD166' : '#4ECDC4'}">
                                            ${Math.round(percentage)}%
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        <p>Consider reviewing your spending in this category or adjusting your budget.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/categories" 
                               style="background-color: #4ECDC4; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Categories
                            </a>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            You're receiving this email because you have budget alerts enabled.<br>
                            You can disable these notifications in your account settings.
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Budget alert email sent to: ${user.email} for category: ${category.name}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending budget alert email:', error);
            throw error;
        }
    }

    // Send goal achievement email
    async sendGoalAchievementEmail(user, goal) {
        try {
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: `Goal Achieved: ${goal.name}! 🎉`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4ECDC4;">Congratulations! 🎉</h1>
                        <p>Hi ${user.name},</p>
                        <p>You've successfully achieved your financial goal:</p>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                            <h2 style="color: #333; margin: 0;">${goal.name}</h2>
                            <p style="font-size: 24px; font-weight: bold; color: #4ECDC4; margin: 10px 0;">
                                $${goal.currentAmount.toFixed(2)} / $${goal.targetAmount.toFixed(2)}
                            </p>
                            <div style="background-color: #ddd; height: 10px; border-radius: 5px; margin: 10px 0;">
                                <div style="background-color: #4ECDC4; height: 100%; width: 100%; border-radius: 5px;"></div>
                            </div>
                            <p style="color: #666;">100% Complete! ✅</p>
                        </div>
                        
                        <p>Great job staying committed to your financial goals! Consider setting a new goal to continue your financial journey.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/goals" 
                               style="background-color: #4ECDC4; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Your Goals
                            </a>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Keep up the great work! Your financial discipline is paying off.
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Goal achievement email sent to: ${user.email} for goal: ${goal.name}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending goal achievement email:', error);
            throw error;
        }
    }

    // Send monthly report email
    async sendMonthlyReportEmail(user, reportData) {
        try {
            const { month, year, income, expenses, netBalance, topCategories, goalsProgress } = reportData;
            
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: `Your ${month} ${year} Financial Report 📊`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #4ECDC4;">${month} ${year} Financial Report</h1>
                        <p>Hi ${user.name},</p>
                        <p>Here's a summary of your financial activity for ${month} ${year}:</p>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                            <h3 style="color: #333; margin-top: 0;">Monthly Summary</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Income:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #06D6A0;">
                                        $${income.toFixed(2)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Total Expenses:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #EF476F;">
                                        $${expenses.toFixed(2)}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px;"><strong>Net Balance:</strong></td>
                                    <td style="padding: 8px; font-weight: bold; color: ${netBalance >= 0 ? '#4ECDC4' : '#FF6B6B'}">
                                        $${netBalance.toFixed(2)}
                                    </td>
                                </tr>
                            </table>
                        </div>
                        
                        ${topCategories.length > 0 ? `
                        <div style="margin: 30px 0;">
                            <h3 style="color: #333;">Top Spending Categories</h3>
                            ${topCategories.map(cat => `
                                <div style="margin: 10px 0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span>${cat.name}</span>
                                        <span>$${cat.amount.toFixed(2)}</span>
                                    </div>
                                    <div style="background-color: #ddd; height: 8px; border-radius: 4px;">
                                        <div style="background-color: ${cat.color}; height: 100%; width: ${cat.percentage}%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        
                        ${goalsProgress.length > 0 ? `
                        <div style="margin: 30px 0;">
                            <h3 style="color: #333;">Goals Progress</h3>
                            ${goalsProgress.map(goal => `
                                <div style="margin: 15px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <strong>${goal.name}</strong>
                                        <span>${goal.progress}%</span>
                                    </div>
                                    <div style="background-color: #ddd; height: 8px; border-radius: 4px;">
                                        <div style="background-color: #4ECDC4; height: 100%; width: ${goal.progress}%; border-radius: 4px;"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL}/dashboard" 
                               style="background-color: #4ECDC4; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                View Detailed Dashboard
                            </a>
                        </div>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            This is an automated monthly report from Finance Dashboard.<br>
                            You can adjust report settings in your account preferences.
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Monthly report email sent to: ${user.email} for ${month} ${year}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending monthly report email:', error);
            throw error;
        }
    }

    // Send notification email
    async sendNotificationEmail(user, notification) {
        try {
            const mailOptions = {
                from: this.fromEmail,
                to: user.email,
                subject: `Notification: ${notification.title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4ECDC4;">${notification.title}</h2>
                        <p>Hi ${user.name},</p>
                        <p>${notification.message}</p>
                        
                        ${notification.data ? `
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="color: #333; margin-top: 0;">Details:</h4>
                            <pre style="background-color: white; padding: 10px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(notification.data, null, 2)}
                            </pre>
                        </div>
                        ` : ''}
                        
                        ${notification.actionUrl ? `
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${notification.actionUrl}" 
                               style="background-color: #4ECDC4; color: white; padding: 12px 24px; 
                                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Take Action
                            </a>
                        </div>
                        ` : ''}
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                        
                        <p style="color: #666; font-size: 12px;">
                            You're receiving this email because you have email notifications enabled.<br>
                            <a href="${process.env.FRONTEND_URL}/profile">Update notification preferences</a>
                        </p>
                    </div>
                `
            };
            
            await this.transporter.sendMail(mailOptions);
            logger.info(`Notification email sent to: ${user.email} - ${notification.title}`);
            
            return true;
        } catch (error) {
            logger.error('Error sending notification email:', error);
            throw error;
        }
    }

    // Test email configuration
    async testEmailConfig() {
        try {
            const testMailOptions = {
                from: this.fromEmail,
                to: process.env.EMAIL_TEST_RECIPIENT || this.fromEmail,
                subject: 'Finance Dashboard - Email Configuration Test',
                text: 'If you received this email, your email configuration is working correctly!'
            };
            
            await this.transporter.sendMail(testMailOptions);
            logger.info('Email configuration test successful');
            
            return true;
        } catch (error) {
            logger.error('Email configuration test failed:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();