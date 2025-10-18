-- Gram Panchayat Portal Database Schema
-- Database: gram_db

CREATE DATABASE IF NOT EXISTS gram_db;
USE gram_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- House Tax Table
CREATE TABLE IF NOT EXISTS house_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  property_id VARCHAR(100),
  address TEXT,
  tax_amount DECIMAL(10, 2) NOT NULL,
  payment_status ENUM('pending', 'completed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Water Tax Table
CREATE TABLE IF NOT EXISTS water_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_name VARCHAR(255) NOT NULL,
  house_number VARCHAR(100),
  mobile VARCHAR(15),
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  payment_status ENUM('pending', 'completed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Other Tax Table
CREATE TABLE IF NOT EXISTS other_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  taxpayer_name VARCHAR(255) NOT NULL,
  tax_type VARCHAR(100) NOT NULL,
  mobile VARCHAR(15),
  amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  payment_status ENUM('pending', 'completed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Electricity Bill Table
CREATE TABLE IF NOT EXISTS electricity_bill (
  id INT AUTO_INCREMENT PRIMARY KEY,
  consumer_name VARCHAR(255) NOT NULL,
  meter_number VARCHAR(100) NOT NULL,
  billing_month VARCHAR(50),
  units_consumed INT,
  amount DECIMAL(10, 2) NOT NULL,
  upi_id VARCHAR(255),
  payment_status ENUM('pending', 'completed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('active', 'archived') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Tax Amounts Tables (Admin-set amounts per user)
CREATE TABLE IF NOT EXISTS user_house_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_house_tax (user_id)
);

CREATE TABLE IF NOT EXISTS user_water_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_water_tax (user_id)
);

CREATE TABLE IF NOT EXISTS user_other_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tax_type VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_other_tax (user_id, tax_type)
);

CREATE TABLE IF NOT EXISTS user_electricity_tax (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_electricity_tax (user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_house_tax_created ON house_tax(created_at);
CREATE INDEX idx_water_tax_created ON water_tax(created_at);
CREATE INDEX idx_other_tax_created ON other_tax(created_at);
CREATE INDEX idx_electricity_created ON electricity_bill(created_at);
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_user_house_tax_user_id ON user_house_tax(user_id);
CREATE INDEX idx_user_water_tax_user_id ON user_water_tax(user_id);
CREATE INDEX idx_user_other_tax_user_id ON user_other_tax(user_id);
CREATE INDEX idx_user_electricity_tax_user_id ON user_electricity_tax(user_id);

-- Insert sample admin (password: admin123)
-- Note: Run insert-admin.js to create admin with hashed password
