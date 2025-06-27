CREATE TABLE `ts_vehicles_companies` (
	`vehicleId` integer NOT NULL,
	`companyId` integer NOT NULL,
	FOREIGN KEY (`vehicleId`) REFERENCES `ts_vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`companyId`) REFERENCES `ts_company`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_vehicles_companies_vehicleid_idx` ON `ts_vehicles_companies` (`vehicleId`);--> statement-breakpoint
CREATE INDEX `ts_vehicles_companies_companyid_idx` ON `ts_vehicles_companies` (`companyId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ts_vehicles_companies_companyid_vehicleid_idx` ON `ts_vehicles_companies` (`companyId`,`vehicleId`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ts_vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_ts_vehicles`("id", "name") SELECT "id", "name" FROM `ts_vehicles`;--> statement-breakpoint
DROP TABLE `ts_vehicles`;--> statement-breakpoint
ALTER TABLE `__new_ts_vehicles` RENAME TO `ts_vehicles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;