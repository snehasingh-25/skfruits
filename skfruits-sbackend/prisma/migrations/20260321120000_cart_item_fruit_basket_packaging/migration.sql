-- AlterTable
ALTER TABLE `CartItem` ADD COLUMN `lineKind` VARCHAR(32) NOT NULL DEFAULT 'product',
    ADD COLUMN `packagingPrice` DOUBLE NULL,
    ADD COLUMN `packagingTitle` VARCHAR(255) NULL,
    ADD COLUMN `fruitBasketId` INTEGER NULL;
