-- CreateTable
CREATE TABLE "greetings" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45) NOT NULL,
    "location" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "greetings_pkey" PRIMARY KEY ("id")
);
