-- CreateTable
CREATE TABLE `SavedFruitBasket` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `fruitBasketId` INTEGER NOT NULL,
    `fruitsJson` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SavedFruitBasket_userId_idx`(`userId`),
    INDEX `SavedFruitBasket_userId_updatedAt_idx`(`userId`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SavedFruitBasket` ADD CONSTRAINT `SavedFruitBasket_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavedFruitBasket` ADD CONSTRAINT `SavedFruitBasket_fruitBasketId_fkey` FOREIGN KEY (`fruitBasketId`) REFERENCES `FruitBasket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
