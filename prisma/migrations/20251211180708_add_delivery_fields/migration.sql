-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('HOME', 'PICKUP_POINT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "shippingCity" TEXT,
ADD COLUMN     "shippingPostalCode" TEXT;
