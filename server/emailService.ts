import nodemailer from 'nodemailer';
import { config } from 'dotenv';

// Load environment variables
config();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface NotificationData {
  groupName: string;
  groupDescription?: string;
  memberName?: string;
  actionType: 'group_created' | 'member_added' | 'member_removed' | 'group_deleted';
  timestamp: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
    };

    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (!this.config.user || !this.config.pass) {
      console.warn('Email credentials not configured. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service connection failed:', error);
        this.transporter = null;
      } else {
        console.log('Email service ready for sending notifications');
      }
    });
  }

  private generateEmailContent(data: NotificationData): { subject: string; html: string; text: string } {
    const formattedDate = new Date(data.timestamp).toLocaleString();
    
    switch (data.actionType) {
      case 'group_created':
        return {
          subject: `New Group Created: ${data.groupName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">🎉 New Group Created!</h2>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e293b; margin-top: 0;">${data.groupName}</h3>
                ${data.groupDescription ? `<p style="color: #64748b;">${data.groupDescription}</p>` : ''}
                <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">Created on: ${formattedDate}</p>
              </div>
              <p style="color: #64748b;">You can now start adding members to this group!</p>
            </div>
          `,
          text: `New Group Created: ${data.groupName}\n\n${data.groupDescription ? data.groupDescription + '\n\n' : ''}Created on: ${formattedDate}\n\nYou can now start adding members to this group!`
        };

      case 'member_added':
        return {
          subject: `New Member Added to ${data.groupName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">👋 New Member Added!</h2>
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #15803d; margin: 0;"><strong>${data.memberName}</strong> has been added to <strong>${data.groupName}</strong></p>
                <p style="color: #65a30d; font-size: 14px; margin-top: 10px; margin-bottom: 0;">Added on: ${formattedDate}</p>
              </div>
              <p style="color: #64748b;">The group is growing! 🚀</p>
            </div>
          `,
          text: `New Member Added to ${data.groupName}\n\n${data.memberName} has been added to ${data.groupName}\n\nAdded on: ${formattedDate}\n\nThe group is growing!`
        };

      case 'member_removed':
        return {
          subject: `Member Removed from ${data.groupName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">👋 Member Removed</h2>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #dc2626; margin: 0;"><strong>${data.memberName}</strong> has been removed from <strong>${data.groupName}</strong></p>
                <p style="color: #ef4444; font-size: 14px; margin-top: 10px; margin-bottom: 0;">Removed on: ${formattedDate}</p>
              </div>
            </div>
          `,
          text: `Member Removed from ${data.groupName}\n\n${data.memberName} has been removed from ${data.groupName}\n\nRemoved on: ${formattedDate}`
        };

      case 'group_deleted':
        return {
          subject: `Group Deleted: ${data.groupName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">🗑️ Group Deleted</h2>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #dc2626; margin: 0;">The group <strong>${data.groupName}</strong> has been deleted</p>
                <p style="color: #ef4444; font-size: 14px; margin-top: 10px; margin-bottom: 0;">Deleted on: ${formattedDate}</p>
              </div>
            </div>
          `,
          text: `Group Deleted: ${data.groupName}\n\nThe group ${data.groupName} has been deleted\n\nDeleted on: ${formattedDate}`
        };

      default:
        return {
          subject: `Group Notification: ${data.groupName}`,
          html: `<p>Group activity in ${data.groupName} on ${formattedDate}</p>`,
          text: `Group activity in ${data.groupName} on ${formattedDate}`
        };
    }
  }

  async sendNotification(to: string | string[], data: NotificationData): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not configured. Skipping notification.');
      return false;
    }

    try {
      const { subject, html, text } = this.generateEmailContent(data);
      
      const mailOptions = {
        from: this.config.from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Notification sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  async sendBulkNotification(recipients: string[], data: NotificationData): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await this.sendNotification(recipient, data);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  // Test email configuration
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      return new Promise((resolve) => {
        this.transporter!.verify((error) => {
          if (error) {
            console.error('Email connection test failed:', error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();