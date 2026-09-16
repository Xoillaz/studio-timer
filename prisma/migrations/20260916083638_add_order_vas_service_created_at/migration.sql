-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_order_vas_services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "vas_service_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_vas_services_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_vas_services_vas_service_id_fkey" FOREIGN KEY ("vas_service_id") REFERENCES "vas_services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_order_vas_services" ("id", "order_id", "quantity", "subtotal", "vas_service_id") SELECT "id", "order_id", "quantity", "subtotal", "vas_service_id" FROM "order_vas_services";
DROP TABLE "order_vas_services";
ALTER TABLE "new_order_vas_services" RENAME TO "order_vas_services";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
