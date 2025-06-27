CREATE TABLE `ts_worktime_job_registry` (
	`day` integer NOT NULL,
	`jobRegistryId` integer NOT NULL,
	`odooJobRegistryId` integer DEFAULT NULL,
	FOREIGN KEY (`jobRegistryId`) REFERENCES `ts_worktime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_worktime_job_registry_worktime_registry_id_idx` ON `ts_worktime_job_registry` (`day`);--> statement-breakpoint
CREATE UNIQUE INDEX `ts_worktime_job_registry_pk` ON `ts_worktime_job_registry` (`jobRegistryId`,`day`);