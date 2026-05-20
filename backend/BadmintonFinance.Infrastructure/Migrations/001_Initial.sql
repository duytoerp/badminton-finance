-- ============================================================
-- Badminton Finance — Initial schema (SQL Server)
-- Generated equivalent of EF Core "InitialCreate" migration.
-- Run once. After this, future migrations are managed by EF.
-- ============================================================
IF DB_ID('BadmintonFinanceDb') IS NULL CREATE DATABASE BadmintonFinanceDb;
GO
USE BadmintonFinanceDb;
GO

CREATE TABLE [Role] (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE [User] (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserName NVARCHAR(80) NOT NULL UNIQUE,
    Email NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(500) NOT NULL,
    FullName NVARCHAR(150) NOT NULL,
    PhoneNumber NVARCHAR(30) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    LastLoginAt DATETIME2 NULL,
    RefreshToken NVARCHAR(500) NULL,
    RefreshTokenExpiry DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE [UserRole] (
    UserId UNIQUEIDENTIFIER NOT NULL,
    RoleId UNIQUEIDENTIFIER NOT NULL,
    AssignedAt DATETIME2 NOT NULL,
    PRIMARY KEY (UserId, RoleId),
    FOREIGN KEY (UserId) REFERENCES [User](Id),
    FOREIGN KEY (RoleId) REFERENCES [Role](Id)
);

CREATE TABLE BadmintonPlayer (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    FullName NVARCHAR(150) NOT NULL,
    NickName NVARCHAR(80) NULL,
    PhoneNumber NVARCHAR(30) NULL,
    Email NVARCHAR(150) NULL,
    PlayerType INT NOT NULL DEFAULT 1,
    IsActive BIT NOT NULL DEFAULT 1,
    CurrentDebt DECIMAL(18,2) NOT NULL DEFAULT 0,
    Note NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_BadmintonPlayer_PhoneNumber ON BadmintonPlayer(PhoneNumber);

CREATE TABLE BadmintonCourt (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    Address NVARCHAR(500) NULL,
    ContactPerson NVARCHAR(150) NULL,
    ContactPhone NVARCHAR(30) NULL,
    DefaultHourlyRate DECIMAL(18,2) NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    Note NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE BadmintonSession (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    CourtId UNIQUEIDENTIFIER NOT NULL,
    PlayDate DATETIME2 NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    CourtCount INT NOT NULL DEFAULT 1,
    Status INT NOT NULL DEFAULT 0,
    ClosedAt DATETIME2 NULL,
    ClosedBy UNIQUEIDENTIFIER NULL,
    ReopenReason NVARCHAR(500) NULL,
    ReopenCount INT NOT NULL DEFAULT 0,
    TotalIncome DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalExpense DECIMAL(18,2) NOT NULL DEFAULT 0,
    Balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    FeePerSlot DECIMAL(18,2) NOT NULL DEFAULT 0,
    TotalSlots INT NOT NULL DEFAULT 0,
    Note NVARCHAR(1000) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_BadmintonSession_Court FOREIGN KEY (CourtId) REFERENCES BadmintonCourt(Id)
);
CREATE INDEX IX_BadmintonSession_PlayDate_Status ON BadmintonSession(PlayDate, Status);

CREATE TABLE BadmintonSessionParticipant (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    SessionId UNIQUEIDENTIFIER NOT NULL,
    PlayerId UNIQUEIDENTIFIER NOT NULL,
    SlotCount INT NOT NULL DEFAULT 1,
    AmountDue DECIMAL(18,2) NOT NULL DEFAULT 0,
    AmountPaid DECIMAL(18,2) NOT NULL DEFAULT 0,
    PaymentStatus INT NOT NULL DEFAULT 0,
    IsGuest BIT NOT NULL DEFAULT 0,
    Note NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Participant_Session FOREIGN KEY (SessionId) REFERENCES BadmintonSession(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Participant_Player  FOREIGN KEY (PlayerId)  REFERENCES BadmintonPlayer(Id)
);
CREATE UNIQUE INDEX UQ_Participant_Session_Player ON BadmintonSessionParticipant(SessionId, PlayerId);

CREATE TABLE BadmintonTransaction (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    SessionId UNIQUEIDENTIFIER NULL,
    PlayerId UNIQUEIDENTIFIER NULL,
    TransactionType INT NOT NULL,
    PaymentMethod INT NOT NULL DEFAULT 0,
    Amount DECIMAL(18,2) NOT NULL,
    Description NVARCHAR(500) NULL,
    TransactionDate DATETIME2 NOT NULL,
    ReferenceCode NVARCHAR(100) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Tx_Session FOREIGN KEY (SessionId) REFERENCES BadmintonSession(Id) ON DELETE SET NULL,
    CONSTRAINT FK_Tx_Player  FOREIGN KEY (PlayerId)  REFERENCES BadmintonPlayer(Id)  ON DELETE SET NULL
);
CREATE INDEX IX_Tx_Session_Type ON BadmintonTransaction(SessionId, TransactionType);

CREATE TABLE BadmintonFund (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    CurrentBalance DECIMAL(18,2) NOT NULL DEFAULT 0,
    Description NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE BadmintonFundTransaction (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    FundId UNIQUEIDENTIFIER NOT NULL,
    SessionId UNIQUEIDENTIFIER NULL,
    FundTransactionType INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    BalanceBefore DECIMAL(18,2) NOT NULL,
    BalanceAfter DECIMAL(18,2) NOT NULL,
    Description NVARCHAR(500) NULL,
    TransactionDate DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_FundTx_Fund FOREIGN KEY (FundId) REFERENCES BadmintonFund(Id),
    CONSTRAINT FK_FundTx_Session FOREIGN KEY (SessionId) REFERENCES BadmintonSession(Id) ON DELETE SET NULL
);

CREATE TABLE SystemConfiguration (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ConfigKey NVARCHAR(100) NOT NULL UNIQUE,
    ConfigValue NVARCHAR(2000) NULL,
    Description NVARCHAR(500) NULL,
    DataType NVARCHAR(50) NOT NULL DEFAULT 'string',
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

CREATE TABLE AuditLog (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    EntityName NVARCHAR(100) NOT NULL,
    EntityId NVARCHAR(100) NOT NULL,
    Action NVARCHAR(50) NOT NULL,
    OldValue NVARCHAR(MAX) NULL,
    NewValue NVARCHAR(MAX) NULL,
    Reason NVARCHAR(500) NULL,
    UserId UNIQUEIDENTIFIER NULL,
    UserName NVARCHAR(80) NULL,
    IpAddress NVARCHAR(45) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL,
    CreatedBy UNIQUEIDENTIFIER NULL,
    UpdatedBy UNIQUEIDENTIFIER NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_AuditLog_Entity ON AuditLog(EntityName, EntityId);

-- Seed default roles + admin user (password: Admin@123)
INSERT INTO [Role] (Id, Name, Description, CreatedAt) VALUES
  (NEWID(), N'Admin', N'Quản trị', SYSUTCDATETIME()),
  (NEWID(), N'Treasurer', N'Thủ quỹ', SYSUTCDATETIME()),
  (NEWID(), N'User', N'Người chơi', SYSUTCDATETIME());

INSERT INTO BadmintonFund (Id, Name, CurrentBalance, IsActive, CreatedAt)
VALUES (NEWID(), N'Quỹ chung', 0, 1, SYSUTCDATETIME());
GO
