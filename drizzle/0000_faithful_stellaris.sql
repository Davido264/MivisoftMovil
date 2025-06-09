CREATE TABLE `ts_actreg` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`odooId` integer DEFAULT NULL,
	`userId` integer NOT NULL,
	`jobRegistryId` integer,
	`activityId` integer NOT NULL,
	`lastsync` integer,
	`lastmod` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`observation` text DEFAULT NULL NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `ts_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jobRegistryId`) REFERENCES `ts_jobreg`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activityId`) REFERENCES `ts_activity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ts_actreg_odooId_unique` ON `ts_actreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_actreg_odooidx` ON `ts_actreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_actreg_jobregidx` ON `ts_actreg` (`jobRegistryId`);--> statement-breakpoint
CREATE INDEX `ts_actreg_actidx` ON `ts_actreg` (`activityId`);--> statement-breakpoint
CREATE INDEX `ts_actreg_act_jobregidx` ON `ts_actreg` (`activityId`,`jobRegistryId`);--> statement-breakpoint
CREATE INDEX `ts_actreg_lastmodidx` ON `ts_actreg` (`lastmod`);--> statement-breakpoint
CREATE INDEX `ts_photos_userid` ON `ts_actreg` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ts_actreg_jobRegistryId_activityId_unique` ON `ts_actreg` (`jobRegistryId`,`activityId`);--> statement-breakpoint
CREATE TABLE `ts_jobreg` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`odooId` integer DEFAULT NULL,
	`userId` integer NOT NULL,
	`itineraryId` integer NOT NULL,
	`vehicleId` integer NOT NULL,
	`companyId` integer NOT NULL,
	`lastsync` integer,
	`lastmod` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`priority` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`startDate` integer NOT NULL,
	`endDate` integer DEFAULT NULL,
	`score` integer DEFAULT NULL,
	`observation` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `ts_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`itineraryId`) REFERENCES `ts_itinerary`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vehicleId`) REFERENCES `ts_vehicles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`companyId`) REFERENCES `ts_company`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ts_jobreg_odooId_unique` ON `ts_jobreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_jobreg_server_idx` ON `ts_jobreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_jobreg_company_idx` ON `ts_jobreg` (`companyId`);--> statement-breakpoint
CREATE INDEX `ts_jobreg_vehicle_idx` ON `ts_jobreg` (`vehicleId`);--> statement-breakpoint
CREATE INDEX `ts_jobreg_lastmod_idx` ON `ts_jobreg` (`vehicleId`);--> statement-breakpoint
CREATE INDEX `ts_jobreg_user_idx` ON `ts_jobreg` (`userId`);--> statement-breakpoint
CREATE TABLE `ts_photos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`jobRegistryId` integer DEFAULT NULL,
	`activityRegistryId` integer DEFAULT NULL,
	`worktimeRegistryId` integer DEFAULT NULL,
	`uri` text NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`odooId` text DEFAULT null,
	`isSign` integer DEFAULT false,
	`dirty` integer DEFAULT true,
	FOREIGN KEY (`userId`) REFERENCES `ts_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`jobRegistryId`) REFERENCES `ts_jobreg`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activityRegistryId`) REFERENCES `ts_actreg`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`worktimeRegistryId`) REFERENCES `ts_worktime`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_photos_job_idx` ON `ts_photos` (`jobRegistryId`);--> statement-breakpoint
CREATE INDEX `ts_photos_act_idx` ON `ts_photos` (`activityRegistryId`);--> statement-breakpoint
CREATE INDEX `ts_photos_dirty_idx` ON `ts_photos` (`dirty`);--> statement-breakpoint
CREATE INDEX `ts_photos_dirty_userid_idx` ON `ts_photos` (`dirty`,`userId`);--> statement-breakpoint
CREATE TABLE `ts_activity` (
	`id` integer PRIMARY KEY NOT NULL,
	`itineraryId` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`itineraryId`) REFERENCES `ts_itinerary`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_activity_itineraryidx` ON `ts_activity` (`itineraryId`);--> statement-breakpoint
CREATE TABLE `ts_company` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ts_itinerary` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ts_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`activityId` integer NOT NULL,
	FOREIGN KEY (`activityId`) REFERENCES `ts_activity`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_task_activity_idx` ON `ts_task` (`activityId`);--> statement-breakpoint
CREATE TABLE `ts_vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`companyId` integer NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`companyId`) REFERENCES `ts_company`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_vehicle_company_idx` ON `ts_vehicles` (`companyId`);--> statement-breakpoint
CREATE TABLE `ts_taskreg` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`odooId` integer DEFAULT NULL,
	`userId` integer NOT NULL,
	`activityRegistryId` integer NOT NULL,
	`taskId` integer NOT NULL,
	`lastsync` integer,
	`lastmod` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completedDate` integer,
	`completed` integer DEFAULT false NOT NULL,
	`observation` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `ts_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`activityRegistryId`) REFERENCES `ts_actreg`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`taskId`) REFERENCES `ts_task`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ts_taskreg_odooId_unique` ON `ts_taskreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_taskreg_serveridx` ON `ts_taskreg` (`odooId`);--> statement-breakpoint
CREATE INDEX `ts_taskreg_jobregidx` ON `ts_taskreg` (`activityRegistryId`);--> statement-breakpoint
CREATE INDEX `ts_taskreg_taskidx` ON `ts_taskreg` (`taskId`);--> statement-breakpoint
CREATE INDEX `ts_taskreg_userid` ON `ts_taskreg` (`userId`);--> statement-breakpoint
CREATE TABLE `ts_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`tz` text,
	`company` text,
	`sid` text
);
--> statement-breakpoint
CREATE TABLE `ts_worktime` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` integer NOT NULL,
	`serial` integer NOT NULL,
	`odooId` integer,
	`userId` integer NOT NULL,
	`lastsync` integer,
	`lastmod` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`startDate` integer NOT NULL,
	`startLat` real NOT NULL,
	`startLng` real NOT NULL,
	`endDate` integer,
	`endLat` real,
	`endLng` real,
	`observation` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `ts_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ts_worktime_refidx` ON `ts_worktime` (`day`,`serial`);--> statement-breakpoint
CREATE INDEX `ts_worktime_userid_idx` ON `ts_worktime` (`userId`);