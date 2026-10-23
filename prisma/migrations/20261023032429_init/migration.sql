-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `locale` VARCHAR(8) NOT NULL DEFAULT 'zh',
    `theme` VARCHAR(16) NOT NULL DEFAULT 'light',
    `city` VARCHAR(80) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `aiBaseUrl` VARCHAR(255) NULL,
    `aiApiKey` TEXT NULL,
    `aiVisionModel` VARCHAR(120) NULL,
    `aiTextModel` VARCHAR(120) NULL,
    `washThreshold` INTEGER NOT NULL DEFAULT 3,
    `ntfyUrl` VARCHAR(255) NULL,
    `emailNotify` BOOLEAN NOT NULL DEFAULT false,
    `activeProfileId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(40) NOT NULL,
    `relation` VARCHAR(24) NOT NULL DEFAULT 'self',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Profile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Item` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `category` VARCHAR(24) NOT NULL,
    `colors` JSON NOT NULL,
    `seasons` JSON NOT NULL,
    `tags` JSON NOT NULL,
    `notes` TEXT NULL,
    `searchText` VARCHAR(500) NOT NULL DEFAULT '',
    `imagePath` VARCHAR(255) NULL,
    `washStatus` VARCHAR(16) NOT NULL DEFAULT 'clean',
    `wearsSinceWash` INTEGER NOT NULL DEFAULT 0,
    `wearCount` INTEGER NOT NULL DEFAULT 0,
    `lastWornAt` DATE NULL,
    `favorite` BOOLEAN NOT NULL DEFAULT false,
    `aiSummary` TEXT NULL,
    `aiConfidence` INTEGER NULL,
    `aiRaw` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Item_userId_profileId_idx`(`userId`, `profileId`),
    INDEX `Item_userId_category_idx`(`userId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Outfit` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `occasion` VARCHAR(24) NULL,
    `notes` TEXT NULL,
    `tip` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Outfit_userId_profileId_idx`(`userId`, `profileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutfitItem` (
    `id` VARCHAR(191) NOT NULL,
    `outfitId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(24) NOT NULL,

    INDEX `OutfitItem_itemId_idx`(`itemId`),
    UNIQUE INDEX `OutfitItem_outfitId_itemId_key`(`outfitId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WearLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `outfitId` VARCHAR(191) NULL,
    `groupId` VARCHAR(64) NOT NULL,
    `wornOn` DATE NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WearLog_userId_profileId_wornOn_idx`(`userId`, `profileId`, `wornOn`),
    INDEX `WearLog_itemId_idx`(`itemId`),
    INDEX `WearLog_groupId_idx`(`groupId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuggestionLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `profileId` VARCHAR(191) NOT NULL,
    `occasion` VARCHAR(24) NOT NULL,
    `weather` JSON NULL,
    `name` VARCHAR(120) NOT NULL,
    `reasons` JSON NOT NULL,
    `tip` TEXT NULL,
    `itemIds` JSON NOT NULL,
    `signature` VARCHAR(512) NOT NULL,
    `verdict` VARCHAR(16) NULL,
    `outfitId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SuggestionLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_read_createdAt_idx`(`userId`, `read`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Item` ADD CONSTRAINT `Item_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Outfit` ADD CONSTRAINT `Outfit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Outfit` ADD CONSTRAINT `Outfit_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutfitItem` ADD CONSTRAINT `OutfitItem_outfitId_fkey` FOREIGN KEY (`outfitId`) REFERENCES `Outfit`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutfitItem` ADD CONSTRAINT `OutfitItem_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WearLog` ADD CONSTRAINT `WearLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WearLog` ADD CONSTRAINT `WearLog_profileId_fkey` FOREIGN KEY (`profileId`) REFERENCES `Profile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WearLog` ADD CONSTRAINT `WearLog_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `Item`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WearLog` ADD CONSTRAINT `WearLog_outfitId_fkey` FOREIGN KEY (`outfitId`) REFERENCES `Outfit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuggestionLog` ADD CONSTRAINT `SuggestionLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
