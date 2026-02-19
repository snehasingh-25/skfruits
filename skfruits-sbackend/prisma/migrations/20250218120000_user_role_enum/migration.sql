-- CreateEnum (adds new type; no destructive changes)
CREATE TYPE "UserRole" AS ENUM ('customer', 'admin', 'driver');

-- AlterTable: convert existing "role" column from text to enum (existing values 'customer' and 'admin' map to enum; no data loss)
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'customer'::"UserRole";
