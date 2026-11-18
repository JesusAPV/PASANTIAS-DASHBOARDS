/*
  Warnings:

  - You are about to drop the column `cuerpo` on the `comunicaciones` table. All the data in the column will be lost.
  - You are about to drop the column `fecha` on the `comunicaciones` table. All the data in the column will be lost.
  - You are about to drop the column `titulo` on the `comunicaciones` table. All the data in the column will be lost.
  - Added the required column `formato` to the `comunicaciones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tema` to the `comunicaciones` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "comunicaciones" DROP COLUMN "cuerpo",
DROP COLUMN "fecha",
DROP COLUMN "titulo",
ADD COLUMN     "formato" TEXT NOT NULL,
ADD COLUMN     "periodo" DATE,
ADD COLUMN     "tema" TEXT NOT NULL;
