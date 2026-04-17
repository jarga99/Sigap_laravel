-- SQL MIGRATION FOR SIGAP (Single File - Corrected)
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(191) UNIQUE NOT NULL,
    password VARCHAR(191) NOT NULL,
    email VARCHAR(191) UNIQUE,
    fullName VARCHAR(191) DEFAULT '-',
    role ENUM('ADMIN', 'ADMIN_EVENT', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
    image_url VARCHAR(191),
    departmentId INT,
    sessionId VARCHAR(191),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    name_en VARCHAR(191),
    icon VARCHAR(191),
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 3. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    instansi_name VARCHAR(191) NOT NULL,
    instansi_name_en VARCHAR(191),
    instansi_desc TEXT,
    instansi_desc_en TEXT,
    logo_url VARCHAR(191),
    bg_url VARCHAR(191),
    custom_domain VARCHAR(191),
    app_name VARCHAR(191) DEFAULT 'SIGAP',
    contact_address TEXT,
    contact_email VARCHAR(191),
    contact_phone VARCHAR(191),
    footer_copyright VARCHAR(191) DEFAULT '© 2026 Admin Portal',
    footer_text TEXT,
    footer_text_en TEXT,
    footer_mode VARCHAR(191) DEFAULT 'COMPLEX',
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 4. Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(191) UNIQUE NOT NULL,
    title VARCHAR(191) NOT NULL,
    description TEXT,
    status ENUM('AKTIF', 'TIDAK_AKTIF', 'ARSIP') DEFAULT 'TIDAK_AKTIF',
    bgType VARCHAR(191) DEFAULT 'color',
    bgValue VARCHAR(191) DEFAULT '#0f172a',
    profilePhoto VARCHAR(191),
    profileShape VARCHAR(191) DEFAULT 'circle',
    profileBorderStyle VARCHAR(191) DEFAULT 'none',
    profileBorderWidth INT DEFAULT 2,
    profileBgColor VARCHAR(191) DEFAULT '#ffffff',
    showProfile BOOLEAN DEFAULT TRUE,
    showCover BOOLEAN DEFAULT TRUE,
    showTitle BOOLEAN DEFAULT TRUE,
    showDescription BOOLEAN DEFAULT TRUE,
    showFooter BOOLEAN DEFAULT TRUE,
    showSystemBranding BOOLEAN DEFAULT TRUE,
    customBranding VARCHAR(191) DEFAULT 'SIGAP PROJECT',
    customPoweredBy VARCHAR(191) DEFAULT 'Advanced Event Engine',
    footerText TEXT,
    profileWidth INT DEFAULT 80,
    profileHeight INT DEFAULT 80,
    coverHeight INT DEFAULT 128,
    titleColor VARCHAR(191) DEFAULT '#ffffff',
    titleFont VARCHAR(191) DEFAULT 'Inter',
    descColor VARCHAR(191) DEFAULT '#ffffff',
    descFont VARCHAR(191) DEFAULT 'Inter',
    footerColor VARCHAR(191) DEFAULT '#ffffff',
    footerFont VARCHAR(191) DEFAULT 'Inter',
    buttonShape VARCHAR(191) DEFAULT 'rounded',
    buttonRadius INT DEFAULT 12,
    userId INT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 5. Event Items Table
CREATE TABLE IF NOT EXISTS event_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    label VARCHAR(191),
    url TEXT,
    type VARCHAR(50),
    color VARCHAR(50),
    textColor VARCHAR(50),
    iconColor VARCHAR(50),
    icon VARCHAR(191),
    `order` INT DEFAULT 0,
    layout VARCHAR(50),
    showLabel BOOLEAN DEFAULT TRUE,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 6. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(191),
    resource VARCHAR(191),
    resourceId VARCHAR(191),
    details TEXT,
    userId INT,
    departmentId INT,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 7. Feedback Table
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191),
    email VARCHAR(191),
    role VARCHAR(50),
    is_anonymous BOOLEAN DEFAULT FALSE,
    category VARCHAR(191),
    comment TEXT,
    rating INT DEFAULT 0,
    attachment_url VARCHAR(191),
    attachment_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 8. FooterLinks Table
CREATE TABLE IF NOT EXISTS footer_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(191) NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'TEXT',
    logoUrl VARCHAR(191),
    `order` INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- 9. Default Data Seeding
INSERT INTO categories (name, name_en) VALUES 
('Bagian Tata Usaha', 'Administrative Division'),
('Pelatihan dan Sertifikasi', 'Training and Certification'),
('Pengembangan dan Pemasaran', 'Development and Marketing'),
('Kejuruan TIK', 'ICT Vocational'),
('Kejuruan Tekmek', 'Mechanical Technology Vocational'),
('Kejuruan Bisman', 'Business and Management Vocational'),
('Kejuruan Elektro', 'Electronics Vocational'),
('Kejuruan Otomotif', 'Automotive Vocational'),
('Kejuruan Refrigerasi', 'Refrigeration Vocational'),
('Kejuruan Fashion Teknologi', 'Fashion Technology Vocational'),
('Kejuruan Tata Rias', 'Cosmetology Vocational'),
('Kejuruan Listrik', 'Electrical Vocational'),
('Umum', 'General');

INSERT INTO users (username, password, fullName, role, is_active) 
VALUES ('admin', '$2y$12$Zq8z4E9v4.uG.rS7w8h8O.o8z4E9v4.uG.rS7w8h8O.o8z4E9v4.uG', 'Super Admin', 'ADMIN', 1);

INSERT INTO settings (id, instansi_name, app_name) VALUES (1, 'Instansi Pemerintah', 'SIGAP');

SET FOREIGN_KEY_CHECKS = 1;
